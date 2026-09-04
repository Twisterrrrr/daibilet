"""
Fast-loading venue covers: catalog thumbs ~640px + hero cap ~1200px.

`/images/*` bypasses `/_next/image` on MSK (nginx alias). Card grids must
not fetch 2-4MB GenerateImage originals. Writes sibling `-thumb.jpg` and
recompresses oversized originals in place.

  python scripts/lean-venue-catalog-images.py
"""
from __future__ import annotations

import json
import shutil
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_VENUES = ROOT / "apps/public/public/images/venues"
WEB_VENUES = ROOT / "apps/web/public/images/venues"

THUMB_WIDTH = 640
HERO_WIDTH = 1200
THUMB_QUALITY = 70
HERO_QUALITY = 76
LEAN_BYTES = 80 * 1024
HERO_SKIP_BYTES = 250 * 1024
CONCURRENCY = 4


def walk_jpgs(directory: Path) -> list[Path]:
    if not directory.is_dir():
        return []
    files: list[Path] = []
    for path in directory.rglob("*"):
        if not path.is_file():
            continue
        name = path.name.lower()
        if not name.endswith((".jpg", ".jpeg")):
            continue
        if name.endswith("-thumb.jpg") or name.endswith("-thumb.jpeg"):
            continue
        files.append(path)
    return files


def thumb_path_for(file: Path) -> Path:
    return file.with_name(file.stem + "-thumb.jpg")


def mirror_to_web(abs_public: Path) -> None:
    if not WEB_VENUES.is_dir():
        return
    dest = WEB_VENUES / abs_public.relative_to(PUBLIC_VENUES)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(abs_public, dest)


def save_jpeg(image: Image.Image, dest: Path, quality: int) -> None:
    rgb = image.convert("RGB")
    tmp = dest.with_name(dest.name + ".tmp.jpg")
    rgb.save(
        tmp,
        format="JPEG",
        quality=quality,
        optimize=True,
        progressive=True,
        subsampling=2,
    )
    tmp.replace(dest)


def fit_width(image: Image.Image, max_width: int) -> Image.Image:
    image = ImageOps.exif_transpose(image) or image
    if image.width <= max_width:
        return image
    ratio = max_width / float(image.width)
    height = max(1, int(image.height * ratio))
    return image.resize((max_width, height), Image.Resampling.LANCZOS)


def process_file(file: Path) -> dict:
    before = file.stat().st_size
    with Image.open(file) as opened:
        image = ImageOps.exif_transpose(opened) or opened
        image.load()
        width = image.width
        already_lean = before <= LEAN_BYTES and 0 < width <= THUMB_WIDTH
        wrote_hero = False

        working = image
        if not already_lean and (width > HERO_WIDTH or before > HERO_SKIP_BYTES):
            working = fit_width(image, HERO_WIDTH)
            save_jpeg(working, file, HERO_QUALITY)
            wrote_hero = True
            mirror_to_web(file)

        thumb_file = thumb_path_for(file)
        thumb_ok = (
            thumb_file.is_file()
            and 8 * 1024 <= thumb_file.stat().st_size <= 120 * 1024
        )
        wrote_thumb = False
        if not thumb_ok:
            if already_lean:
                shutil.copy2(file, thumb_file)
            else:
                source = working if wrote_hero else image
                save_jpeg(fit_width(source, THUMB_WIDTH), thumb_file, THUMB_QUALITY)
            wrote_thumb = True
            mirror_to_web(thumb_file)

        thumb_bytes = thumb_file.stat().st_size if thumb_file.is_file() else 0
        original_after = file.stat().st_size

    return {
        "file": file.relative_to(PUBLIC_VENUES).as_posix(),
        "before": before,
        "originalAfter": original_after,
        "thumbBytes": thumb_bytes,
        "wroteHero": wrote_hero,
        "wroteThumb": wrote_thumb,
    }


def median(values: list[int]) -> int:
    if not values:
        return 0
    ordered = sorted(values)
    return ordered[len(ordered) // 2]


def main() -> None:
    files = walk_jpgs(PUBLIC_VENUES)
    if not files:
        raise SystemExit(f"No venue jpgs under {PUBLIC_VENUES}")

    before_total = sum(path.stat().st_size for path in files)
    results: list[dict] = []
    with ThreadPoolExecutor(max_workers=CONCURRENCY) as pool:
        futures = [pool.submit(process_file, path) for path in files]
        for future in as_completed(futures):
            results.append(future.result())

    original_after = sum(row["originalAfter"] for row in results)
    thumb_total = sum(row["thumbBytes"] for row in results)
    thumbs = [row["thumbBytes"] for row in results if row["thumbBytes"] > 0]
    print(
        json.dumps(
            {
                "files": len(files),
                "wroteHero": sum(1 for row in results if row["wroteHero"]),
                "wroteThumb": sum(1 for row in results if row["wroteThumb"]),
                "beforeMB": round(before_total / 1e6, 1),
                "originalAfterMB": round(original_after / 1e6, 1),
                "thumbsMB": round(thumb_total / 1e6, 1),
                "typicalBeforeKB": round(median([row["before"] for row in results]) / 1024),
                "typicalThumbKB": round(median(thumbs) / 1024),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
