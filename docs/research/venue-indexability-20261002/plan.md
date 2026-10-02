# Venue indexability: read-only inventory and decision plan

**02.10.2026. No runtime, database, sitemap or content changes were made.**

## Measurement status

The supplied production snapshot is preserved in [source-counts.csv](./source-counts.csv).
Its thirteen rows sum to **4,302**, while the stated venue total is **4,304**;
the remaining two rows need their kinds verified. The supplied breakdown gives
**1,779 attractions without future sessions**, **401 empty concert/theatre halls**
and **241 duplicate-name groups / 580 records**. These are input figures, not a
fresh audit. The local Docker DB has 250 venues and cannot stand in for prod.

Production SSH to `daibilet-msk` timed out twice, and `venues.xml` timed out
from this host. Therefore current index/noindex counts, sitemap membership,
content coverage, 120-character descriptions, and post-rule counts are **not
measured**. In particular, the claim that nearly all 401 empty halls are
indexed remains unconfirmed. `read-only-inventory.sql` records the direct DB
queries to run once access is restored. Rendered `robots` and the live sitemap
must then be compared to the DB export; they cannot be inferred from
`isIndexable` alone.

## Existing code and proposed rule — plan only

`evaluateVenueIndexability` currently rejects explicit `isIndexable=false`,
hidden pages, `meeting_point`/`online`/`other`, `detailAvailable=false`, and
venues with zero `events`. The sitemap calls this function on the public venue
projection. Its `events` value is derived from the public catalog and may
differ from a simple `EventSession` count; compare both before changing rules.

Proposed extension to the existing evaluator (no new indexability entity):

1. Preserve explicit noindex, hidden page, and unavailable detail as first
   precedence.
2. Attraction kinds `MONUMENT`, `MUSEUM_ART_SPACE`, `TEMPLE`, `ATTRACTION`,
   `PARK`, `OUTDOOR_LOCATION`, `PIER`: index when there is a future public
   session **or** a substantive description. Use ≥120 trimmed characters as
   the proposed no-session quality threshold; report shorter descriptions
   separately before owner approval.
3. `CONCERT_HALL`, `THEATER`, `SPORT_ACTIVITY_SPACE`: index with a future public
   session. No session and no description means noindex. A described empty hall
   is an owner choice after the exact count and content quality review.
4. `MEETING_POINT`, `VENUE`, `OTHER`, `ONLINE`: noindex. For
   `CLUB_BAR_RESTAURANT` / `GASTRO` without both program and substantive
   description, noindex; keep the program-backed cases under existing rule.
5. Use one decision for page robots and sitemap inclusion. Do not change the
   existing content gate or allowlist in this task.

The after-rule indexed count is deliberately **unknown** until the production
description/future-session export and sitemap comparison are complete.
Applying the rule to 1,779 attractions from the supplied snapshot would index
only the subset with ≥120-character descriptions. It must not be described as
"1,779 pages added" without that measurement.

## Duplicate-name choices

The 241 groups / 580 records are name collisions, **not 241 proven duplicates**.
Cross-city names are distinct. Even same-city pairs may represent different
venues (for example, the supplied «Панорама» case has two kinds and programs).

| Option | Current numeric basis | Decision test |
|---|---:|---|
| Keep separate unique slugs | All 580 records already have unique `slug` by schema | Default when city, address, provider identity or program differs |
| Noindex one thin member | At most 339 surplus records if one per group were kept; actual eligible count unknown | Only after comparing same-city identity and content |
| Canonicalize to one URL | Exactly 3 duplicate `canonicalPath` values are reported in DB, not 78 | Use only for proven same physical entity; verify both routes resolve |

Do not merge rows automatically or create `/{city}/venue/{slug}`. The 78
duplicate sitemap-path groups refer to a different set than DB
`canonicalPath`. The export query lists the exact three DB collisions for
manual review.

## Sitemap comparison after access is restored

Export all venues with the supplied SQL, capture the live `venues.xml`, then
join by normalized absolute path. Report: DB rows by kind/with and without
future sessions, current robots/index/noindex, sitemap presence, 1,779 content
coverage (`description`, `heroImageUrl`, coordinates, `shortDescription`),
description ≥120, 401 hall index status, proposed index/noindex, and sitemap
URLs that fail the proposed rule. Keep duplicate path groups separate from
duplicate venue names. No SQL in this package writes data.

## Owner decision needed

The no-session attraction template needs opening hours, ratings and photos.
There is no Google Places access and no 2GIS key in the environment described
by the task. Choose whether to connect 2GIS as a verified source, keep thin
pages available but noindex, or allow these pages into the index after content
review. Separately decide whether well-described empty halls are useful enough
to index. No rule or DB flag will be applied until those decisions and the
production measurements are available.
