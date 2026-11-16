# EventPage workflow audit - 2026-11-15

Read-only source audit on `codex/city-pdp-editorial` at `68edb0d8c`. No event data, links, routes, status, or production/staging settings were changed.

## Confirmed in code

| Area | Current behavior | Evidence |
| --- | --- | --- |
| Create EventPage | Admin endpoint creates a draft, allocates a collision-safe slug, candidate route, explicit Event ID links, and first revision in one DB transaction. | `apps/backend/src/server.js` (`POST /api/admin/event-pages`); `apps/backend/src/event-pages.js` (`createAdminEventPage`) |
| Attach many Event IDs | Batch endpoint accepts up to 5,000 IDs, inserts in SQL chunks of 500, is idempotent for IDs already on that page, and rejects IDs owned by another page atomically. | `appendAdminEventPageEventsBatch`; route `POST /api/admin/event-pages/:id/events/batch` |
| Batch safety | Public API path does not allow edits after publication; trusted sync call sites can explicitly opt in. | `appendAdminEventPageEventsBatch(..., { allowPublished = false })` |
| Edit/review/publish | Draft updates get revisions. Publishing requires READY and editorial text, then records `publishedAt`; public readers expose only READY pages with `publishedAt`. Indexability remains a separate flag. | `updateAdminEventPage`, `publishAdminEventPage`, `readPublishedEventPageForEvent` |
| Undo/change history | Revision snapshots include source state and links; explicit move/split operations exist for Event IDs. | `appendPageRevision`, `moveAdminEventPageEvent`, `splitAdminEventPageEvent` |
| Sync grouping | The Ticketscloud path may append siblings based on source `metaExternalId` and city when the source identity is unambiguous; ambiguous identity creates a separate draft for review. This is not a title-only merge. | `event-pages.js`, sync auto-provisioning path around `metaExternalId` |

## Confirmed gap

Supplier event change requests support the `CREATE` request shape, but applying a `CREATE` request is deliberately disabled and returns HTTP 501. The admin DTO also marks CREATE requests as not applicable. A supplier therefore cannot submit a new event and have the request create a saleable Event/slots through the current apply flow. This is separate from creating an EventPage from already imported Event IDs.

Evidence: `apps/backend/src/event-change-request-applier.ts` (`EVENT_CHANGE_CREATE_UNSUPPORTED`), `apps/backend/src/admin-event-change-requests.dto.ts` (`canApply` excludes CREATE).

## Verification limits

The create/edit/publish SQL paths were source-audited, while the isolated tests exercise policy and admin city/region handlers. Full EventPage database integration was not run because no local DB is available. Do not treat this audit as a staging or production acceptance.

## Next implementation decisions

1. Keep EventPage as the canonical editorial page, with one or more inventory Event IDs attached; do not duplicate rewrites onto each Event ID.
2. Keep the 5,000/500 chunk mechanism and verify it with an isolated PostgreSQL integration test before using a >500-ID production batch.
3. If supplier-created events are in scope for closing event PDP workflow, implement and test `CREATE` apply separately, including provider identity, schedule/session construction, duplicate protection, and rollback. Do not enable it by removing the 501 guard alone.
4. Finish the public/admin UI integration owned by the frontend workstream, then exercise examples with sales and without sales on isolated staging.
