"""Read-only comparison of the editorial PDP snapshot with a Venue CSV export.

The CSV must have id,title,city,address,latitude,longitude,kind,pageStatus,
isIndexable,slug columns. Matching candidates are evidence, never automatic merges.
"""
import csv
import json
import math
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path


def normalize(value):
    return re.sub(r"[^\w]+", " ", str(value or "").casefold().replace("ё", "е")).strip()


def distance(a, b):
    try:
        lat1, lon1 = math.radians(float(a["latitude"])), math.radians(float(a["longitude"]))
        lat2, lon2 = math.radians(float(b["latitude"])), math.radians(float(b["longitude"]))
    except (TypeError, ValueError):
        return None
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return round(12742000 * math.asin(min(1, math.sqrt(h))))


def name_similarity(left, right):
    a, b = set(normalize(left).split()), set(normalize(right).split())
    return round(len(a & b) / max(len(a | b), 1), 3)


snapshot = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
with open(sys.argv[2], encoding="utf-8-sig", newline="") as source:
    venues = list(csv.DictReader(source))
by_city = defaultdict(list)
for venue in venues:
    by_city[normalize(venue["city"])].append(venue)

findings = []
used_ids = set()
for place in snapshot:
    candidates = []
    for venue in by_city[normalize(place["city"])]:
        meters = distance(place, venue)
        exact_name = normalize(place["name"]) == normalize(venue["title"])
        exact_address = bool(normalize(place["address"])) and normalize(place["address"]) == normalize(venue["address"])
        if exact_name or (meters is not None and meters <= 120) or exact_address:
            candidates.append({"id": venue["id"], "title": venue["title"], "kind": venue["kind"],
                               "pageStatus": venue["pageStatus"], "meters": meters,
                               "exactName": exact_name, "exactAddress": exact_address,
                               "nameSimilarity": name_similarity(place["name"], venue["title"])})
    candidates.sort(key=lambda item: (not item["exactName"], item["meters"] if item["meters"] is not None else 999999))
    exact = [item for item in candidates if item["exactName"]]
    if len(exact) == 1 and exact[0]["id"] not in used_ids:
        status = "exact_name_city"
        used_ids.add(exact[0]["id"])
    elif len(exact) > 1:
        status = "ambiguous_exact"
    elif candidates:
        status = "review_nearby"
    else:
        status = "no_candidate"
    findings.append({"sourceKey": place["sourceKey"], "sourceRow": place["sourceRow"],
                     "name": place["name"], "city": place["city"], "status": status,
                     "candidates": candidates[:5]})

report = {"sourceCount": len(snapshot), "venueCount": len(venues),
          "statuses": dict(Counter(item["status"] for item in findings)),
          "findings": findings}
Path(sys.argv[3]).write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({key: value for key, value in report.items() if key != "findings"}, ensure_ascii=False))
