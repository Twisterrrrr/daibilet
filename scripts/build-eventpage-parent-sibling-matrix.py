#!/usr/bin/env python3
"""Build a read-only audit of TC parent/city sibling Events from full inventory."""

import csv
import json
import re
import sys
from collections import defaultdict, Counter
from pathlib import Path

DATE_PREFIX = re.compile(r"^\s*(?:\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?|\d{1,2}\s+[а-яё]+(?:\s+\d{4})?)\s*[/|—–:-]+\s*", re.I)
DATE_ANYWHERE = re.compile(r"(?<!\d)\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?(?!\d)|(?<!\d)\d{1,2}\s+[а-яё]+(?:\s+\d{4})?(?!\w)", re.I)
WEEKDAY = re.compile(r"\(\s*(?:пн|вт|ср|чт|пт|сб|вс|понедельник|вторник|среда|четверг|пятница|суббота|воскресенье)\s*\)", re.I)
TRAILING_EVENT_ID = re.compile(r"[-\s]+(?:[0-9a-f]{24}|[0-9a-f]{32})\s*$", re.I)
SPACE = re.compile(r"\s+")
OWNER_MULTI_PIER_PARENT_IDS = {"67b6dc7ba69cf48036df9f14"}


def norm_title(value):
    value = DATE_PREFIX.sub("", value or "")
    value = DATE_ANYWHERE.sub(" ", value)
    value = WEEKDAY.sub(" ", value)
    value = TRAILING_EVENT_ID.sub("", value)
    value = value.lower().replace("ё", "е")
    value = re.sub(r"[^\w]+", " ", value, flags=re.UNICODE)
    return SPACE.sub(" ", value).strip()


def uniq(rows, key):
    return sorted({(row.get(key) or "").strip() for row in rows if (row.get(key) or "").strip()})


def main():
    if len(sys.argv) != 4:
        raise SystemExit("usage: build-eventpage-parent-sibling-matrix.py INVENTORY.csv PROVIDER_METADATA.json OUTPUT.csv")
    source, metadata_path, target = map(Path, sys.argv[1:])
    metadata_snapshot = json.loads(metadata_path.read_text(encoding="utf-8"))
    provider_metadata = {
        str(item.get("externalId")): item
        for item in metadata_snapshot.get("events", [])
        if item.get("externalId")
    }
    groups = defaultdict(list)
    excluded = Counter()
    with source.open(encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            if int(row.get("tc_parent_count") or 0) != 1:
                excluded["parent_count_not_one"] += 1
                continue
            parent = (row.get("tc_parent_ids") or "").strip()
            city_id = (row.get("city_id") or "").strip()
            if not parent:
                excluded["empty_parent"] += 1
                continue
            # Split one source parent into product-level candidate families.
            # This protects separate programs (e.g. regular vs holiday jazz)
            # while stripping occurrence dates from generated recurring titles.
            product = norm_title(row.get("title", ""))
            if "не стоит вызывать его" in product:
                product = f"OWNER_SEPARATE_OCCURRENCE:{row['event_id']}"
            if "иммерсивный мастер класс хэллоуин" in product:
                product = f"OWNER_SEPARATE_EVENT:{row['event_id']}"
            groups[(parent, city_id, product)].append(row)

    fields = ["provider_parent_id", "product_key", "city_id", "city", "all_event_ids", "event_ids", "event_count", "kind_values", "status_values", "ready_future_saleable_count", "active_offer_event_count", "normalized_title_count", "titles", "venue_count", "venues", "supplier_count", "suppliers", "provider_metadata_coverage", "provider_organizer_count", "provider_seller_count", "provider_identity_status", "category_values", "direct_page_count", "direct_page_slugs", "linked_event_ids", "matrix_decision", "review_reasons"]
    summary = Counter()
    with target.open("w", encoding="utf-8-sig", newline="") as out:
        writer = csv.DictWriter(out, fieldnames=fields)
        writer.writeheader()
        for (parent, city_id, product_key), rows in sorted(groups.items(), key=lambda item: (item[0][1], item[0][0], item[0][2])):
            event_ids = sorted(row["event_id"] for row in rows)
            kinds = uniq(rows, "event_kind")
            statuses = uniq(rows, "event_status")
            titles = uniq(rows, "title")
            title_keys = sorted({norm_title(row.get("title", "")) for row in rows if norm_title(row.get("title", ""))})
            venues = uniq(rows, "venue")
            suppliers = sorted({row.get("supplier_id", "").strip() + "|" + row.get("supplier", "").strip() for row in rows if row.get("supplier_id", "").strip() or row.get("supplier", "").strip()})
            pages = sorted({slug for row in rows for slug in (row.get("eventpage_slugs", "") or "").split(" || ") if slug})
            linked_ids = sorted(row["event_id"] for row in rows if int(row.get("eventpage_count") or 0) > 0)
            ready_saleable = [row for row in rows if row.get("event_status") == "READY" and int(row.get("future_sellable_session_count") or 0) > 0 and int(row.get("active_offer_count") or 0) > 0]
            provider_rows = [provider_metadata.get((row.get("provider_event_ids") or "").strip()) for row in ready_saleable]
            provider_rows = [item for item in provider_rows if item]
            organizers = {str(item.get("organizerId") or "").strip() for item in provider_rows if str(item.get("organizerId") or "").strip()}
            sellers = {str((item.get("seller") or {}).get("id") or "").strip() for item in provider_rows if str((item.get("seller") or {}).get("id") or "").strip()}
            metadata_complete = len(provider_rows) == len(ready_saleable) and all(
                str(item.get("organizerId") or "").strip() and str((item.get("seller") or {}).get("id") or "").strip()
                for item in provider_rows
            )
            if not ready_saleable:
                provider_identity_status = "NO_LIVE_MEMBERS"
            elif metadata_complete and len(organizers) == 1 and len(sellers) == 1:
                provider_identity_status = "VERIFIED_SINGLE_ORGANIZER_AND_SELLER"
            elif not metadata_complete:
                provider_identity_status = "INCOMPLETE_PROVIDER_METADATA"
            else:
                provider_identity_status = "PROVIDER_IDENTITY_CONFLICT"
            reasons = []
            if len(kinds) != 1 or kinds[0] != "RECURRING": reasons.append("mixed_or_non_recurring_kinds")
            if product_key.startswith("OWNER_SEPARATE_OCCURRENCE:"): reasons.append("owner_requires_distinct_occurrence_pages")
            if product_key.startswith("OWNER_SEPARATE_EVENT:"): reasons.append("owner_requires_distinct_event_pages")
            owner_multi_pier = parent in OWNER_MULTI_PIER_PARENT_IDS
            if len(venues) > 1 and not owner_multi_pier and provider_identity_status != "VERIFIED_SINGLE_ORGANIZER_AND_SELLER": reasons.append("multiple_venues_provider_not_verified")
            if len(suppliers) > 1: reasons.append("multiple_suppliers")
            if len(pages) > 1: reasons.append("multiple_existing_eventpages")
            if len(linked_ids) and len(pages) == 0: reasons.append("linked_membership_without_page_slug")
            if not ready_saleable: reasons.append("no_ready_future_saleable_member")
            if reasons:
                decision = "REVIEW"
            elif owner_multi_pier and len(pages) == 1:
                decision = "OWNER_APPROVED_ONE_PAGE_MULTI_PIERS"
            elif len(pages) == 1:
                decision = "CANDIDATE_ATTACH_TO_EXISTING_PAGE"
            else:
                decision = "CANDIDATE_ONE_RECURRING_PRODUCT"
            summary[decision] += 1
            summary["groups"] += 1
            summary["ready_future_ids"] += len(ready_saleable)
            writer.writerow({
                "provider_parent_id": parent,
                "product_key": product_key,
                "city_id": city_id,
                "city": rows[0].get("city", ""),
                "all_event_ids": "|".join(event_ids),
                "event_ids": len(event_ids),
                "event_count": len(event_ids),
                "kind_values": "|".join(kinds),
                "status_values": "|".join(statuses),
                "ready_future_saleable_count": len(ready_saleable),
                "active_offer_event_count": sum(1 for row in rows if int(row.get("active_offer_count") or 0) > 0),
                "normalized_title_count": len(title_keys),
                "titles": " || ".join(titles),
                "venue_count": len(venues),
                "venues": " || ".join(venues),
                "supplier_count": len(suppliers),
                "suppliers": " || ".join(suppliers),
                "provider_metadata_coverage": f"{len(provider_rows)}/{len(ready_saleable)}",
                "provider_organizer_count": len(organizers),
                "provider_seller_count": len(sellers),
                "provider_identity_status": provider_identity_status,
                "category_values": " || ".join(uniq(rows, "category")),
                "direct_page_count": len(pages),
                "direct_page_slugs": " || ".join(pages),
                "linked_event_ids": "|".join(linked_ids),
                "matrix_decision": decision,
                "review_reasons": "|".join(reasons),
            })
    print("\n".join(f"{key}\t{value}" for key, value in sorted(summary.items())))
    print(f"excluded\t{dict(excluded)}")
    print(f"output\t{target}")


if __name__ == "__main__":
    main()
