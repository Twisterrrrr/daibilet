#!/usr/bin/env python3
import json
import time
import urllib.parse
import urllib.request

BASE = "https://api.daibilet.ru/api/public/venues"

with urllib.request.urlopen(f"{BASE}?limit=500&family=location") as resp:
    catalog = json.load(resp)

venues = sorted(catalog.get("venues", []), key=lambda v: (v.get("city", ""), v.get("name", "")))
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

print(f"Всего локаций в каталоге: {len(venues)}\n")

for i, item in enumerate(venues, 1):
    slug = item.get("slug") or ""
    detail = item
    try:
        with urllib.request.urlopen(f"{BASE}/{urllib.parse.quote(slug)}") as resp:
            page = json.load(resp)
            detail = page.get("venue") or item
    except Exception:
        pass

    t = labels.get(detail.get("type") or item.get("type"), "?")
    city = detail.get("city") or item.get("city") or "?"
    name = detail.get("name") or item.get("name") or ""
    address = (detail.get("address") or item.get("address") or "").strip()
    lat = detail.get("latitude")
    lng = detail.get("longitude")

    print(f"{i}. [{t}] {city} — {name}")
    print(f"   slug: {slug}")
    if address:
        print(f"   адрес: {address}")
    else:
        print("   адрес: —")
    if lat is not None and lng is not None:
        print(f"   координаты: {lat}, {lng}")
        print(f"   карта: https://yandex.ru/maps/?pt={lng},{lat}&z=17&l=map")
    else:
        print("   координаты: —")
    print()
    time.sleep(0.05)
