# Broken venues — SQL slice MSK 2026-09-25

Source: 190 non-200 URLs from `docs/drafts/broken-venues-2026-09-25.txt`.  
Lookup key: **venue id** from live `/api/public/venues?limit=10000` (not raw DB `slug` — see §0).  
Host: `msk-1-vm-5a5i`, DB via `/opt/daibilet/.env` `DATABASE_URL` (read-only SELECT).

## 0. Slug drift (why slug IN (...) matched 1/190)

| Signal | Value |
|--------|-------|
| Matched by latin sitemap slug | **1 / 190** |
| Matched by list `id` | **190 / 190** |
| `list.slug ≠ Venue.slug` | **190 / 190** |

DB stores Cyrillic / opaque slugs (`ресторан-незагорами-67c582…`).  
List/sitemap emit `publicVenueSlug` latin (`restoran-nezagorami`).  
Resolver already has `resolvePublicVenueRowByComputedSlug` — **not the 404 root**.  
Hypothesis A (slug/legacy desync as primary) remains **rejected for 404**; drift is real but orthogonal.

## 1. pageStatus

| pageStatus | n |
|------------|---|
| CANDIDATE | **173** |
| NONE | **15** |
| PUBLISHED | **2** |

Aligns with list DTO (173 / 15 / 2). Diagnosis draft said 174/14/2 — off by one; use SQL numbers.

## 2. canonicalPath

| | n |
|--|---|
| `canonicalPath` IS NULL | **171** |
| `canonicalPath` set | **19** |
| total | 190 |

**Correction to earlier diagnosis:** not «null у всех 190». List DTO omitted stored path for most; DB has 19 non-null (often still Cyrillic or wrong-family).

## 3. Description length

| bucket | n |
|--------|---|
| empty_desc | **183** |
| short_lt50 | 2 |
| desc_ge50 | 5 |

Thin layer is the norm for this set → owner `noindex,follow` on 200 PDP is consistent.

## 4–5. Events

| | |
|--|--|
| pageStatus × has_any_event | CANDIDATE+event **173**, NONE+event **15**, PUBLISHED+event **2** |
| pageStatus × has_visible_event (not CANCELLED/DRAFT/HIDDEN/DELETED) | **same 173 / 15 / 2** |
| Event.status among broken | READY 1167, HIDDEN 331, REVIEW 256 |
| Venues with `EventSession` (via Event) | **187 / 190** (1907 sessions) |
| Venues with READY + sessions | **172** |

**Group A confirmed:** all 173 candidates have events. Hypotheses C (list/sitemap vs detail asymmetry) **confirmed**.

## 6–7. Twins / duplicates

- No duplicate non-null `canonicalPath` **within** the 190 set alone.
- **Новодевичий** (Group C):

| id | slug (db) | kind | pageStatus | canonicalPath |
|----|-----------|------|------------|---------------|
| `ven_ms_95a0c6095c73ebf5` | `moscow-novodevichiy-monastyr` | TEMPLE | PUBLISHED | `/locations/moscow-novodevichiy-monastyr` |
| `venue_62931a512b3d98181e4f888c` | `новодевичии-монастырь-…` | MUSEUM_ART_SPACE | PUBLISHED | `/venues/новодевичии-монастырь-…` (in broken set) |
| `venue_6407178af4d48cfebd200f18` | `novodevichii-monastyr-…` | SPORT_ACTIVITY_SPACE | NONE | `/locations/novodevichii-monastyr-…` |
| `venue_5c20f59092b29e000c6282a3` | cemetery | MEETING_POINT | CANDIDATE | null |

Canon for SEO should be temple `moscow-novodevichiy-monastyr`; museum twin in sitemap is the conflict.

## 8–9. Five probes

| public slug | id | pageStatus | desc | addr | events | READY | sessions |
|-------------|----|------------|------|------|--------|-------|----------|
| restoran-nezagorami | venue_67c582… | CANDIDATE | no | yes | 24 | 11 | 24 |
| a2 | venue_548b0e… | NONE | no | yes | 2 | 1 | 2 |
| dom-muzei-gogolya | venue_5693cd… | PUBLISHED | no | yes | 3 | 1 | 3 |
| yarche | venue_664b2a… | CANDIDATE | no | yes | 3 | 2 | 3 |
| novodevichii-monastyr | venue_62931a… | PUBLISHED | no | yes | 1 | 1 | 1 |

**Important:** DB has sessions for probes, yet public detail still 404 → `loadVenuePageCatalogSessions` soft-miss / hub gate, not «zero events in DB».

## 12–13. Published + NONE lists

**Published (2):** Gogol museum + Novodevichy museum twin — both empty desc, have addr+sessions.

**NONE (15):** includes junk (`sobytie-prohodit-onlain`, `neskolko-ploschadok`) and meeting-points with many events (`fort-krasnaya-gorka` 68). Owner decision: **exclude NONE from list+sitemap** (Group B).

---

## Decision (owner + SQL)

| Group | Size | Decision | Fix surface |
|-------|------|----------|-------------|
| **A** candidate + events | 173 | detail **200**, keep sitemap; thin → **noindex,follow** | `buildPublicVenuePage` null-gate (catalog miss / empty-session escape) |
| **B** NONE | 15 | remove from list + sitemap | hub/list filter + sitemap |
| **C** twin/308 | subset | one canon + 301; sitemap only canon | twins / family (separate; not Day-1 one-liner) |

**Hypothesis C:** confirmed. List/sitemap eligibility ≠ detail eligibility.  
**Hypothesis A/B (slug migration as 404 cause):** rejected.  
**Hypothesis E:** already rejected.

## Day-1 code note (Cursor)

Aligning list + sitemap + detail into one `isVenuePublic` is **more than one function**:

1. Detail early-return in `buildPublicVenuePage` (`sessions.length===0` + content/admission gates) — `apps/backend/src/public-venue-read.js` ~477–541  
2. Why catalog sessions miss despite `EventSession` rows — `loadVenuePageCatalogSessions`  
3. Hub universe `publicVenueHubRows(..., 500)` vs list `10000`  
4. Sitemap `evaluateVenueIndexability` + NONE exclusion  
5. Group C twins  

Per vacation rule («больше одной функции → отложить Codex»): **no production code change today**. SQL report + decision only.

## Blockers (unchanged)

- Wave 1 deploy blocked until broken → 0 (or owner exception).  
- Family migration frozen until 1391/1391.  
- Do not mask by deleting URLs from sitemap without fixing eligibility.
