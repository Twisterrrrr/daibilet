# EventPage series and tour audit — 2026-11-13

Read-only production audit. No EventPage relationships, content, routes, canonicals, or indexing settings were changed.

## Scope and counts

- `ACTIVE_EDITORIAL_REWRITE` is present on 877 production Event-to-EventPage records, covering 357 distinct EventPages.
- The future-event snapshot contains 49,585 Event records with active future sessions. I compared those records with the active rewrite set and grouped repeated title families by title, city, venue, and linked page. A repeated title is a candidate for review, not by itself proof that two productions are the same.
- The automated candidate set contains 75 repeated-title families (487 current EventPages); 94 of those EventPages have active rewrites. This includes genuine tours, recurring slots, duplicate pages, and false positives such as generic show titles.

## Confirmed or high-confidence split series

| Series | Current split | Active rewrites | Finding |
| --- | ---: | ---: | --- |
| «Где мой 2008» / «Мой 2008» | 32 EventPages in 22 cities | 2 indexable; 30 drafts | User-confirmed touring party series. Production descriptions repeatedly identify DISCOTHÈQUE as the organizer. Keep one local EventPage per city and connect city pages with `EventTourGroup`; do not collapse the tour into one cross-city PDP. Ten pages are beyond the 22-city baseline and need same-city grouping review. Moscow has several venues and special versions, including New Year's Eve and «Бал стиляг 2008», so its local page needs a deliberate route/content choice. Full mapping is in `eventpage-series-audit-2008-2026-11-13.csv`. |
| Зоотеатр рептилий | 104 EventPages: 44 Grand Canyon (SPb), 43 Aura (Novosibirsk), 17 Armada (Mirny) | 2 indexable, both at Grand Canyon | These are repeated dates at three fixed local venues. Consolidate repeated dates within each city/venue into a local EventPage; the two published Grand Canyon pages need route/content review before merging. Confirm shared operator/program before linking the three local pages with a tour group. |
| ANNA ASTI, «Шоу “Царица”» | 8 cities | 8 indexable rewrites | Same named tour/program, currently 8 separate rewritten local EventPages. Connect them with one `EventTourGroup`; retain each city URL and local facts. |
| «В объятиях дождя» | 14 cities | 2 active rewrites | Same titled dance production across cities. Candidate to consolidate after checking the producer/company in the source records. |
| «Цирк будущего: За гранью возможного» | 9 cities | 2 active rewrites | Same titled touring show. Candidate to consolidate after checking the troupe/program in the source records. |
| Света, «Большой сольный концерт» | 7 cities | 2 active rewrites | Same performer and program across cities; candidate for one tour page. |
| «Симфония рока: Акт первый» | 3 cities | 2 active rewrites | Same named production; candidate for one page after confirming the show/producer match. |

## Same-city duplicates already holding many linked events

These are not cleanly consolidated yet: each has two local EventPages for the same title and departure point, with one indexable rewritten page and one draft page.

- «В Рускеалу на ретропоезде: Водопады и мраморный каньон»: 49 event links on the draft page and 61 on the indexable rewritten page; same St Petersburg departure point.
- «Карельские Хаски и Мраморный мир»: 49 links on the draft page and 61 on the indexable rewritten page; same St Petersburg departure point.

The existing indexable route is the natural local page to keep; attach the remaining linked events there only after checking page content, route records, and duplicate Event IDs. A tour group is a separate step after local pages are settled.

## Needs factual review before merging

- «Мастер и Маргарита» (36 pages) and Vanya Usovich (33 pages) look like touring families, but title-only matching does not establish that the same producer/production is represented throughout.
- «Щелкунчик» (20 pages) is especially ambiguous: the title covers many independent ballets and venues.
- Other multi-city performers and generic holiday-show titles are in the candidate set; they should be checked against source descriptions and organizer/producer data before consolidation.

## «Где мой 2008»: exact status

- 32 current EventPages / 32 linked Event IDs across 22 cities.
- 2 are `READY`, indexable, and marked `ACTIVE_EDITORIAL_REWRITE`: Novosibirsk (`gde-moi-2008-ruki-vverh-novosibirsk`) and Moscow/TREFF8 (`gde-moi-2008-treff8-ny-moskva`).
- The other 30 are `DRAFT`, non-indexable, and have no active rewrite marker.
- The complete page slug, EventPage ID, Event ID, city, venue, next session, and rewrite/indexing status are in `eventpage-series-audit-2008-2026-11-13.csv`.

## Recommended order

1. Link verified, one-page-per-city tours with `EventTourGroup`; this is additive and leaves local EventPages, URLs, canonicals, and indexing intact.
2. Resolve same-city duplicate EventPages and repeated slots, starting with «Где мой 2008», Grand Canyon reptile-theater dates, Ruskeala, and Karelia huskies.
3. Add the remaining verified city variants of «В объятиях дождя», Света, and «Симфония рока» to tour groups.
4. Review the remaining candidates against source descriptions and organizer data; do not merge generic titles by name alone.
