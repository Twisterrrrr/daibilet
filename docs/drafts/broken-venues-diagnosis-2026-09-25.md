# Broken venues sitemap — diagnosis 2026-09-25

## Step 1 dump

- File: `docs/drafts/broken-venues-2026-09-25.txt`
- Sitemap: **1391** locs
- Non-200: **190**
  - **184 × 404**
  - **6 × 308** (redirects; counted as broken vs 200). Per-line recount of the dump; the 185/5 split in earlier drafts was a transcription error.
- Slug encoding: **190/190 latin** (hypothesis E rejected)
- Prefix among broken: `/venues/` 175, `/locations/` 15

## Pattern (from `/api/public/venues?limit=10000` list DTO)

| Signal | Broken (190) | Notes |
|--------|--------------|-------|
| In list DTO | **190/190** | Not orphans in list |
| `pageStatus` | candidate 174, none 14, published 2 | Not «only unpublished» |
| `events` | 158 have exactly 1; 183 have &lt;3 | Low-afisha heavy |
| `shortDescription` | **90% null** (ok sample ~30%) | Correlated, not sole cause |
| `canonicalPath` | **null for all 190** in list | Sitemap falls back to `venueHref(type)` |

Working controls (Pushkin / Bolshoi / Gorky Park): HTML+API 200.

## Step 2 — five samples (public evidence; DB SQL still needed on MSK)

### 1) `restoran-nezagorami` (404, `/venues/…`)

| Check | Result |
|-------|--------|
| List | id=`venue_67c58233565c667e21e0b503`, type=`club_bar_restaurant`, pageStatus=`candidate`, events=12, noDesc |
| `/api/public/venues/{slug}` | **404** `{"error":"not_found"}` |
| `/api/public/venues/{id}` | **404** same |
| `/venues/…` HTML | 404 (scan) |
| `/locations/…` HTML | soft-200 «Площадка временно недоступна» (ISR poison / unavailable path) |

**Not A (legacy slug):** id lookup also 404 → `buildPublicVenuePage` returned null after resolve, or resolve failed for a row that list still serves (stale list less likely for 190).

### 2) `a2` (404)

| Check | Result |
|-------|--------|
| List | id=`venue_548b0e039cb53807b416ac4f`, concert_hall, pageStatus=`none`, events=2, noDesc |
| API slug+id | **404** |
| `/locations/a2` | soft-200 unavailable (not real PDP) |

### 3) `dom-muzei-gogolya` (404) — published!

| Check | Result |
|-------|--------|
| List | id=`venue_5693cd139cb53836a4dbec2c`, museum, **published**, events=1, address+hero, noDesc |
| API slug+id | **404** |

Published + address still 404 → empty catalog sessions + `hasAddressProfile` false (needs description/shortDescription) collapses admission-only escape in `buildPublicVenuePage`.

### 4) `yarche` (404, `/locations/…`)

| Check | Result |
|-------|--------|
| List | pier, candidate, events=2 |
| API | 404 |
| Both prefixes HTML | 404 |

### 5) `novodevichii-monastyr` / `gosudarstvennyi-ermitazh` (308 group)

| Check | Result |
|-------|--------|
| Sitemap URL | `/venues/novodevichii-monastyr` → **308** `/locations/novodevichii-monastyr` |
| List row | museum / published / events=1 (twin?) |
| Detail API | **200** but type=`sport_activity_space`, pageStatus=`NONE`, canon `/locations/novodevichii-monastyr-…` |
| Live PDP | meeting-point style location with tour event — **not** the museum list card |

`gosudarstvennyi-ermitazh` → 308 `/venues/ermitazh` (alias; real Ermitage 200).

## Hypotheses

| ID | Verdict | Evidence |
|----|---------|----------|
| **A** slug/legacySlug desync | **Unlikely as primary** | All latin; **id** lookup also 404 for broken |
| **B** partial slug migration | **Unlikely** | Same |
| **C** list/sitemap vs detail filter asymmetry | **Primary (code-backed)** | List hub SQL `events≥1` → sitemap; detail `loadVenuePageCatalogSessions` then if `sessions.length===0` requires content-place / location profile / **PUBLISHED+description** — candidates/none/published-without-desc → **null → API 404** |
| **D** duplicate / wrong twin | **Secondary (308 subset)** | Novodevichy: list museum vs detail sport/meeting twin |
| **E** Cyrillic percent-encoding | **Rejected** | 0/190 |

Code pointers:

- Sitemap path: `apps/web/src/lib/sitemap-data.ts` uses `venue.canonicalPath \|\| venueHref(...)` (not `venueCanonicalPath`).
- Detail null gate: `apps/backend/src/public-venue-read.js` `buildPublicVenuePage` (~477–510) when catalog sessions empty.
- Detail merge hub window only **500** rows vs list **10000** (`publicVenueHubRows(db, 500)` vs `VENUE_CATALOG_HUB_MAX`) — can worsen twin/merge session lookup for low-ranked venues.

## What is NOT done (red lines)

- No sitemap masking (deleting 190 URLs).
- No Wave 1 deploy.
- No production fix until MSK confirms `sessions=[]` / hub gate for the five IDs.

## SQL for Codex on MSK (step 2.1)

```sql
SELECT id, slug, title, kind, "pageStatus", "canonicalPath",
       "isIndexable",
       (shortDescription IS NOT NULL) AS has_short,
       (description IS NOT NULL) AS has_desc,
       "createdAt", "updatedAt"
FROM "Venue"
WHERE id IN (
  'venue_67c58233565c667e21e0b503',
  'venue_548b0e039cb53807b416ac4f',
  'venue_5693cd139cb53836a4dbec2c',
  'venue_664b2a872abf1ed76d5d42b1',
  'venue_54d312969cb538448b06aeff'
)
   OR slug IN (
  'restoran-nezagorami', 'a2', 'dom-muzei-gogolya', 'yarche', 'bkz-kosmos'
);

-- event counts as list sees them
SELECT e."venueId", count(DISTINCT e.id) AS events
FROM "Event" e
WHERE e."venueId" IN (
  'venue_67c58233565c667e21e0b503',
  'venue_548b0e039cb53807b416ac4f',
  'venue_5693cd139cb53836a4dbec2c',
  'venue_664b2a872abf1ed76d5d42b1',
  'venue_54d312969cb538448b06aeff'
)
GROUP BY 1;
```

Plus on API host: confirm `buildPublicVenuePage` logs / temporary reason for null (sessions empty vs !inPublicHub).

## Likely fix (only after SQL confirm)

1. **Detail:** if venue is hub-eligible with SQL/distinct events &gt; 0, do not return null when catalog sessions soft-miss; serve PDP with empty/partial afisha (or SQL session fallback).
2. **Sitemap:** emit `venueCanonicalPath` / detail `canonicalPath` only; never naive `/venues/` default.
3. **Twins (D):** one canon + 301; do not list both museum stub and meeting twin under the same public slug.
4. Regression test: venue in list with events≥1 ⇒ detail DTO non-null.

## Wave 1

**Blocked** until broken count → 0 (or explicit owner exception). Deploy without this keeps advertising 404s to crawlers.


## Follow-up SQL (2026-09-25 Cursor)

See `docs/drafts/broken-venues-sql-2026-09-25.md` — MSK SELECT slice; Group A confirmed; code fix deferred (multi-layer).

