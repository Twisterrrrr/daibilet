#!/usr/bin/env python3
"""Propose controlled event subtypes from the production EventID inventory.

This is an offline editorial aid. It does not write to the database and never
changes the existing catalog category. See docs/event-subtype-taxonomy.md.
"""

import csv
import re
import sys
from pathlib import Path


RULES = [
    ("WATER_TRIP", 8, r"теплоход|речн\w* прогул|прогул\w*.{0,25}(?:рек|канал|вод\w*)|катер|яхт\w*|водн\w* экскур"),
    ("BUS_EXCURSION", 8, r"автобусн\w* экскур|автобусн\w* тур|тур\w*.{0,20}автобус"),
    ("QUEST", 8, r"\bквест\b|квест-экскурс|городск\w* квест"),
    ("STANDUP", 9, r"стендап|stand[ -]?up|открыт\w* микрофон|комедийн\w* шоу|юмористическ\w* концерт"),
    ("CIRCUS", 9, r"цирк|шапито|цирков\w* шоу|акробатическ\w* шоу"),
    ("THEATRE", 8, r"спектакл\w*|театр\w*|балет\w*|опера\b|мюзикл\w*|драматическ\w* постанов"),
    ("CINEMA", 8, r"кинопоказ|показ фильм|кинотеатр|кинозал|просмотр фильм"),
    ("EXHIBITION", 8, r"выставк\w*|экспозиц\w*|вернисаж|арт-галере"),
    ("MASTERCLASS", 9, r"мастер[ -]?класс|воркшоп|практикум|обучающ\w* занят|урок\w* по |интенсив\w*"),
    ("SPORT", 8, r"матч\w*|турнир\w*|соревнован\w*|чемпионат\w*|футбол\w*|хоккей\w*|баскетбол\w*|теннис\w*|забег\w*"),
    ("FESTIVAL", 8, r"фестивал\w*|\bfest\b|опен[ -]?эйр|open[ -]?air"),
    ("PARTY", 7, r"вечеринк\w*|дискотек\w*|клубн\w* ночь|ночн\w* клуб|новогодн\w* ночь"),
    ("CHILDREN_FAMILY", 6, r"дет\w*|семейн\w*|ёлк\w*|елк\w*|для малыш\w*|новогодн\w* шоу"),
    ("MUSEUM_VISIT", 8, r"музей\w*|планетар\w*|океанариум\w*|зоопарк\w*|зоотеатр\w*"),
    ("EXCURSION", 7, r"экскурс\w*|обзорн\w* прогул|прогул\w*.{0,20}(?:город|по улиц)|тур\w* по город"),
    ("CONCERT", 7, r"концерт\w*|симфони\w*|оркестр\w*|джаз\w*|рок\w*|фортепиан\w*|пианино|трибьют|музыкальн\w* вечер|жив\w* музык"),
    ("SHOW", 5, r"шоу\b|иммерсивн\w*|иллюзион\w*|цирков\w* представл"),
]

COMPILED = [(name, weight, re.compile(pattern, re.IGNORECASE)) for name, weight, pattern in RULES]


def classify(row):
    title = row.get("title", "") or ""
    category = row.get("category", "") or ""
    subcategory = row.get("subcategory", "") or ""
    haystack = f"{title} {category} {subcategory}"
    scores = []
    for name, weight, pattern in COMPILED:
        if pattern.search(haystack):
            scores.append((name, weight + (2 if pattern.search(title) else 0)))
    scores.sort(key=lambda item: (-item[1], item[0]))

    primary = scores[0][0] if scores else "UNRESOLVED"
    alternatives = [name for name, score in scores[1:] if score >= scores[0][1] - 2] if scores else []
    if not scores:
        confidence = "REVIEW"
        reason = "no subtype signal in title/category"
    elif alternatives:
        confidence = "REVIEW"
        reason = "multiple competing subtype signals"
    elif scores[0][1] >= 9:
        confidence = "HIGH"
        reason = "specific title phrase"
    else:
        confidence = "MEDIUM"
        reason = "single broad title/category signal"

    # Broad source taxonomy is useful fallback evidence, not a fine subtype.
    if primary == "UNRESOLVED":
        if category == "Экскурсии":
            primary, reason = "EXCURSION_REVIEW", "broad source category only"
        elif category == "Музеи и арт":
            primary, reason = "MUSEUM_ART_REVIEW", "broad source category only"
        elif category in ("Мероприятия", "Развлечения"):
            primary, reason = "OTHER_EVENT_REVIEW", "broad source category only"
        confidence = "REVIEW"

    return primary, confidence, ";".join([primary] + alternatives), reason


def main():
    if len(sys.argv) != 3:
        raise SystemExit("usage: classify-event-subtypes.py INPUT.csv OUTPUT.csv")
    source, target = map(Path, sys.argv[1:])
    counts = {}
    rows_seen = 0
    with source.open(encoding="utf-8-sig", newline="") as f_in, target.open("w", encoding="utf-8-sig", newline="") as f_out:
        reader = csv.DictReader(f_in)
        fields = ["event_id", "title", "event_kind", "event_status", "city", "venue", "category", "subcategory", "future_sellable_session_count", "active_offer_count", "proposed_subtype", "confidence", "subtype_candidates", "reason"]
        writer = csv.DictWriter(f_out, fieldnames=fields)
        writer.writeheader()
        for row in reader:
            snapshot_date = (row.get("snapshot_date") or "2026-11-04")[:10]
            open_date_valid_to = (row.get("open_date_valid_to") or "").strip()
            open_date_live = row.get("event_kind") == "OPEN_DATE" and (not open_date_valid_to or open_date_valid_to[:10] >= snapshot_date)
            if row.get("event_status") != "READY" or (int(row.get("future_sellable_session_count") or 0) <= 0 and not open_date_live) or int(row.get("active_offer_count") or 0) <= 0:
                continue
            primary, confidence, candidates, reason = classify(row)
            out = {key: row.get(key, "") for key in fields[:10]}
            out.update(proposed_subtype=primary, confidence=confidence, subtype_candidates=candidates, reason=reason)
            writer.writerow(out)
            key = (primary, confidence)
            counts[key] = counts.get(key, 0) + 1
            rows_seen += 1
    print(f"classified={rows_seen} output={target}")
    for (subtype, confidence), count in sorted(counts.items(), key=lambda item: (-item[1], item[0])):
        print(f"{subtype}\t{confidence}\t{count}")


if __name__ == "__main__":
    main()
