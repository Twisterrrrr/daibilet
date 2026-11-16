#!/usr/bin/env python3
"""Audit the three New Year EventPage rewrite batches against the archived source snapshot."""
from __future__ import annotations
import csv, html, json, re
from pathlib import Path

BASE = Path(__file__).resolve().parents[1] / "data/ticketscloud/editorial"
QUEUE = BASE / "new-year-batch-final-queue-2026-11-16.csv"
ARCHIVE = BASE / "new-year-batches-source-archive-2026-11-16.json"
AUDIT = BASE / "new-year-batches-editorial-audit-2026-11-16.csv"

with QUEUE.open(encoding="utf-8-sig", newline="") as f:
    queue = {row["eventpage_id"]: row for row in csv.DictReader(f)}
archive = json.loads(ARCHIVE.read_text(encoding="utf-8"))
archive_by_id = {page["eventPageId"]: page for page in archive["eventPages"]}
rows: list[dict[str, object]] = []
all_paragraphs: dict[str, list[tuple[int, int]]] = {}

for batch in range(1, 4):
    workset = json.loads((BASE / f"new-year-batch-{batch:02d}-workset-2026-11-16.json").read_text(encoding="utf-8"))
    markdown = (BASE / f"new-year-batch-{batch:02d}-rewrites-2026-11-16.md").read_text(encoding="utf-8")
    for block in re.split(r"(?m)^## (?=\d+\.)", markdown):
        match = re.match(r"(\d+)\.", block)
        if not match:
            continue
        number = int(match.group(1))
        block = re.sub(r"^\d+\. [^\r\n]+\r?\n", "", block, count=1)
        item = workset[number - 1]
        page_id = item["eventPageId"]
        page = queue.get(page_id, {})
        archived = archive_by_id.get(page_id, {})
        original = max((event.get("description") or "" for event in archived.get("events", [])), key=len, default="")
        original_plain = " ".join(html.unescape(re.sub(r"<[^>]+>", " ", original)).split())
        main = re.split(r"(?m)^### Практическая информация\s*$", block, maxsplit=1)[0]
        main = re.sub(r"(?m)^## .+\n", "", main)
        plain = " ".join(re.sub(r"[#*`]", " ", html.unescape(re.sub(r"<[^>]+>", " ", main))).split())
        paragraphs = [p.strip() for p in re.split(r"\n{2,}", main) if p.strip() and not re.match(r"^#{1,3} ", p.strip()) and not re.match(r"^-\s", p.strip())]
        practical = block.split("### Практическая информация", 1)[1] if "### Практическая информация" in block else ""
        url = page.get("url", "")
        row = {
            "batch": batch, "number": number, "eventpage_id": page_id, "url": url,
            "slug": item.get("slug", ""), "title": item.get("title", ""), "city": page.get("city", ""),
            "venues": item.get("venues") or page.get("venue", ""), "source_event_ids": page.get("eventIds", ""),
            "active_slots": int(page.get("slots") or 0), "next_active_slot_utc": page.get("next", ""),
            "provider_original_plain_chars": len(original_plain), "rewrite_main_plain_chars": len(plain),
            "substantive_paragraphs": len(paragraphs), "length_pass": len(plain) >= len(original_plain),
            "paragraphs_pass": len(paragraphs) >= 2,
            "practical_info_bullets": len(re.findall(r"(?m)^-\s+\*\*[^*]+:\*\*", practical)),
            "practical_info_pass": bool(re.search(r"(?m)^-\s+\*\*[^*]+:\*\*", practical)),
            "html_markup_remaining": bool(re.search(r"</?[a-z][^>]*>", main)),
        }
        rows.append(row)
        for paragraph in paragraphs:
            normalized = " ".join(paragraph.split())
            all_paragraphs.setdefault(normalized, []).append((batch, number))

with AUDIT.open("w", encoding="utf-8-sig", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=list(rows[0]))
    writer.writeheader()
    writer.writerows(rows)

ids = [row["eventpage_id"] for row in rows]
urls = [row["url"] for row in rows]
failures = [row for row in rows if not (row["url"] and row["active_slots"] > 0 and row["length_pass"] and row["paragraphs_pass"] and row["practical_info_pass"] and not row["html_markup_remaining"])]
repeated = {text: locations for text, locations in all_paragraphs.items() if len(locations) > 1}
print(f"rows={len(rows)} unique_eventpages={len(set(ids))} unique_urls={len(set(urls))} active_slot_rows={sum(bool(r['active_slots']) for r in rows)} failures={len(failures)} repeated_exact_paragraphs={len(repeated)} audit={AUDIT}")
for row in failures:
    print(f"FAIL batch={row['batch']} #{row['number']} {row['title']}: source={row['provider_original_plain_chars']} rewrite={row['rewrite_main_plain_chars']} active_slots={row['active_slots']}")
if len(rows) != 90 or len(set(ids)) != 90 or len(set(urls)) != 90 or failures:
    raise SystemExit(1)
