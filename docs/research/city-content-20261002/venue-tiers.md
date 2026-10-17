# Venue and location tiers (r9, 2026-10-02)

Production data, 4304 venues. Query: `scripts/venue-tiering.sql` (read-only).

```
tier     venues  with_text  with_photo  with_coords
T1          781       781         781         777   ← write these first
T2           19        19           0          19
T3        2900         0        2898        2807   ← needs text, has photo+address
HOLD         20         4          20           1   ← no address; text cannot fix

LOC_T1      169       169         159         169   ← route-ready
LOC_T3      414        39         413         414
LOC_HOLD      1         0           1           0
```

## What this says

**781 venues are ready to write for right now.** They already have description,
address and photo; only the prose is missing. That is the cheapest first batch
by a wide margin.

**2900 venues have a photo and an address but no description at all** (with_text
is 0 for the whole tier). This is the bulk of the catalogue and it is a
text-only problem - no data work needed, just writing.

**HOLD is only 20 venues.** The concern that most records lack usable material
was wrong; almost everything has an address and a photo.

## Locations

Locations are tiered separately because an event schedule is close to irrelevant
for them: what matters is whether they can anchor a route. 169 of 584 locations
already have coordinates plus a hookFact and are route-ready as they stand.