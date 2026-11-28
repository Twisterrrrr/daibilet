"""Build an exact-identity, high-confidence taxonomy manifest from the read-only audit CSV."""
import csv
import json
import sys
from pathlib import Path

source, output = map(Path, sys.argv[1:3])
with source.open(encoding="utf-8-sig", newline="") as handle:
    rows = list(csv.DictReader(handle))
approved = [dict(id=row["id"], title=row["title"], oldKind=row["oldKind"],
                 placeType=row["placeType"], placeSubtype=row["placeSubtype"])
            for row in rows if row["confidence"] == "high" and row["placeSubtype"]]
if len({row["id"] for row in approved}) != len(approved):
    raise SystemExit("Duplicate Venue IDs in high-confidence manifest")
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(approved, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"sourceRows": len(rows), "approved": len(approved)}, ensure_ascii=False))
