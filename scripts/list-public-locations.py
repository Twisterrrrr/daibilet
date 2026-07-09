#!/usr/bin/env python3
import json
import urllib.request

url = "https://api.daibilet.ru/api/public/venues?limit=500&family=location"
with urllib.request.urlopen(url) as resp:
    d = json.load(resp)

venues = sorted(d.get("venues", []), key=lambda v: (v.get("city", ""), v.get("name", "")))
labels = {
    "pier": "причал",
    "pier_water": "причал",
    "bus": "автобус",
    "outdoor_location": "открытая",
    "attraction": "достопримечательность",
    "sport_activity_space": "спорт",
    "venue": "площадка",
    "other": "другое",
}

print(f"Всего: {len(venues)}\n")
for i, v in enumerate(venues, 1):
    t = labels.get(v.get("type"), v.get("type"))
    city = v.get("city", "?")
    name = v.get("name", "")
    slug = v.get("slug", "")
    desc = (v.get("shortDescription") or "").strip()
    print(f"{i}. [{t}] {city} — {name}")
    print(f"   /locations/{slug}")
    print(f"   сейчас: {desc or '(пусто)'}")
    print()
