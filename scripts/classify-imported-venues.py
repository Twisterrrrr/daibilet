"""Propose Places taxonomy for a Venue CSV export without changing the database.

Only direct evidence gets `high` confidence. Mixed legacy kinds stay in review.
"""
import csv
import json
import re
import sys
from collections import Counter

def propose(row):
    old = row["kind"]
    name = row["title"].casefold().replace("ё", "е")
    if old == "CONCERT_HALL":
        if re.search(r"концертн.{0,12}зал|филармони|дворец культуры|дом культуры|\bдк\b", name):
            return "THEATRE", "concert_hall", "high", "name_and_legacy_kind"
        return "VENUE", "event_venue", "medium", "mixed_legacy_concert_hall"
    if old == "PARK":
        if re.search(r"\bпарк\b|\bсад\b|дендрар|ботаническ", name):
            return "NATURE", "park", "high", "name_and_legacy_kind"
        return "NATURE", "", "medium", "subtype_review"
    if old == "MONUMENT":
        if re.search(r"памятник|монумент|мемориал|скульптур|стел[аы]|обелиск|бюст", name):
            return "MONUMENT", "monument", "high", "name_and_legacy_kind"
        return "MONUMENT", "", "medium", "subtype_review"
    if old == "TEMPLE":
        for subtype, pattern in [("mosque", r"мечет"), ("synagogue", r"синагог"),
                                 ("monastery", r"монастыр|лавра"), ("chapel", r"часовн"),
                                 ("church", r"храм|собор|церк|кирх|костел")]:
            if re.search(pattern, name): return "RELIGION", subtype, "high", "name_and_legacy_kind"
        return "RELIGION", "", "medium", "subtype_review"
    if old == "MUSEUM_ART_SPACE":
        if re.search(r"галере", name): return "MUSEUM", "gallery", "high", "name_and_legacy_kind"
        if re.search(r"музей", name): return "MUSEUM", "museum", "high", "name_and_legacy_kind"
        return "", "", "review", "museum_or_art_space"
    if old == "THEATER":
        for subtype, pattern in [("circus", r"цирк"), ("philharmonic", r"филармони"),
                                 ("cinema", r"кинотеатр"), ("theatre", r"театр|опера")]:
            if re.search(pattern, name): return "THEATRE", subtype, "high", "name_and_legacy_kind"
        return "THEATRE", "", "medium", "subtype_review"
    if old == "GASTRO":
        for subtype, pattern in [("restaurant", r"ресторан"), ("cafe", r"кафе|кофейн"),
                                 ("bar", r"\bбар\b|паб"), ("bakery", r"пекарн|кондитерск"),
                                 ("food_market", r"гастромаркет|рынок")]:
            if re.search(pattern, name): return "FOOD", subtype, "high", "name_and_legacy_kind"
        return "FOOD", "", "medium", "subtype_review"
    if re.search(r"причал|пристань", name):
        return "TRANSPORT", "pier", "medium", "name_pier"
    if re.search(r"речной вокзал", name):
        return "TRANSPORT", "river_terminal", "medium", "name_terminal"
    if re.search(r"морской вокзал|морвокзал", name):
        return "TRANSPORT", "sea_terminal", "medium", "name_terminal"
    if re.search(r"автовокзал|автостанция", name):
        return "TRANSPORT", "bus_station", "medium", "name_station"
    if re.search(r"аэропорт", name):
        return "TRANSPORT", "airport", "medium", "name_airport"
    if old in ("BUS", "MEETING_POINT", "ONLINE"):
        return "", "", "review", "service_point_or_vehicle"
    if old == "PIER":
        return "", "", "review", "legacy_pier_is_mixed"
    if old in ("ATTRACTION", "CLUB_BAR_RESTAURANT", "OUTDOOR_LOCATION", "SPORT_ACTIVITY_SPACE"):
        return "", "", "review", "mixed_legacy_kind"
    if old == "VENUE":
        return "VENUE", "event_venue", "medium", "legacy_venue"
    return "", "", "review", "unclassified"


with open(sys.argv[1], encoding="utf-8-sig", newline="") as source:
    venues = list(csv.DictReader(source))
rows = []
for venue in venues:
    kind, subtype, confidence, reason = propose(venue)
    rows.append({"id": venue["id"], "title": venue["title"], "city": venue["city"],
                 "oldKind": venue["kind"], "placeType": kind, "placeSubtype": subtype,
                 "confidence": confidence, "reason": reason})
with open(sys.argv[2], "w", encoding="utf-8-sig", newline="") as output:
    writer = csv.DictWriter(output, fieldnames=list(rows[0]))
    writer.writeheader()
    writer.writerows(rows)
print(json.dumps({"total": len(rows), "confidence": dict(Counter(row["confidence"] for row in rows)),
                  "reviews": dict(Counter(row["oldKind"] for row in rows if row["confidence"] == "review"))}, ensure_ascii=False))
