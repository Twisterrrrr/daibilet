# City, region and place URL canon

> The authoritative cross-domain route matrix is
> [`domain-url-canon-2026-11-16.md`](./domain-url-canon-2026-11-16.md).
> This document owns the city/region/place migration audit and exact
> production URL inventory; if a general route rule differs, follow the
> cross-domain canon and update this audit alongside it.

**Status:** Approved architecture; city/region routes and redirects are on staging. City event catalogs are implemented in the current branch and await staging acceptance.
**Date:** 2026-11-16

## Decision

Keep the established event URL family intact while introducing a stable,
city-first URL hierarchy for destination hubs and place catalogs. City and
region hubs are editorial destinations; their routes must not be derived from
the current event inventory or from the presence of a sales contract.

### Canonical route map

| Surface | Canonical URL | Policy |
| --- | --- | --- |
| All cities and regions | `/cities` | Indexable directory |
| All regions | `/regions` | Indexable directory |
| Region hub | `/regions/{region}` | Index when published and meeting its content tier |
| All places | `/places` | Indexable national catalog |
| Places by type, nationwide | `/places/{type}` | Indexable type catalog when it has useful inventory |
| City hub | `/{city}` | Index when published as a city hub |
| City events | `/{city}/events` | Indexable city event catalog; Event detail URLs remain under `/events/{slug}` |
| All places in a city | `/{city}/places` | Indexable city place catalog |
| City places by type | `/{city}/{type}` | Type catalog under the city; only registered place-type slugs resolve here |
| Venue / place PDP | Existing `/venues/{slug}` or `/locations/{slug}` | Keep the existing stable family and slug rules; this URL decision does not migrate PDPs |
| Event catalog and PDP | `/events`, `/events/{slug}` | **No change** |

The city type segment is directly under the city (`/{city}/museums`,
`/{city}/theatres`, `/{city}/clubs`, `/{city}/bar-restaurants`). `/places` remains the all-places route, while
`/{city}/places` remains the complete city catalog. A city type route is
recognized only when `{type}` is in the canonical place-catalog registry.
The registry may include editorial facets backed by subtypes, not just parent
PlaceType values.

## Indexing rules for city × place type

- **0 places:** return 404, omit the type link and sitemap entry.
- **1–2 places:** return 200 with `noindex, follow`; canonical points to
  `/{city}/places`; keep the filter available in the interface.
- **3 or more places:** `index, follow`, self-canonical, and sitemap eligible.
- Paginated listing pages are not separate index targets; page 1 is canonical.

This is the requested threshold for the new city-type routes. Existing route
families keep their current behavior until their route migration is explicitly
implemented and verified.

## Reserved paths and route precedence

The root city route must resolve only against published/registered city hubs.
It must never capture an application route, event/category landing, static
page, or an unknown slug. The city registry must reserve all current top-level
routes and category landing slugs. At two segments, route resolution order is:

1. Fixed application routes (`/events`, `/places`, `/cities`, `/regions`,
   `/venues`, `/locations`, `/blog`, `/podborki`, account and checkout routes).
2. A registered city plus one of its fixed city subsections (`events`,
   `places`, or a registered place type).
3. Existing editorial/event-category landing routes.
4. 404.

No generic unknown path may silently become a city or an indexable landing.

## Legacy URLs and migration

The staging release adds and verifies the new routes without removing current
ones. The reviewed city/region redirects are enabled on staging and were
checked against all 117 current sitemap URLs:

- `/cities/{city}` → `/{city}`
- `/places/c/{city}` → `/{city}/places`
- Existing category × city landing URLs remain unchanged unless individually
  listed in a reviewed redirect map; they must not be mistaken for place-type
  routes.

The checked-in old→new URL map is in
[`city-place-url-map-production-2026-11-16.csv`](./city-place-url-map-production-2026-11-16.csv).
Staging check on 2026-11-17: city 51/51, city-place 51/51, region 15/15 direct
redirects. Novgorod spelling aliases are one-hop and absent from `cities.xml`.
Production has not been changed. Before any production rollout, complete city
event route acceptance and verify canonical, robots, sitemap, breadcrumbs, and
internal links on staging.

## Rollout sequence

1. Audit the live sitemap, internal links, inbound URLs and Next route table.
2. Implement new routes behind the existing city/place data and SEO resolvers;
   leave `/events` and `/events/{slug}` untouched.
3. Test representative city, region, global-type, city-type, no-inventory,
   thin-inventory, and collision cases on staging.
4. Publish the reviewed redirect map and switch city/place canonicals and
   sitemap entries in a separate release.
5. Verify production responses and crawler logs before considering cleanup of
   any legacy route code.

## Current implementation notes

- Current city hubs are served at `/cities/{slug}` and city place catalogs at
  `/places/c/{city}`.
- On staging, the 51 reviewed city hub URLs resolve at `/{city}`, the 51 city-place URLs at `/{city}/places`, and 15 published region URLs at `/regions/{region}`. All 117 legacy URLs tested as one-hop permanent redirects to the reviewed target.
- `/{city}/events` has a dedicated catalog route for the 51 registered city slugs. It filters by the stored API destination slug, keeps filters and pagination on the city route, sets a city-specific canonical, and enters `cities.xml` only when the city has event inventory. Staging acceptance is pending.
- Next.js has generic one- and two-segment landing routes. New root city and
  city-type routes therefore require explicit route precedence and reserved
  slug handling; a broad rewrite alone is unsafe.
- Current place-family PDPs use both `/venues/{slug}` and `/locations/{slug}`.
  Keep the family unchanged. The domain URL matrix defines the public-slug
  rule: route/canonical/sitemap use `Venue.publicSlug`; `Venue.slug` remains
  the import identity. The nullable column and unique index are present in the
  staging database, but the integration branch still needs deployment and URL
  smoke. Existing published records require a reviewed dry-run before bulk
  assignment or redirects.
- Event PDPs remain on `/events/{slug}`. The national catalog remains `/events`; city-specific catalogs are `/{city}/events` and do not change EventPage identities or URLs.

## Production URL inventory (read-only, 2026-11-16)

- Sitemap index currently exposes six child sitemaps, including `cities.xml`
  and `landings.xml`.
- `/api/public/destinations` currently exposes **93** destinations: **69
  cities** and **24 regions**. This is the full current destination inventory;
  it is larger than the indexable URL inventory.
- `cities.xml` contains **66** `/cities/{slug}` hub URLs (51 cities and 15
  regions) and **51** `/places/c/{city}` place-catalog URLs.
- Current one-segment roots in `static.xml` do not collide with those 66 hub
  slugs.
- There is one overlap with the first segment of existing city-scoped
  landings: `moscow` (`/moscow/moscow-museums`). Keep that exact landing URL
  resolvable. It does not conflict with the city home `/moscow`; the two-segment
  resolver must match a registered city type only for the approved type slug
  set and otherwise continue to the existing landing resolver.
- Other current city-prefixed landing examples include
  `/saint-petersburg/night-bridges`, `/saint-petersburg/spb-yards`, and
  `/saint-petersburg/planetarium`. Preserve these exact routes unless a URL is
  separately reviewed and included in the redirect map.
- The live sitemap has `/cities/nizhny-novgorod`, `/cities/veliky-novgorod`,
  `/places/c/nizhny-novgorod`, and `/places/c/veliky-novgorod`. Their reviewed
  city-first targets use those same public spellings. The API lookup slugs
  `nizhniy-novgorod` and `velikiy-novgorod` are aliases only; they must not
  produce separate city or city-place pages. Event, article, and authored
  landing URLs containing either spelling remain untouched. City event-catalog
  routes using the aliases redirect to the public city spelling.
- A mapping pass matched all 66 city/region sitemap URLs and all 51 city
  place-catalog URLs one-to-one against `/api/public/destinations` by entity
  identity. The current-sitemap map is
  [`city-place-url-map-production-2026-11-16.csv`](./city-place-url-map-production-2026-11-16.csv).
  It is an audit artifact and the source for the staging redirect check.
- The full 93-destination inventory is in
  [`city-region-destination-inventory-2026-11-16.csv`](./city-region-destination-inventory-2026-11-16.csv).
  **27 records (18 cities and 9 regions) have no current sitemap URL.** They
  stay out of the migration map until an editorial hub is explicitly
  published; a destination record alone does not authorize a new public hub.
