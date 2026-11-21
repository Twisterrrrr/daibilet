#!/usr/bin/env python3
import subprocess
import sys
import tempfile
import time
from pathlib import Path


SCRIPT = Path(__file__).with_name("prune-next-runtime-cache.py")
MIB = 1024 * 1024


def make_file(path: Path, size: int, age_days: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("wb") as handle:
        handle.truncate(size)
    old = time.time() - age_days * 86400
    path.touch()
    import os

    os.utime(path, (old, old))


def run(route_root: Path, fetch_root: Path, image_root: Path, apply: bool) -> subprocess.CompletedProcess[str]:
    args = [
        sys.executable,
        str(SCRIPT),
        "--route-cache",
        str(route_root),
        "--fetch-cache",
        str(fetch_root),
        "--image-cache",
        str(image_root),
        "--route-limit-mib",
        "256",
        "--fetch-limit-mib",
        "128",
        "--image-limit-mib",
        "128",
    ]
    if apply:
        args.append("--apply")
    return subprocess.run(args, check=True, capture_output=True, text=True)


def main() -> None:
    with tempfile.TemporaryDirectory(prefix="daibilet-cache-test-") as temp:
        root = Path(temp)
        route_root = root / "route-cache"
        fetch_root = root / "fetch-cache"
        image_root = root / "images"
        group = route_root / "APP_PAGE" / "build-hash" / "$"
        old_base = group / "events" / "old-event"
        fresh_base = group / "events" / "fresh-event"
        protected_base = group / "events"

        make_file(Path(f"{old_base}.html"), 300 * MIB, 10)
        make_file(Path(f"{old_base}.meta"), 32, 10)
        make_file(Path(f"{old_base}.rsc"), 2 * MIB, 10)
        make_file(Path(f"{old_base}.segments") / "page.segment.rsc", 4 * MIB, 10)
        make_file(Path(f"{fresh_base}.html"), 80 * MIB, 1)
        make_file(Path(f"{fresh_base}.segments") / "page.segment.rsc", 2 * MIB, 1)
        make_file(Path(f"{protected_base}.html"), 100 * MIB, 20)
        make_file(Path(f"{protected_base}.meta"), 32, 20)

        make_file(fetch_root / "old-fetch", 200 * MIB, 10)
        make_file(fetch_root / "new-fetch", 100 * MIB, 1)
        make_file(image_root / "old-image" / "variant.webp", 160 * MIB, 10)
        make_file(image_root / "new-image" / "variant.webp", 80 * MIB, 1)

        dry = run(route_root, fetch_root, image_root, apply=False)
        assert "would evict" in dry.stdout
        assert Path(f"{old_base}.html").exists(), "dry-run must not delete route files"
        assert (fetch_root / "old-fetch").exists(), "dry-run must not delete fetch files"
        assert (image_root / "old-image").exists(), "dry-run must not delete image variants"

        result = run(route_root, fetch_root, image_root, apply=True)
        assert not Path(f"{old_base}.html").exists(), "old event route should be evicted as a group"
        assert not Path(f"{old_base}.segments").exists(), "old event segments should be evicted with HTML"
        assert Path(f"{fresh_base}.html").exists(), "recent event route should remain cached"
        assert Path(f"{protected_base}.html").exists(), "curated /events hub should remain cached"
        assert not (fetch_root / "old-fetch").exists(), "old fetch entry should be evicted"
        assert (fetch_root / "new-fetch").exists(), "recent fetch entry should remain cached"
        assert not (image_root / "old-image").exists(), "old image variant should be evicted as a group"
        assert (image_root / "new-image").exists(), "recent image variant should remain cached"
        assert "mode: apply" in result.stdout
        print("next runtime cache pruning tests passed")


if __name__ == "__main__":
    main()
