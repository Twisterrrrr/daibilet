#!/usr/bin/env python3
"""Export reviewable write batches for saleable recurring EventPage relations."""

import csv
import re
import sys
from collections import defaultdict
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


def product_key(row):
    product = norm_title(row.get("title", ""))
    if "не стоит вызывать его" in product:
        product = f"OWNER_SEPARATE_OCCURRENCE:{row['event_id']}"
    if "иммерсивный мастер класс хэллоуин" in product:
        product = f"OWNER_SEPARATE_EVENT:{row['event_id']}"
    return product


def rows(path):
    with Path(path).open(encoding="utf-8-sig", newline="") as f:
        yield from csv.DictReader(f)


def main():
    if len(sys.argv) != 5:
        raise SystemExit("usage: build-eventpage-recurring-write-candidates.py INVENTORY.csv SIBLINGS.csv DIRECT_LINKS.csv OUTPUT.csv")
    inventory_path, siblings_path, links_path, output_path = map(Path, sys.argv[1:])
    inventory = {row["event_id"]: row for row in rows(inventory_path)}
    id_to_page = {}
    for row in rows(links_path):
        if row.get("eventpage_id"):
            id_to_page[row["event_id"]] = (row["eventpage_id"], row.get("eventpage_slug", ""))

    fields = ["write_action", "source_parent_id", "city_id", "city", "product_key", "target_eventpage_id", "target_eventpage_slug", "representative_event_id", "event_title", "event_ids", "event_count", "basis"]
    result = []
    for group in rows(siblings_path):
        decision = group["matrix_decision"]
        if decision not in ("CANDIDATE_ATTACH_TO_EXISTING_PAGE", "OWNER_APPROVED_ONE_PAGE_MULTI_PIERS", "CANDIDATE_ONE_RECURRING_PRODUCT"):
            continue
        parent, city_id, product = group["provider_parent_id"], group["city_id"], group["product_key"]
        ids = [event_id for event_id in (group.get("all_event_ids") or "").split("|") if event_id in inventory]
        saleable = [inventory[event_id] for event_id in ids if event_id not in id_to_page
                    and inventory[event_id]["event_status"] == "READY"
                    and inventory[event_id]["event_kind"] == "RECURRING"
                    and int(inventory[event_id].get("future_sellable_session_count") or 0) > 0
                    and int(inventory[event_id].get("active_offer_count") or 0) > 0]
        if not saleable:
            continue
        linked = {event_id: id_to_page[event_id] for event_id in ids if event_id in id_to_page}
        page_ids = sorted({value[0] for value in linked.values()})
        page_slugs = sorted({value[1] for value in linked.values() if value[1]})
        if decision == "CANDIDATE_ONE_RECURRING_PRODUCT":
            if page_ids:
                raise SystemExit(f"unexpected existing page in create group {parent}/{city_id}/{product}")
            action = "CREATE_RECURRING_PAGE"
            target_id = target_slug = ""
            basis = "same TC parent + city + normalized product title; no EventPage membership exists"
        else:
            if len(page_ids) != 1 or len(page_slugs) != 1:
                raise SystemExit(f"expected exactly one existing page for {parent}/{city_id}/{product}: {page_ids} {page_slugs}")
            action = "OWNER_APPROVED_ATTACH_MULTI_PIER" if decision.startswith("OWNER_") else "ATTACH_TO_EXISTING_PAGE"
            target_id, target_slug = page_ids[0], page_slugs[0]
            basis = "owner-approved multi-pier product" if decision.startswith("OWNER_") else "same TC parent + city + normalized product title; one existing page"
        rep = sorted(saleable, key=lambda r: (r.get("next_future_sellable_session") or "9999", r["event_id"]))[0]
        result.append({"write_action": action, "source_parent_id": parent, "city_id": city_id, "city": group.get("city", ""),
                       "product_key": product, "target_eventpage_id": target_id, "target_eventpage_slug": target_slug,
                       "representative_event_id": rep["event_id"], "event_title": rep["title"],
                       "event_ids": "|".join(sorted(r["event_id"] for r in saleable)), "event_count": len(saleable), "basis": basis})

    # Explicit owner instruction: these two currently saleable occurrences are
    # separate pages despite sharing a source parent, title and venue.
    owner_ids = [
        event_id for event_id, row in inventory.items()
        if "не стоит вызывать его" in norm_title(row.get("title", ""))
        and event_id not in id_to_page
        and row["event_status"] == "READY" and row["event_kind"] == "RECURRING"
        and int(row.get("future_sellable_session_count") or 0) > 0 and int(row.get("active_offer_count") or 0) > 0
    ]
    for event_id in sorted(owner_ids):
        row = inventory[event_id]
        result.append({"write_action": "CREATE_OWNER_SEPARATE_PAGE", "source_parent_id": row.get("tc_parent_ids", ""),
                       "city_id": row.get("city_id", ""), "city": row.get("city", ""),
                       "product_key": f"OWNER_SEPARATE_OCCURRENCE:{event_id}", "target_eventpage_id": "", "target_eventpage_slug": "",
                       "representative_event_id": event_id, "event_title": row["title"], "event_ids": event_id,
                       "event_count": 1, "basis": "explicit owner decision: separate occurrence; do not merge by shared TC parent"})

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(result)
    counts = defaultdict(lambda: [0, 0])
    for row in result:
        counts[row["write_action"]][0] += 1
        counts[row["write_action"]][1] += int(row["event_count"])
    print(f"output={output_path} groups={len(result)}")
    for action, (group_count, event_count) in sorted(counts.items()):
        print(f"{action}\tgroups={group_count}\tEventIDs={event_count}")


if __name__ == "__main__":
    main()
