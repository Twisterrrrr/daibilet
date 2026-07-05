from PIL import Image
import json
import os

cities_dir = os.path.join(os.path.dirname(__file__), '../apps/public/public/images/cities')
results = {}

for name in sorted(os.listdir(cities_dir)):
    if not name.lower().endswith('.png'):
        continue
    slug = name[:-4]
    path = os.path.join(cities_dir, name)
    img = Image.open(path).convert('RGB')
    w, h = img.size
    target_w = 480
    target_h = max(1, int(h * target_w / w))
    img = img.resize((target_w, target_h), Image.Resampling.LANCZOS)
    px = img.load()

    row_scores = []
    for y in range(target_h):
        bright = 0.0
        count = 0
        for x in range(target_w):
            r, g, b = px[x, y]
            lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
            if lum > 18:
                bright += lum
                count += 1
        row_scores.append(bright / max(count, 1) if count else 0)

    total = sum(row_scores) or 1
    weighted_y = sum(i * row_scores[i] for i in range(target_h)) / total
    focus_y = weighted_y / max(target_h - 1, 1) * 100

    bottom = sum(row_scores[int(target_h * 0.75) :]) / max(len(row_scores[int(target_h * 0.75) :]), 1)
    top = sum(row_scores[: int(target_h * 0.5)]) / max(len(row_scores[: int(target_h * 0.5)]), 1)
    if bottom < top * 0.55:
        focus_y *= 0.82

    focus_y = max(22, min(68, round(focus_y)))

    col_scores = [0.0] * target_w
    for y in range(target_h):
        for x in range(target_w):
            r, g, b = px[x, y]
            lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
            if lum > 18:
                col_scores[x] += lum
    total_x = sum(col_scores) or 1
    weighted_x = sum(i * col_scores[i] for i in range(target_w)) / total_x
    focus_x = weighted_x / max(target_w - 1, 1) * 100
    focus_x = max(35, min(65, round(focus_x)))

    if abs(focus_x - 50) < 4:
        results[slug] = f'center {focus_y}%'
    else:
        results[slug] = f'{focus_x}% {focus_y}%'

print(json.dumps(results, ensure_ascii=False, indent=2))
