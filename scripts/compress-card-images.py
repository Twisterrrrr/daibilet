#!/usr/bin/env python3
"""Disk sidecars and listing-weight compress (no /_next/image).

  python scripts/compress-card-images.py [events|venues|blog-inline|landings|all] [--dry-run]

P0 events: sibling *-card.jpg, width 640, q 60-70, ~40-80KB. Originals untouched.
P1 blog inline: in-place max 1200px, q~75, 120-200KB.
P1b landings: PNG→JPEG ~1200px / <150KB.

MSK mass cut: always dry-run first. Do not git-add generated catalog sidecars.
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "apps/public/public/images"
WEB = ROOT / "apps/web/public/images"

CARD_WIDTH = 640
CARD_QUALITY = 65
CARD_QUALITY_MIN = 60
CARD_TARGET_MAX = 80 * 1024
LEAN_BYTES = 80 * 1024
INLINE_MAX_SIDE = 1200
INLINE_QUALITY = 75
INLINE_TARGET_MAX = 200 * 1024
LANDING_MAX_SIDE = 1200
LANDING_QUALITY = 72
LANDING_TARGET_MAX = 150 * 1024

SKIP_NAME = (
    "-card.jpg",
    "-card.jpeg",
    "-card.png",
    "-thumb.jpg",
    "-thumb.jpeg",
    "-hero.jpg",
    "-og.jpg",
    "-inline.jpg",
    "-inline-2.jpg",
)


def is_source_name(path: Path) -> bool:
    name = path.name.lower()
    if any(name.endswith(suffix) for suffix in SKIP_NAME):
        return False
    return path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}


def card_path_for(path: Path) -> Path:
    return path.with_name(path.stem + "-card.jpg")


def thumb_path_for(path: Path) -> Path:
    return path.with_name(path.stem + "-thumb.jpg")


def jpeg_path_for(path: Path) -> Path:
    if path.suffix.lower() in {".png", ".webp"}:
        return path.with_suffix(".jpg")
    return path


def walk_images(folder: Path) -> list[Path]:
    if not folder.is_dir():
        return []
    out: list[Path] = []
    for item in folder.rglob("*"):
        if item.is_file() and item.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}:
            out.append(item)
    return out


def mirror_to_web(abs_public: Path) -> None:
    if not WEB.parent.exists():
        return
    try:
        rel = abs_public.relative_to(PUBLIC)
    except ValueError:
        return
    dest = WEB / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(abs_public, dest)


def card_ok(path: Path) -> bool:
    if not path.is_file():
        return False
    size = path.stat().st_size
    return 8 * 1024 <= size <= 120 * 1024


def open_rgb(path: Path) -> Image.Image:
    im = Image.open(path)
    im = ImageOps.exif_transpose(im)
    return im.convert("RGB")


def write_jpeg(im: Image.Image, dest: Path, *, width: int | None, max_side: int | None, quality: int) -> int:
    work = im
    w, h = work.size
    if width and w > width:
        h = max(1, int(h * width / w))
        work = work.resize((width, h), Image.Resampling.LANCZOS)
        w, h = work.size
    if max_side:
        long = max(w, h)
        if long > max_side:
            scale = max_side / long
            work = work.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.Resampling.LANCZOS)
    tmp = dest.with_name(dest.name + ".tmp.jpg")
    dest.parent.mkdir(parents=True, exist_ok=True)
    work.save(tmp, "JPEG", quality=quality, optimize=True, progressive=True)
    tmp.replace(dest)
    return dest.stat().st_size


def fit_target(
    src: Path,
    dest: Path,
    *,
    width: int | None,
    max_side: int | None,
    quality: int,
    min_quality: int,
    max_bytes: int,
) -> tuple[int, int]:
    im = open_rgb(src)
    q = quality
    size = write_jpeg(im, dest, width=width, max_side=max_side, quality=q)
    while size > max_bytes and q > min_quality:
        q -= 5
        size = write_jpeg(im, dest, width=width, max_side=max_side, quality=q)
    return size, q


def rel(path: Path) -> str:
    try:
        return path.relative_to(PUBLIC).as_posix()
    except ValueError:
        return path.as_posix()


def process_card(path: Path, dry_run: bool = False) -> dict:
    before = path.stat().st_size
    dest = card_path_for(path)
    row = {"kind": "card", "file": rel(path), "before": before, "after": 0, "action": "skip-lean"}
    if before <= LEAN_BYTES:
        return row
    if card_ok(dest):
        row["after"] = dest.stat().st_size
        row["action"] = "exists"
        return row
    thumb = thumb_path_for(path)
    if card_ok(thumb) and thumb.suffix.lower() in {".jpg", ".jpeg"}:
        if dry_run:
            row["after"] = thumb.stat().st_size
            row["action"] = "would-copy-thumb"
            return row
        shutil.copyfile(thumb, dest)
        mirror_to_web(dest)
        row["after"] = dest.stat().st_size
        row["action"] = "copy-thumb"
        return row
    if dry_run:
        row["action"] = "would-write"
        return row
    size, _q = fit_target(
        path,
        dest,
        width=CARD_WIDTH,
        max_side=None,
        quality=CARD_QUALITY,
        min_quality=CARD_QUALITY_MIN,
        max_bytes=CARD_TARGET_MAX,
    )
    mirror_to_web(dest)
    row["after"] = size
    row["action"] = "wrote"
    return row


def process_inline(path: Path, dry_run: bool = False) -> dict:
    before = path.stat().st_size
    row = {"kind": "inline", "file": rel(path), "before": before, "after": before, "action": "skip-ok"}
    im = open_rgb(path)
    long = max(im.size)
    if before <= INLINE_TARGET_MAX and 0 < long <= INLINE_MAX_SIDE:
        return row
    if dry_run:
        row["after"] = 0
        row["action"] = "would-write"
        return row
    size, _q = fit_target(
        path,
        path,
        width=None,
        max_side=INLINE_MAX_SIDE,
        quality=INLINE_QUALITY,
        min_quality=68,
        max_bytes=INLINE_TARGET_MAX,
    )
    mirror_to_web(path)
    row["after"] = size
    row["action"] = "wrote"
    return row


def process_landing(path: Path, dry_run: bool = False) -> dict:
    before = path.stat().st_size
    is_png = path.suffix.lower() == ".png"
    dest = jpeg_path_for(path)
    row = {
        "kind": "landing",
        "file": rel(path),
        "dest": rel(dest),
        "before": before,
        "after": before,
        "action": "skip-ok",
    }
    if not is_png and before <= LANDING_TARGET_MAX:
        im = open_rgb(path)
        long = max(im.size)
        if 0 < long <= LANDING_MAX_SIDE:
            return row
    if dry_run:
        row["after"] = 0
        row["action"] = "would-png-to-jpg" if is_png else "would-write"
        return row
    size, _q = fit_target(
        path,
        dest,
        width=None,
        max_side=LANDING_MAX_SIDE,
        quality=LANDING_QUALITY,
        min_quality=62,
        max_bytes=LANDING_TARGET_MAX,
    )
    mirror_to_web(dest)
    if is_png and dest != path and path.exists():
        path.unlink()
        web_png = WEB / path.relative_to(PUBLIC)
        if web_png.exists():
            web_png.unlink()
    row["after"] = size
    row["action"] = "png-to-jpg" if is_png else "wrote"
    return row


def summarize(label: str, rows: list[dict]) -> dict:
    wrote = [row for row in rows if row["action"] in {"wrote", "png-to-jpg", "copy-thumb", "would-write", "would-copy-thumb", "would-png-to-jpg"}]
    before = sum(row["before"] for row in wrote)
    after = sum(row["after"] for row in wrote)
    sample = sorted(wrote, key=lambda row: row["before"], reverse=True)[:5]
    return {
        "label": label,
        "files": len(rows),
        "wrote": len(wrote),
        "skipped": len(rows) - len(wrote),
        "beforeMB": round(before / 1e6, 1),
        "afterMB": round(after / 1e6, 1),
        "sample": [
            {
                "file": row.get("dest") or row["file"],
                "beforeKB": round(row["before"] / 1024),
                "afterKB": round(row["after"] / 1024),
                "action": row["action"],
            }
            for row in sample
        ],
    }


def main() -> None:
    raw = sys.argv[1:]
    dry_run = "--dry-run" in raw
    args = [item for item in raw if not item.startswith("--")]
    mode = (args[0] if args else "events").strip().lower()
    allowed = {"events", "venues", "blog-inline", "landings", "all"}
    if mode not in allowed:
        raise SystemExit(f'Unknown mode "{mode}". Use events|venues|blog-inline|landings|all [--dry-run]')

    venues = [p for p in walk_images(PUBLIC / "venues") if is_source_name(p)]
    events = [
        p
        for p in walk_images(PUBLIC / "events")
        if is_source_name(p) and "evt-auto-" not in p.name.lower()
    ]
    inlines = [
        p
        for p in walk_images(PUBLIC / "blog")
        if p.name.lower().endswith(("-inline.jpg", "-inline.jpeg", "-inline.png", "-inline-2.jpg", "-inline-2.jpeg", "-inline-2.png"))
    ]
    landings = walk_images(PUBLIC / "landings")

    report: dict = {}
    if mode in {"events", "all"}:
        report["cards"] = summarize("events-card", [process_card(p, dry_run) for p in events])
    if mode in {"venues", "all"}:
        report["venues"] = summarize("venues-card", [process_card(p, dry_run) for p in venues])
    if mode in {"blog-inline", "all"}:
        report["blogInline"] = summarize("blog-inline", [process_inline(p, dry_run) for p in inlines])
    if mode in {"landings", "all"}:
        report["landings"] = summarize("landings", [process_landing(p, dry_run) for p in landings])
    if dry_run:
        report["dryRun"] = True
    print(json.dumps(report, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()
