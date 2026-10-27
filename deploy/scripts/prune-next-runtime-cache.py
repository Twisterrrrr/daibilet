#!/usr/bin/env python3
"""Evict old Next.js runtime cache entries without stopping the web process.

Route entries are removed as a unit (HTML/RSC/metadata/segment files). Fetch
cache items are independent JSON files. The Next cache treats a missing entry
as a cache miss and rebuilds it on demand.
"""
from __future__ import annotations

import argparse
import os
import shutil
import sys
import time
from dataclasses import dataclass
from pathlib import Path


ROUTE_SUFFIXES = (".html", ".body", ".rsc", ".meta", ".json")
PROTECTED_ROUTES = {
    "/",
    "/events",
    "/blog",
    "/places",
    "/podborki",
    "/cities",
    "/cities/moskva",
    "/cities/sankt-peterburg",
    "/cities/saint-petersburg",
}


@dataclass
class RouteEntry:
    base: Path
    size: int = 0
    last_used: float = 0
    primary: bool = False


def logical_route(base: Path, root: Path) -> str:
    relative = base.relative_to(root).as_posix()
    marker = "/$/"
    route = relative.split(marker, 1)[1] if marker in relative else ""
    for suffix in ROUTE_SUFFIXES:
        if route.endswith(suffix):
            route = route[: -len(suffix)]
            break
    route = "/" + route.lstrip("/")
    return route.rstrip("/") or "/"


def route_entries(root: Path) -> list[RouteEntry]:
    entries: dict[Path, RouteEntry] = {}
    if not root.is_dir():
        return []

    for dirpath, dirnames, filenames in os.walk(root, followlinks=False):
        dirnames[:] = [name for name in dirnames if not (Path(dirpath) / name).is_symlink()]
        parent = Path(dirpath)
        for filename in filenames:
            path = parent / filename
            try:
                info = path.stat(follow_symlinks=False)
            except OSError:
                continue
            if not path.is_file() or path.is_symlink():
                continue

            # App Router segment payloads live beside the route's primary files.
            parts = path.parts
            segment_index = next((i for i, part in enumerate(parts) if part.endswith(".segments")), None)
            if segment_index is not None:
                segment_dir = Path(*parts[: segment_index + 1])
                base = Path(str(segment_dir)[: -len(".segments")])
            else:
                suffix = next((s for s in ROUTE_SUFFIXES if filename.endswith(s)), None)
                if suffix is None:
                    continue
                base = Path(str(path)[: -len(suffix)])

            entry = entries.setdefault(base, RouteEntry(base=base))
            entry.size += info.st_size
            entry.last_used = max(entry.last_used, info.st_atime, info.st_mtime)
            if filename.endswith((".html", ".body")) and segment_index is None:
                entry.primary = True

    return [entry for entry in entries.values() if entry.primary]


def evict_route_entry(entry: RouteEntry, apply: bool) -> bool:
    removed = True
    for suffix in ROUTE_SUFFIXES:
        candidate = Path(str(entry.base) + suffix)
        try:
            if candidate.is_file() and not candidate.is_symlink():
                if apply:
                    candidate.unlink()
        except OSError as error:
            removed = False
            print(f"WARN could not remove {candidate}: {error}", file=sys.stderr)
    segments = Path(str(entry.base) + ".segments")
    try:
        if segments.is_dir() and not segments.is_symlink():
            if apply:
                shutil.rmtree(segments)
    except OSError as error:
        removed = False
        print(f"WARN could not remove {segments}: {error}", file=sys.stderr)
    return removed


def prune_routes(root: Path, limit_bytes: int, apply: bool) -> int:
    entries = route_entries(root)
    total = sum(entry.size for entry in entries)
    if total <= limit_bytes:
        print(f"route cache: {total // 1024 // 1024} MiB (limit {limit_bytes // 1024 // 1024} MiB)")
        return total

    # Keep editorial hubs warm; evict event detail pages first, then other LRU
    # entries. Atime is only an approximation on relatime mounts, so mtime is a
    # lower bound that protects newly generated entries.
    def order(entry: RouteEntry) -> tuple[int, int, float]:
        route = logical_route(entry.base, root)
        if route in PROTECTED_ROUTES:
            priority = 2
        elif route.startswith("/events/"):
            priority = 0
        else:
            priority = 1
        return (priority, int(entry.last_used * 1000), entry.size)

    evicted = 0
    evicted_bytes = 0
    sample: list[str] = []
    for entry in sorted(entries, key=order):
        if total <= limit_bytes:
            break
        route = logical_route(entry.base, root)
        if route in PROTECTED_ROUTES:
            continue
        if len(sample) < 5:
            sample.append(f"{route} ({entry.size // 1024} KiB)")
        if not evict_route_entry(entry, apply):
            continue
        total -= entry.size
        evicted_bytes += entry.size
        evicted += 1
    if evicted:
        action = "evicted" if apply else "would evict"
        print(f"{action} {evicted} route entries ({evicted_bytes // 1024 // 1024} MiB); sample: {', '.join(sample)}")
    print(f"route cache: {max(total, 0) // 1024 // 1024} MiB after pruning")
    return max(total, 0)


def prune_flat_cache(root: Path, limit_bytes: int, apply: bool) -> int:
    files: list[tuple[float, int, Path]] = []
    total = 0
    if root.is_dir():
        for dirpath, dirnames, filenames in os.walk(root, followlinks=False):
            dirnames[:] = [name for name in dirnames if not (Path(dirpath) / name).is_symlink()]
            for filename in filenames:
                path = Path(dirpath) / filename
                try:
                    info = path.stat(follow_symlinks=False)
                except OSError:
                    continue
                if not path.is_file() or path.is_symlink():
                    continue
                total += info.st_size
                files.append((max(info.st_atime, info.st_mtime), info.st_size, path))

    evicted = 0
    evicted_bytes = 0
    sample: list[str] = []
    if total > limit_bytes:
        for last_used, size, path in sorted(files):
            if total <= limit_bytes:
                break
            if apply:
                try:
                    path.unlink()
                except OSError as error:
                    print(f"WARN could not remove {path}: {error}", file=sys.stderr)
                    continue
            if len(sample) < 5:
                sample.append(f"{path.name} ({size // 1024} KiB; {time.strftime('%Y-%m-%d', time.localtime(last_used))})")
            total -= size
            evicted += 1
            evicted_bytes += size
    if evicted:
        action = "evicted" if apply else "would evict"
        print(f"{action} {evicted} fetch items ({evicted_bytes // 1024 // 1024} MiB); sample: {', '.join(sample)}")
    print(f"fetch cache: {max(total, 0) // 1024 // 1024} MiB (limit {limit_bytes // 1024 // 1024} MiB)")
    return max(total, 0)


def prune_image_cache(root: Path, limit_bytes: int, apply: bool) -> int:
    entries: list[tuple[float, int, Path]] = []
    total = 0
    if root.is_dir():
        for directory in root.iterdir():
            if directory.is_symlink() or not directory.is_dir():
                continue
            size = 0
            last_used = 0.0
            for dirpath, dirnames, filenames in os.walk(directory, followlinks=False):
                dirnames[:] = [name for name in dirnames if not (Path(dirpath) / name).is_symlink()]
                for filename in filenames:
                    path = Path(dirpath) / filename
                    try:
                        info = path.stat(follow_symlinks=False)
                    except OSError:
                        continue
                    if path.is_file() and not path.is_symlink():
                        size += info.st_size
                        last_used = max(last_used, info.st_atime, info.st_mtime)
            total += size
            entries.append((last_used, size, directory))

    evicted = 0
    evicted_bytes = 0
    sample: list[str] = []
    for last_used, size, directory in sorted(entries):
        if total <= limit_bytes:
            break
        if apply:
            try:
                shutil.rmtree(directory)
            except OSError as error:
                print(f"WARN could not remove image cache {directory}: {error}", file=sys.stderr)
                continue
        if len(sample) < 5:
            sample.append(f"{directory.name} ({size // 1024} KiB; {time.strftime('%Y-%m-%d', time.localtime(last_used))})")
        total -= size
        evicted += 1
        evicted_bytes += size
    if evicted:
        action = "evicted" if apply else "would evict"
        print(f"{action} {evicted} image variants ({evicted_bytes // 1024 // 1024} MiB); sample: {', '.join(sample)}")
    print(f"image cache: {max(total, 0) // 1024 // 1024} MiB (limit {limit_bytes // 1024 // 1024} MiB)")
    return max(total, 0)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--route-cache", type=Path, required=True)
    parser.add_argument("--fetch-cache", type=Path, required=True)
    parser.add_argument("--image-cache", type=Path, required=True)
    parser.add_argument("--route-limit-mib", type=int, default=5120)
    parser.add_argument("--fetch-limit-mib", type=int, default=1024)
    parser.add_argument("--image-limit-mib", type=int, default=1024)
    parser.add_argument("--apply", action="store_true", help="delete entries; default is dry-run")
    args = parser.parse_args()
    if args.route_limit_mib < 256 or args.fetch_limit_mib < 128 or args.image_limit_mib < 128:
        parser.error("limits are too small (minimum 256 MiB route, 128 MiB fetch/image)")
    if any(path.is_symlink() for path in (args.route_cache, args.fetch_cache, args.image_cache)):
        parser.error("cache roots must not be symlinks")

    route_limit = args.route_limit_mib * 1024 * 1024
    fetch_limit = args.fetch_limit_mib * 1024 * 1024
    image_limit = args.image_limit_mib * 1024 * 1024
    print(f"mode: {'apply' if args.apply else 'dry-run'}")
    prune_routes(args.route_cache, route_limit, args.apply)
    prune_flat_cache(args.fetch_cache, fetch_limit, args.apply)
    prune_image_cache(args.image_cache, image_limit, args.apply)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
