# City and region PDP editorial API

This is the backend contract for the city/region editorial tabs. The editor stores a draft separately from the public destination read model. Existing `City` text/SEO fields are returned as `owner.legacyDraft` so the first edit can preserve and import them; reading does not create a document or change the public page.

## Routes

All routes require the existing `/api/admin` Basic Auth.

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/admin/destinations/regions` | List persisted regions with child-city count and PDP status |
| `POST` | `/api/admin/destinations/regions` | Create a Region record with a normalized slug |
| `GET` | `/api/admin/destinations/cities/:cityId/pdp` | Owner metadata, existing legacy fields, draft/published document, last 20 revisions, readiness |
| `PATCH` | `/api/admin/destinations/cities/:cityId/pdp` | Save an editorial draft and immutable revision |
| `POST` | `/api/admin/destinations/cities/:cityId/pdp/status` | Move through editorial review states |
| `POST` | `/api/admin/destinations/cities/:cityId/pdp/publish` | Publish a READY snapshot; indexing is explicit and defaults off |
| Same | `/api/admin/destinations/regions/:regionId/pdp...` | Same operations for a region |

`PATCH` accepts `summary`, `heroImageUrl`, `seoH1`, `seoTitle`, `seoDescription`, `canonicalPath`, structured `content`, and optional `changeNote`. Content supports intro, must-see places, sights, significant suburbs, region highlights, routes, practical travel text, FAQ, gallery/media credits, and source references. Each field is validated by the shared `@daibilet/contracts/city-pdp` schema.

`GET /api/public/cities/:slug` now includes `city.pdp` only when a valid published snapshot exists, along with its editorial hero/SEO fields. Saving a newer draft does not replace the published snapshot. Hidden records are omitted and set `city.isIndexable=false`. The public city builder can resolve a persisted City or Region row directly by slug/ID even when there are no catalogue sessions. The web route still needs to render the structured `city.pdp.content` tabs/blocks; backend support alone does not finish the visual PDP.

## Publication rules

- New documents begin as `DRAFT`; GET is read-only.
- Saving an edited READY/PUBLISHED/HIDDEN item moves it to `REVIEW` while preserving the previous `publishedContent` snapshot.
- `DRAFT → REVIEW → READY → PUBLISHED`; edits require review again. Published pages can be hidden; hidden pages can return to draft/review.
- READY and publish require an intro title and text, at least one structured content block, and at least one source.
- `isIndexable` is false by default and only changes at publish. Hiding always disables indexability.
- Publishing invalidates public caches; the public API serves the snapshot, while the web template still needs to render it.
- `DestinationPdpRevision` records each save/status/publish operation with the document version and snapshot. Actor attribution can be added when the admin auth layer exposes a stable actor id.

The migration is additive and has not been applied to local, staging, or production databases.

## Frontend integration still required

This audit was performed against the current `feat/next-monorepo` frontend files. No frontend files were changed in this backend-owned branch.

### Admin editor

- `apps/web/app/(admin)/admin/cities/[id]/page.tsx` currently edits only the basic City record: name, slug, source title, intro, hero URL, SEO, canonical, and destination flag.
- `apps/web/src/server/admin-city-actions.ts` saves those legacy fields through `PATCH /api/admin/cities/:id`; it is not connected to the new editorial document API.
- `apps/web/src/server/admin-cities-data.ts` loads only the legacy city detail. Add server actions/data loaders for the `/api/admin/destinations/.../pdp` endpoints and build tabs for overview, sights/must-see, routes/suburbs, media, sources, SEO, preview, and publication status.
- Add a region list/create/editor flow using `GET/POST /api/admin/destinations/regions` and region PDP endpoints. The existing city list must remain a place to find a City record, not a substitute for Region editing.
- Preserve the preview/publish boundary: admin preview may render the draft returned by the admin GET; public routes must continue to read the published snapshot only.

### Public render and SEO

- `apps/web/src/components/CityPageViewEditorial.client.tsx` currently wraps the existing generic `CityPageView`; it does not render `city.pdp.content`.
- `apps/web/src/components/CityPageView.client.tsx` has no editorial PDP content renderer yet. Add structured blocks and media using the shared `DestinationPdpContent` contract, without replacing live catalogue sessions/counts with editorial snapshots.
- `apps/web/src/components/RegionPageView.client.tsx` already consumes a limited `regionInfo` shape (brief, top places, FAQ). Extend or replace that mapping for must-see, significant suburbs, routes, travel text, and gallery while retaining live catalogue/schedule data.
- `apps/web/app/cities/[slug]/page.tsx` currently builds metadata from top-level city fields and existing indexability rules. Before enabling indexing, verify that published snapshot SEO/canonical and `pdp.isIndexable` affect SSR metadata, robots, canonical, sitemap inclusion, and JSON-LD consistently.
- Public cache invalidation already happens on admin save/status/publish in the backend. Verify the Next cache tag/path invalidation used by the frontend and ensure published updates are visible without stale hub payloads.

### Media and acceptance

- The API accepts local or HTTP(S) media URLs plus `alt`, caption, credit, and source URL; it does not upload files. The UI should use the approved image asset workflow and require attribution/source where applicable.
- A real city PDP cannot be accepted until the additive migration is applied to an isolated database, the page is authored through the admin UI, the admin preview matches the public published render, and robots/canonical/sitemap are checked. Do not apply this migration to the dirty shared staging checkout.

### Destination routing: Vyborg example

- Vyborg remains a child destination of the Leningrad Oblast hub until its own city hub is fully authored and accepted. Do not create or expose a thin standalone `/cities/vyborg` page ahead of that work.
- Once the Vyborg PDP is ready, discovery links can point directly to it. The Oblast page remains a distinct regional hub; its Vyborg child filter can remain available for regional event browsing.
- Do not model the city of Vyborg itself as a `Region`. Use the city destination for Vyborg; reserve Region for a multi-city geographic hub.
