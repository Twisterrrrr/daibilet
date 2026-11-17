# Production URL reconciliation

**Snapshot:** 2026-11-16. Read-only review of production sitemap URLs and
production EventPage relations. Follow-up staging implementation was verified
on 2026-11-17; production URLs, DB records, and config were not changed.

## Priority: event URLs

The live sitemap contains **5,035 event URLs** out of **5,640 total URLs**.
The event URL family remains `/events`; this audit does not move event pages
under city routes or rewrite event slugs that contain city names.

| Current event sitemap URLs | Count | Action |
| --- | ---: | --- |
| Already resolve to a published EventPage path | 1,001 | Keep the current canonical URL |
| Exact published EventPage relation, different target path | 168 | Redirect candidate; only after staging and route verification |
| No published EventPage target | 3,866 | Keep the existing event fallback URL |

The event rows in the reconciliation CSV record the exact event identity,
publication status, and target where one is proven. A redirect candidate is
not an instruction to redirect: fallback URLs stay available until a reviewed
cutover. This protects search traffic while the EventPage catalogue is still
being completed.

The CSV also contains **4,098 historical event URLs** from the 2026-11-04
audit. They are a prior snapshot, not part of today's live sitemap: 714 have an
exact published EventPage target, 3,381 have no published target, and 3 remain
unresolved. Recheck these against current analytics and routing before using
them as a redirect list.

## Other live sitemap families

| Family | URLs | Action |
| --- | ---: | --- |
| City / region hubs and city place catalogs | 117 | Reviewed against destination identity |
| Venue PDPs | 53 | Keep current paths |
| Location PDPs | 258 | Keep current paths; public-slug migration is separate |
| Authored event-category landings | 82 | Keep exact authored paths |
| Articles | 43 | Keep exact article paths |
| Collections | 37 | Keep exact collection paths |
| Static / utility pages | 13 | Keep fixed paths |
| Global places catalogs | 2 | Keep current paths |

`/venues/{slug}` and `/locations/{slug}` remain unchanged because the
production schema does not yet expose the proposed `Venue.publicSlug` field.
Do not infer a new PDP slug or redirect from the place name alone.

## City slug duplicates

The approved public spellings are:

| Destination | Public canonical slug | Current API lookup slug |
| --- | --- | --- |
| Нижний Новгород | `nizhny-novgorod` | `nizhniy-novgorod` |
| Великий Новгород | `veliky-novgorod` | `velikiy-novgorod` |

The live city sitemap uses `nizhny` and `veliky`; the API spellings are lookup
aliases and must not create separate city or city-place pages. City and city
place paths that arrive through those aliases should redirect in one hop to the
public canonical spelling. This is a city-route-only rule. Event PDPs, article
slugs, and authored category landing paths containing these tokens are kept
exactly as they are.

The current city map matches all 66 live city/region hub paths and 51 city
place-catalog paths by destination identity. On staging, all 117 old paths now
redirect directly to their reviewed city-first or region target. The four
Novgorod paths use the public spellings above; the API spellings remain lookup
aliases only.

The staging city sitemap contains canonical Novgorod slugs and omits the API
spelling aliases. A dedicated `/{city}/events` catalog route is implemented
and awaits staging acceptance before any production rollout.

## Sources and artifacts

- Live production sitemap index and child sitemaps, fetched 2026-11-16.
- Production destination API and read-only production EventPage/EventPageEvent
  relations, checked 2026-11-16.
- Historical event URL audit dated 2026-11-04.
- [`domain-url-reconciliation-2026-11-16.csv`](./domain-url-reconciliation-2026-11-16.csv)
  contains current sitemap URLs, exact routing action, and the separate
  historical event URL set. Four approved city-slug aliases are listed as
  planned redirects, not live sitemap entries.
- [`city-place-url-map-production-2026-11-16.csv`](./city-place-url-map-production-2026-11-16.csv)
  maps current city/region sitemap paths to reviewed destination identities;
  all 117 reviewed old paths were verified as direct staging redirects.

No production deployment, redirect, sitemap edit, or database mutation was
performed. City-first redirects were enabled and verified on staging only.
