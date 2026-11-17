# Daibilet domain and URL canon

**Status:** Approved architecture; city/region routes and redirects are on staging. City event catalog acceptance is pending.
**Date:** 2026-11-16
**Canonical host:** `https://daibilet.ru`

This document is the single target URL matrix for public Daibilet pages. The
city/place migration detail and the production URL audit live in
[`city-region-place-url-canon-2026-11-16.md`](./city-region-place-url-canon-2026-11-16.md).

## 1. Domain model

| Entity | Stable identity | Public page responsibility | Identity must not depend on |
| --- | --- | --- | --- |
| City | Destination ID + reviewed slug | City guide, city events and city places | Current event/venue count or supplier |
| Region | Destination ID + reviewed slug | Regional guide and its settlements | A city having a sales contract |
| Place | Venue ID + stable public slug | Informational PDP; sales/events are optional modules | Place taxonomy, sales availability or supplier slug |
| Event | EventPage ID + stable event slug | Editorial event/show page aggregating exact linked Event IDs and available sessions | A particular slot/session ID |
| Event / slot | Provider Event ID / session ID | Offer, schedule and purchase data attached to EventPage | Owning a separate editorial URL by default |
| Collection | Editorial Landing ID + slug | Curated selection, optionally city-scoped | An inferred event category |
| Article | Article ID + slug | Editorial article | City/type aliases unless explicitly authored |

Changing the classification of a place or event changes its catalog membership,
not its stable PDP URL. A page can remain informational and accessible when it
has no active sales. Editorial publication controls indexation; supplier sync
does not publish a page by itself.

## 2. Canonical public URL matrix

| Surface | Current URL family | Target canonical URL | Indexation / ownership rule |
| --- | --- | --- | --- |
| Home | `/` | `/` | Indexable; fixed route |
| City directory | `/cities` | `/cities` | Indexable directory of cities; links to the separate `/regions` directory |
| Region directory | Not consistently exposed | `/regions` | Indexable; lists published regional hubs |
| Region PDP | `/cities/{region}` | `/regions/{region}` | Published regional editorial page only; old route redirects by exact destination type |
| City PDP | `/cities/{city}` | `/{city}` | Published city editorial page only; root slug must pass collision registry |
| Global places catalog | `/places` | `/places` | Indexable national catalog |
| Global place-type catalog | No settled path | `/places/{type}` | Only one registered type slug; index after catalog eligibility checks |
| City places catalog | `/places/c/{city}` | `/{city}/places` | Published city route; all public non-hidden place records for that city |
| City × place type | No settled path | `/{city}/{type}` | Only registered type + registered city; see the 0/1–2/3+ rule below |
| Place PDP | `/venues/{slug}` or `/locations/{slug}` | Same family with stable public slug | Keep current family unless an individual reviewed redirect migrates it; slug does not depend on type |
| National event catalog | `/events` (city filters may use query parameters) | `/events` | Keep current route and preserve EventPage-focused catalog behavior |
| Event PDP | `/events/{slug}` (legacy slot/Event URLs also exist) | `/events/{event-page-slug}` | Canonical editorial page; aggregate only explicitly linked Event IDs and their sessions |
| City event catalog | Event catalog with city filter | `/{city}/events` | City listing of EventPages; Event PDPs stay under `/events/` |
| Event category landing | Existing authored top-level and category × city landing URLs | Existing reviewed landing URL | Separate from place types; preserve exact authored URLs unless an explicit reviewed map migrates them |
| National collection directory | `/podborki` | `/podborki` | Indexable editorial directory |
| Collection PDP | `/podborki/{slug}` | `/podborki/{slug}` | Editorially authored |
| City collections directory/PDP | Existing `/podborki/.../{city}` patterns | `/{city}/podborki` and `/{city}/podborki/{slug}` | Only authored city collections; old paths migrate by an explicit map |
| Blog directory | `/blog` | `/blog` | Indexable editorial directory |
| Article PDP | `/blog/{slug}` | `/blog/{slug}` | Stable article route |
| Search | `/search` | `/search` | `noindex, follow`; event results link to EventPages, never slot URLs |
| User tools | `/my-day`, `/favorites`, `/account/...` | Same fixed routes | `noindex, follow` unless a separately designed public share page exists |
| Checkout / auth / API | Existing fixed paths | Same fixed routes | Never treated as destination, type or landing routes |

### Registered place-type slugs

The only canonical type slugs are:

| Slug | Label | Membership predicate over place taxonomy |
| --- | --- | --- |
| `museums` | Музеи и галереи | `MUSEUM` (`museum`, `gallery`); reviewed legacy museum/gallery kinds |
| `theatres` | Театры | `THEATRE` (`theatre`); reviewed legacy theatre kinds |
| `concert-halls` | Концертные залы и филармонии | `THEATRE` (`concert_hall`, `philharmonic`) or `VENUE` (`concert_hall`); reviewed legacy concert-hall kind |
| `parks` | Парки и сады | `NATURE` (`park`, `garden`); reviewed legacy park kind |
| `landmarks` | Достопримечательности | `ARCHITECTURE` or `MONUMENT`; `URBAN` (`square`) and `ENTERTAINMENT` (`observation_deck`) when editorially classified as landmarks |
| `temples` | Храмы и монастыри | `RELIGION` and approved subtypes |
| `art-spaces` | Арт-пространства и лофты | `MUSEUM` (`gallery`) or `VENUE` (`exhibition_hall`); reviewed legacy art-space kind |
| `bar-restaurants` | Бары и рестораны | `FOOD` (`restaurant`, `cafe`, `bar`) plus reviewed legacy gastro/bar kinds; legacy `CLUB_BAR_RESTAURANT` is a temporary broad fallback |
| `venues` | Банкетные и событийные площадки | `VENUE` and approved event-space subtypes; reviewed legacy venue kind |
| `entertainment` | Развлечения и семейный отдых | `ENTERTAINMENT` and approved subtypes |
| `walks` | Набережные и места для прогулок | `URBAN` (`square`, `street`, `embankment`, `district`) and approved outdoor-walk records |
| `transport` | Причалы и точки отправления | `TRANSPORT` and approved subtypes; reviewed legacy pier/meeting-point kinds |
| `clubs` | Клубы | `VENUE` + explicitly reviewed `club` subtype; legacy `club_bar_restaurant` alone is not sufficient |

This is a catalog taxonomy, so membership can overlap: for example, a gallery
can appear in both `museums` and `art-spaces`, and a concert hall can appear in
both `theatres` and `concert-halls`. Membership is explicit editorial taxonomy,
not a title-only guess. This catalog type does not change a place's primary
`placeType`, PDP URL or primary breadcrumb.

`clubs` is a separately registered catalog facet, not a new Prisma
`PlaceType`: it selects reviewed `placeType=VENUE, placeSubtype=club` records.
The legacy supplier kind `CLUB_BAR_RESTAURANT` is shared by clubs, bars and
restaurants; it remains a temporary fallback in `bar-restaurants` while those
rows are reviewed and must not infer membership in `clubs`. If a record has an
explicit `placeType`, that editorial taxonomy takes precedence over its legacy
supplier kind for catalog filtering. The `bar-restaurants` facet unions the
approved Food subtypes (`restaurant`, `cafe`, `bar`) with that legacy fallback.
Subtype-specific pages and counts use the same server-side predicate.

The route registry and API filters must use the exact predicates in
[`place-city-type-filter-map-2026-11-17.md`](./place-city-type-filter-map-2026-11-17.md).
The public Places API accepts a union of reviewed subtype and legacy type
fallbacks, with an explicit `placeType` taking priority over legacy supplier
kind. Type route counts and indexability must come from the exact filtered API
result, not a sum of overlapping parent and subtype counters.
Legacy `/places/institution` and `/places/location` family facets are reserved
paths and remain available until a separate migration decision; they are not
aliases for the 12 parent PlaceType values or their separately registered
editorial catalog facets.

For national type catalogs, use the same minimum inventory rule as city types:
0 places → 404; 1–2 → `noindex, follow` and canonical `/places`; 3+ distinct
public places → eligible for indexation and self-canonical. Editorial content
and actual public PDP targets are still required for sitemap inclusion.

### City × type eligibility

- **0 public, non-hidden places:** 404; no category link and no sitemap entry.
- **1–2:** 200, `noindex, follow`, canonical to `/{city}/places`; may remain
  available as a user filter.
- **3 or more:** eligible for `index, follow`, self-canonical and sitemap only
  when the city hub is published and the listing has real public PDP targets.
- Page 1 is the listing URL. Pagination and query filters are not separate
  index targets; they must not generate competing canonicals.

The threshold is based on distinct active public places after duplicate and
hidden records are removed, not on event slots, offers, or raw imported rows.

## 3. Route ownership and precedence

1. Fixed application paths own their names first: `/events`, `/places`,
   `/cities`, `/regions`, `/venues`, `/locations`, `/podborki`, `/blog`,
   account, checkout, support, API, and static utility pages.
2. `/{city}` resolves only when the exact slug belongs to a published city PDP.
   Destination rows alone do not claim or publish root URLs.
3. `/regions/{region}` resolves only a published region PDP; region slugs do not
   claim root paths.
4. `/{city}/events`, `/{city}/places`, and `/{city}/{type}` resolve only for a
   registered/published city and the exact fixed subsection/type registry.
   `/{city}/podborki` and `/{city}/podborki/{slug}` are similarly reserved for
   authored city collection pages.
5. Any other one-, two- or three-segment route continues through the existing authored landing
   resolver. This preserves routes such as `/moscow/moscow-museums` and
   `/saint-petersburg/night-bridges`.
6. Unknown or unpublished slugs return 404. They must not silently become a
   city, region, type catalog, or indexable generic landing.

City slugs are checked case-insensitively against fixed routes, published
landing slugs, registered type names, and other destination slugs before
publication. Collisions require a reviewed alternate slug/alias; no route may
be selected by whichever dynamic handler happens to match first.

The public city slugs for Нижний Новгород and Великий Новгород are
`nizhny-novgorod` and `veliky-novgorod`. The production destination API
currently uses `nizhniy-novgorod` and `velikiy-novgorod`; those are data lookup
aliases, not public URL spellings. City and city-place routes using the API
spellings must permanently redirect in one hop to the reviewed public slug.
This alias rule is scoped to city routes and must not rewrite event PDPs,
articles, or category landings whose own slugs contain those words.

Region PDPs may cover the region and its significant suburbs/settlements.
Listing a suburb on a region page does not publish a separate city PDP; it gets
its own `/{city}` route only after editorial publication and a collision check.

## 4. Canonical, robots and sitemap rules

- Canonical tags use the HTTPS canonical host and the one selected route from
  this matrix. Query state, sorting, filters and pagination must not create
  duplicate indexable documents.
- City, region, place and collection pages enter sitemaps only after their
  editorial publication/indexation gate passes. A raw imported destination or
  place candidate does not qualify automatically.
- Place PDP indexation is independent from sales: a published editorial PDP may
  be indexed with or without active offers; an imported candidate remains
  accessible but `noindex` until editorial publication.
- Event PDP indexation is independent from a specific slot URL. A passed event
  can remain useful as a seasonal/recurring EventPage under its lifecycle
  policy; slot-level URLs are not canonical event pages.
- Search parameters and internal UI state do not enter sitemaps.
- Existing event-category landing URLs are not reclassified as place-type
  routes, even when a word such as `planetarium` or `museum` appears in them.
- Breadcrumbs reflect the entity hierarchy, but breadcrumbs do not define URL
  ownership.

## 5. Legacy URL and redirect policy

Adding the new route family and migrating existing URLs are separate releases.
First verify new pages and their canonicals on staging. Then enable only
reviewed, one-hop permanent redirects:

| Current URL | Target URL | Migration rule |
| --- | --- | --- |
| `/cities/{city}` | `/{city}` | Exact destination match; published city only |
| `/cities/{region}` | `/regions/{region}` | Exact destination type must be `region` |
| `/places/c/{city}` | `/{city}/places` | Exact city match |
| Old slot/Event URL | `/events/{event-page-slug}` | Exact Event ID link to a published EventPage only |
| Old place slug/family | Reviewed place PDP URL | Per-place alias only; never infer from title/type |

Every redirect map must be generated from current production URLs, reviewed for
collisions and checked for loops/chains. Keep old URLs resolving through a
single redirect after cutover. Do not change `/events` or `/events/{slug}` as
part of the city/place migration.

## 6. Inventory is not publication

The production destination API currently contains 69 cities and 24 regions.
The sitemap audit found 51 current city hub URLs, 15 region hub URLs, and 51
city-place catalog URLs. The remaining 18 cities and 9 regions stay out of the
public route registry until their PDPs are editorially ready. Exact current
URL-to-target pairs and the 93-row inventory are recorded in the linked
city/region audit document and CSVs.

## 7. Rollout gates

1. Keep this matrix and the reviewed production URL map as the route source of
   truth.
2. Implement behind a preview/staging-only feature flag; do not change
   production canonicals or redirects during route development.
3. Check representative paths for every family, type, 0/1–2/3+ inventory
   boundary, collision, unpublished destination, and event route.
4. Compare generated sitemap and canonical URLs against the reviewed map.
5. Switch sitemap/canonicals and redirects only after parity passes; preserve a
   rollback path to the previous release and aliases.
