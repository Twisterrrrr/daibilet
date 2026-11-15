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
