# -*- coding: utf-8 -*-
"""Unique JPEG covers for Nizhny venues - not city placeholders."""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ROWS = json.loads((ROOT / "scripts/data/must-see-editorial-nizhny.json").read_text(encoding="utf-8"))
OUTS = [
    ROOT / "apps/web/public/images/venues/nizhny-novgorod",
    ROOT / "apps/public/public/images/venues/nizhny-novgorod",
]
W, H = 1600, 1200

PALETTES = [
    ((180, 83, 9), (124, 45, 18), (30, 41, 59)),
    ((3, 105, 161), (14, 116, 144), (15, 23, 42)),
    ((4, 120, 87), (17, 94, 89), (15, 23, 42)),
    ((154, 52, 18), (124, 45, 18), (30, 41, 59)),
    ((29, 78, 216), (30, 58, 138), (15, 23, 42)),
    ((190, 18, 60), (136, 19, 55), (15, 23, 42)),
    ((109, 40, 217), (49, 46, 129), (15, 23, 42)),
    ((15, 118, 110), (17, 94, 89), (15, 23, 42)),
    ((194, 65, 12), (124, 45, 18), (15, 23, 42)),
    ((51, 65, 85), (30, 41, 59), (15, 23, 42)),
]


def seed_int(s: str) -> int:
    return int(hashlib.sha1(s.encode("utf-8")).hexdigest()[:8], 16)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def make_cover(title: str, slug: str, file: str) -> Image.Image:
    n = seed_int(f"nn:{slug}:{file}")
    p0, p1, p2 = PALETTES[n % len(PALETTES)]
    img = Image.new("RGB", (W, H))
    px = img.load()
    for y in range(H):
        ty = y / (H - 1)
        for x in range(W):
            tx = x / (W - 1)
            c_ab = lerp(p0, p1, tx)
            c = lerp(c_ab, p2, ty * 0.85)
            # subtle diagonal band unique per seed
            band = ((x + y + (n % 400)) % 220) / 220.0
            boost = int(18 * (0.5 - abs(band - 0.5)) * 2)
            px[x, y] = (
                min(255, c[0] + boost),
                min(255, c[1] + boost // 2),
                min(255, c[2]),
            )
    draw = ImageDraw.Draw(img, "RGBA")
    # soft circles
    a = (n >> 8) & 255
    b = (n >> 16) & 255
    draw.ellipse(
        [200 + a, 120 + b, 900 + a, 820 + b],
        fill=(255, 255, 255, 28),
    )
    draw.ellipse(
        [700 + b, 200 + a, 1500 + b, 1000 + a],
        fill=(248, 250, 252, 22),
    )
    draw.rectangle([0, H - 220, W, H], fill=(15, 23, 42, 150))
    try:
        font = ImageFont.truetype("arial.ttf", 44)
    except Exception:
        font = ImageFont.load_default()
    label = (title or "")[:48]
    draw.text((72, H - 120), label, fill=(248, 250, 252, 255), font=font)
    return img.convert("RGB")


def main():
    for d in OUTS:
        d.mkdir(parents=True, exist_ok=True)
    wrote = 0
    for row in ROWS:
        file = row.get("coverFile")
        if not file:
            continue
        img = make_cover(row.get("title") or "", row.get("slug") or "", file)
        for d in OUTS:
            dest = d / file
            img.save(dest, "JPEG", quality=85, optimize=True)
        wrote += 1
        print("ok", file)
    print(json.dumps({"wrote": wrote, "total": len(ROWS)}))


if __name__ == "__main__":
    main()
