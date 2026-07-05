#!/usr/bin/env python3
"""Проверка: нет ли причалов среди type=venue в каталоге локаций."""
import json
import re
import sys
import urllib.request

API = sys.argv[1] if len(sys.argv) > 1 else "https://daibilet.ru/api/public/venues?limit=500"

with urllib.request.urlopen(API, timeout=30) as resp:
    data = json.load(resp)

venues = data.get("venues", [])
locations = [v for v in venues if v.get("template") == "location"]
venue_type = [v for v in locations if v.get("type") == "venue"]

WATER_CAT = re.compile(
    r"речн|теплоход|катер|яхт|водн|прогулк|круиз|развод мост|канал|фонтанк|мойк|нев\b",
    re.I,
)
PIER_NAME = re.compile(r"причал|пристан|пристань|наб\.|набереж", re.I)

print(f"locations total: {len(locations)}")
print(f"type=venue (Площадка): {len(venue_type)}")
print(f"type=pier: {sum(1 for v in locations if v.get('type') == 'pier')}")

# Fetch events per venue slug (sample from catalog sessions)
sessions_url = API.replace("/venues", "/home")
try:
    with urllib.request.urlopen(sessions_url, timeout=30) as resp:
        home = json.load(resp)
    sessions = home.get("sessions", [])
except Exception as exc:
    print("warn: could not load home sessions:", exc)
    sessions = []

by_venue = {}
for s in sessions:
    vid = s.get("venueId")
    if not vid:
        continue
    by_venue.setdefault(vid, {"count": 0, "categories": {}, "titles": []})
    by_venue[vid]["count"] += 1
    cat = s.get("category") or "?"
    by_venue[vid]["categories"][cat] = by_venue[vid]["categories"].get(cat, 0) + 1
    if len(by_venue[vid]["titles"]) < 3:
        by_venue[vid]["titles"].append(s.get("title"))

suspicious = []
for v in venue_type:
    name = v.get("name") or ""
    addr = v.get("address") or ""
    text = f"{name} {addr}"
    stats = by_venue.get(v.get("id"), {"count": 0, "categories": {}, "titles": []})
    cats = stats["categories"]
    water_cats = sum(n for c, n in cats.items() if WATER_CAT.search(c or ""))
    total_cat = sum(cats.values()) or stats["count"] or v.get("events") or 0
    water_ratio = water_cats / total_cat if total_cat else 0
    reasons = []
    if PIER_NAME.search(text):
        reasons.append("name/addr pier-like")
    if water_ratio >= 0.5 and total_cat >= 2:
        reasons.append(f"water categories {water_cats}/{total_cat}")
    if reasons:
        suspicious.append((v, reasons, cats, stats["titles"]))

print(f"\nSuspicious venue-type locations: {len(suspicious)}")
for v, reasons, cats, titles in sorted(suspicious, key=lambda x: -(x[0].get("events") or 0)):
    print(f"\n  [{', '.join(reasons)}]")
    print(f"  events={v.get('events')} | {v.get('name')}")
    print(f"  addr: {v.get('address') or '—'}")
    if cats:
        top = sorted(cats.items(), key=lambda x: -x[1])[:4]
        print(f"  categories: {', '.join(f'{c}({n})' for c,n in top)}")
    if titles:
        print(f"  sample: {'; '.join(titles[:2])}")
