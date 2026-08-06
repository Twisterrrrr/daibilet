#!/usr/bin/env python3
"""Generate missing 1200x630 *-og.jpg share cards from blog covers."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DIRS = [
    ROOT / "apps/web/public/images/blog",
    ROOT / "apps/public/public/images/blog",
]
SKIP_NAMES = {"blog-list-hero.jpg", "blog-hero-promo.jpg"}
TW, TH = 1200, 630


def is_cover(name: str) -> bool:
    if not name.endswith(".jpg"):
        return False
    if name in SKIP_NAMES:
        return False
    return not name.endswith(("-og.jpg", "-inline.jpg", "-inline-2.jpg"))


def make_og(cover: Path) -> Image.Image:
    im = Image.open(cover).convert("RGB")
    sw, sh = im.size
    scale = max(TW / sw, TH / sh)
    nw, nh = int(sw * scale + 0.5), int(sh * scale + 0.5)
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left = max(0, (nw - TW) // 2)
    top = max(0, (nh - TH) // 2)
    return im.crop((left, top, left + TW, top + TH))


def main() -> None:
    src_dir = DIRS[0]
    covers = sorted(p for p in src_dir.glob("*.jpg") if is_cover(p.name))
    made = 0
    mirrored = 0
    skipped = 0
    for cover in covers:
        og_name = f"{cover.stem}-og.jpg"
        og_src = src_dir / og_name
        if og_src.exists():
            skipped += 1
            data = og_src.read_bytes()
            for d in DIRS[1:]:
                dest = d / og_name
                if not dest.exists():
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    dest.write_bytes(data)
                    mirrored += 1
            continue
        im = make_og(cover)
        for d in DIRS:
            d.mkdir(parents=True, exist_ok=True)
            out = d / og_name
            im.save(out, "JPEG", quality=82, optimize=True, progressive=False)
        made += 1
        print(f"OK {og_name} ({og_src.stat().st_size} bytes)")
    print(f"done made={made} mirrored={mirrored} skipped_existing={skipped}")


if __name__ == "__main__":
    main()
