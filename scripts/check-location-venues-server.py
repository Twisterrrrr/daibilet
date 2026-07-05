#!/usr/bin/env python3
import json
import re
import urllib.request

BASE = "http://127.0.0.1:4000"

venues = json.load(urllib.request.urlopen(f"{BASE}/api/public/venues?limit=500"))["venues"]
locations = [v for v in venues if v.get("template") == "location"]
venue_type = [v for v in locations if v.get("type") == "venue"]
pier_type = [v for v in locations if v.get("type") == "pier"]

PIER = re.compile(
    r"причал|пристан|пристань|сектор\s*[«\"]?[ABCDВГД]|речной\s+вокзал|наб\.|набереж",
    re.I,
)
WATER = re.compile(r"речн|теплоход|катер|прогулк|круиз|развод|водн", re.I)

home = json.load(urllib.request.urlopen(f"{BASE}/api/public/home"))
by = {}
for s in home.get("sessions", []):
    vid = s.get("venueId")
    if not vid:
        continue
    b = by.setdefault(vid, {"n": 0, "water": 0, "cats": {}, "titles": []})
    b["n"] += 1
    cat = s.get("category") or ""
    b["cats"][cat] = b["cats"].get(cat, 0) + 1
    if WATER.search(cat):
        b["water"] += 1
    if len(b["titles"]) < 2:
        b["titles"].append(s.get("title"))

mis = []
for v in venue_type:
    text = f"{v.get('name', '')} {v.get('address', '')}"
    st = by.get(v.get("id"), {"n": 0, "water": 0, "cats": {}, "titles": []})
    name_hit = bool(PIER.search(text))
    water_hit = st["n"] >= 1 and st["water"] / max(st["n"], 1) >= 0.5
    if name_hit or water_hit:
        mis.append((v, name_hit, water_hit, st))

print("LOCATIONS", len(locations), "| pier", len(pier_type), "| venue(площадка)", len(venue_type))
print("Misclassified pier-like among venue type:", len(mis))
print("---")
for v, nh, wh, st in sorted(mis, key=lambda x: -(x[0].get("events") or 0)):
    flags = []
    if nh:
        flags.append("name")
    if wh:
        flags.append("water-events")
    cats = ", ".join(f"{c}({n})" for c, n in sorted(st["cats"].items(), key=lambda x: -x[1])[:3])
    print(f"[{','.join(flags)}] ev={v.get('events')} | {v.get('name')} | {v.get('address') or '-'} | {cats}")

print("\nDUPLICATES pier+venue same address prefix:")
for v in venue_type:
    addr = (v.get("address") or "")[:40]
    if not addr:
        continue
    for p in pier_type:
        padd = p.get("address") or ""
        if addr in padd or padd[:40] in addr:
            print(f"  VENUE: {v.get('name')}  <=>  PIER: {p.get('name')}")
