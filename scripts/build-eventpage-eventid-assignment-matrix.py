#!/usr/bin/env python3
"""Join the full Event inventory to product-level TC sibling decisions."""

import csv
import gzip
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

DATE_PREFIX = re.compile(r"^\s*(?:\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?|\d{1,2}\s+[а-яё]+(?:\s+\d{4})?)\s*[/|—–:-]+\s*", re.I)
DATE_ANYWHERE = re.compile(r"(?<!\d)\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?(?!\d)|(?<!\d)\d{1,2}\s+[а-яё]+(?:\s+\d{4})?(?!\w)", re.I)
WEEKDAY = re.compile(r"\(\s*(?:пн|вт|ср|чт|пт|сб|вс|понедельник|вторник|среда|четверг|пятница|суббота|воскресенье)\s*\)", re.I)
TRAILING_ID = re.compile(r"[-\s]+(?:[0-9a-f]{24}|[0-9a-f]{32})\s*$", re.I)
OWNER_MULTI_PIER_PARENT_IDS = {"67b6dc7ba69cf48036df9f14"}


def norm_title(value):
    value = DATE_PREFIX.sub("", value or "")
    value = DATE_ANYWHERE.sub(" ", value)
    value = WEEKDAY.sub(" ", value)
    value = TRAILING_ID.sub("", value)
    value = value.lower().replace("ё", "е")
    value = re.sub(r"[^\w]+", " ", value, flags=re.UNICODE)
    return re.sub(r"\s+", " ", value).strip()


def group_key(row):
    parent = (row.get("tc_parent_ids") or "").strip()
    city = (row.get("city_id") or "").strip()
    product = norm_title(row.get("title", ""))
    if "не стоит вызывать его" in product:
        product = f"OWNER_SEPARATE_OCCURRENCE:{row['event_id']}"
    if "иммерсивный мастер класс хэллоуин" in product:
        product = f"OWNER_SEPARATE_EVENT:{row['event_id']}"
    return parent, city, product


def read_csv(path):
    with Path(path).open(encoding="utf-8-sig", newline="") as f:
        yield from csv.DictReader(f)


def main():
    if len(sys.argv) != 4:
        raise SystemExit("usage: build-eventpage-eventid-assignment-matrix.py INVENTORY.csv SIBLINGS.csv OUTPUT.csv.gz")
    inventory, siblings, output = map(Path, sys.argv[1:])
    group_map = {}
    for group in read_csv(siblings):
        group_map[(group["provider_parent_id"], group["city_id"], group["product_key"])] = group

    fields = ["event_id", "title", "event_kind", "event_status", "city", "venue", "source_codes", "tc_parent_count", "tc_parent_ids", "future_sellable_session_count", "active_offer_count", "current_eventpage_slugs", "eventpage_count", "proposed_eventpage_key", "assignment_decision", "decision_basis", "confidence"]
    counts = Counter()
    ready_live = Counter()
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("wb") as raw, gzip.GzipFile(fileobj=raw, mode="wb", mtime=0) as gz:
        import io
        text = io.TextIOWrapper(gz, encoding="utf-8", newline="")
        writer = csv.DictWriter(text, fieldnames=fields)
        writer.writeheader()
        for row in read_csv(inventory):
            event_id = row["event_id"]
            kind, status = row["event_kind"], row["event_status"]
            future = int(row.get("future_sellable_session_count") or 0) > 0
            snapshot_date = (row.get("snapshot_date") or "2026-11-04")[:10]
            open_date_valid_to = (row.get("open_date_valid_to") or "").strip()
            open_date_live = kind == "OPEN_DATE" and (not open_date_valid_to or open_date_valid_to[:10] >= snapshot_date)
            has_current_availability = future or open_date_live
            offer = int(row.get("active_offer_count") or 0) > 0
            page_count = int(row.get("eventpage_count") or 0)
            linked_slug = (row.get("eventpage_slugs") or "").strip()
            parents = (row.get("tc_parent_ids") or "").strip()
            parent_count = int(row.get("tc_parent_count") or 0)
            source_codes = (row.get("source_codes") or "").split("|")
            key, decision, basis, confidence = "", "", "", ""

            if page_count == 1 and linked_slug:
                key = f"eventpage:{linked_slug}"
                decision, basis, confidence = "ALREADY_LINKED", "direct EventPageEvent relation", "HIGH"
            elif page_count > 1:
                decision, basis, confidence = "REVIEW_MULTIPLE_PAGES", "EventID is linked to multiple EventPages", "REVIEW"
            elif status != "READY":
                decision, basis, confidence = "HOLD_NOT_READY", "status is not READY; retain existing route/fallback", "REVIEW"
            elif not has_current_availability or not offer:
                decision, basis, confidence = "HOLD_NO_CURRENT_SALE", "do not restore or publish a past/non-saleable event", "MEDIUM"
            elif kind == "RECURRING" and parent_count == 1 and parents:
                group = group_map.get(group_key(row))
                if not group:
                    decision, basis, confidence = "REVIEW_GROUP_MISSING", "no product-level sibling group found", "REVIEW"
                else:
                    group_decision = group["matrix_decision"]
                    if group_decision in ("CANDIDATE_ATTACH_TO_EXISTING_PAGE", "OWNER_APPROVED_ONE_PAGE_MULTI_PIERS"):
                        page_slug = group["direct_page_slugs"].split(" || ")[0]
                        key = f"eventpage:{page_slug}"
                        decision = "ATTACH_TO_EXISTING_PAGE" if group_decision.startswith("CANDIDATE_") else "OWNER_APPROVED_ATTACH_MULTI_PIER"
                        basis = "same TC parent, city and normalized product title; one existing page" if group_decision.startswith("CANDIDATE_") else "explicit owner decision: one North Venice page, retain departure pier per session"
                        confidence = "HIGH" if group_decision.startswith("OWNER_") else "MEDIUM"
                    elif group_decision == "CANDIDATE_ONE_RECURRING_PRODUCT":
                        key = f"new-recurring:{group['provider_parent_id']}:{group['city_id']}:{group['product_key']}"
                        decision, basis, confidence = "CREATE_RECURRING_PRODUCT_PAGE", "one recurring product identity; no page exists", "MEDIUM"
                    elif "owner_requires_distinct_occurrence_pages" in group["review_reasons"] or "owner_requires_distinct_event_pages" in group["review_reasons"]:
                        key = f"event:{event_id}"
                        decision, basis, confidence = "CREATE_OWNER_SEPARATE_PAGE", "explicit owner decision: do not merge this product/occurrence", "HIGH"
                    else:
                        decision, basis, confidence = "REVIEW_RECURRING_GROUP", group["review_reasons"] or "group identity needs review", "REVIEW"
            elif parent_count > 1:
                decision, basis, confidence = "REVIEW_MULTIPLE_PROVIDER_PARENTS", "Event has more than one TC parent identity", "REVIEW"
            else:
                key = f"event:{event_id}"
                decision, basis, confidence = "CREATE_EVENTID_PAGE", "saleable READY event has no unresolved TC parent grouping", "MEDIUM"

            if status == "READY" and has_current_availability and offer:
                ready_live[decision] += 1
            counts[decision] += 1
            writer.writerow({
                "event_id": event_id, "title": row.get("title", ""), "event_kind": kind, "event_status": status,
                "city": row.get("city", ""), "venue": row.get("venue", ""), "source_codes": row.get("source_codes", ""),
                "tc_parent_count": parent_count, "tc_parent_ids": parents,
                "future_sellable_session_count": row.get("future_sellable_session_count", ""),
                "active_offer_count": row.get("active_offer_count", ""),
                "current_eventpage_slugs": linked_slug, "eventpage_count": page_count,
                "proposed_eventpage_key": key, "assignment_decision": decision, "decision_basis": basis, "confidence": confidence,
            })
        text.flush()
        text.detach()
    print(f"output={output}")
    print(f"events={sum(counts.values())}")
    print("all_decisions=" + repr(dict(counts)))
    print("ready_live_decisions=" + repr(dict(ready_live)))


if __name__ == "__main__":
    main()
