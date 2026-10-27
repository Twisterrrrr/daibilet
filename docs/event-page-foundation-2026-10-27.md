# EventPage foundation - 2026-10-27

## What already exists

- `/events/[slug]` is a public page backed by a catalog `Event`.
- `EventSession` holds dated sessions; `EventOffer` holds ticket/price options.
- `PdpDocument` stores optional editorial sections for one Event or Venue. It is
  not a stable page identity and cannot own multiple Events.
- The public DTO currently has legacy grouping paths through Ticketscloud
  `metaExternalId` and admin `EventOverride.mergeGroupKey`. Those are runtime
  grouping rules, not an editorially reviewed page-to-inventory mapping.

## New additive data model

- `EventPage` is the stable editorial identity and stores page-level title,
  summary, structured content, SEO fields, draft/publication state, and indexing
  intent.
- `EventPageEvent` connects one or more catalog Events to the page. Each Event
  can be assigned to at most one EventPage. Sessions, offers, supplier and
  booking integrations remain on their existing Event records.
- `EventPageRoute` records candidate, current, or historical paths for later
  reviewed URL mapping. It is storage only; it does not redirect, change
  canonical tags, or publish sitemap entries.
- `EventPageRevision` stores immutable page-content snapshots. `sourceSnapshot`
  on the membership row preserves the source Event data used while composing a
  page, so a rewrite or later provider sync cannot silently erase provenance.

## Safe rollout contract

The migration is additive and creates no EventPage rows. Existing event pages,
old URLs, canonicals, sitemap, fallback lookup, ticket widgets, and indexing
remain unchanged. New rows default to `DRAFT` and `isIndexable=false`; a future
sync/backfill workflow must explicitly create a page and apply the agreed
availability/indexing policy. Do not infer a multi-Event page from title
similarity, supplier identity, or a provider meta id alone.

Before any route switch, build the owner-reviewed URL map from current sitemap
and Search Console/Webmaster history. Preserve standalone events and old paths;
only map siblings to a shared EventPage after confirming they are sessions or
city variants of the same event. Until that review is complete, route records
are inert and existing SEO behavior stays in place.

## Admin API available after migration

The backend has authenticated admin endpoints for the foundation:

- `POST /api/admin/event-pages` creates a draft/non-indexable page and links
  1-50 explicit Event ids. It captures a source snapshot for each linked Event
  and stores revision 1.
- `GET /api/admin/event-pages/:id` reads the page, linked Events, route records,
  and revision history.
- `GET /api/admin/event-pages/by-event/:eventId` looks up the page for an Event.
- `PUT /api/admin/event-pages/:id` saves editorial fields and appends an
  immutable content revision. It cannot publish or turn indexing on.
- `PUT /api/admin/event-pages/:id/events` replaces the linked Event set
  transactionally and records the new source snapshot as a revision.
- `POST /api/admin/event-pages/:id/routes` stores a candidate/current/historical
  path record. Candidate entries must include a source such as Search Console.
- `DELETE /api/admin/event-pages/:id/routes/:routeId` removes a route from the
  active mapping and keeps the removed value in revision history.

Example create body:

```json
{
  "slug": "artist-tour",
  "title": "Artist - tour dates",
  "summary": "Editorial summary",
  "content": { "sections": [], "sources": [] },
  "eventIds": ["event-id-1", "event-id-2"],
  "seoH1": "Artist in Russian cities",
  "seoTitle": "Artist - tour dates | Daibilet",
  "seoDescription": "Verified page description",
  "changeNote": "Initial editorial draft"
}
```

These endpoints require the existing admin authentication and the additive
EventPage migration to be applied. They do not change the public runtime.

## For ongoing rewrites

The existing `/api/admin/pdp/events/:id` remains available for existing
single-Event editorial documents. Rewriters can now save stable page drafts
through the EventPage API once the migration is applied. Keep source and final
copy in versioned source files as the review record. Do not attach a rewrite to
a guessed multi-Event group. Once mapping is approved, create an EventPage and
snapshot the rewritten content there; original Event description and source
snapshots remain intact.

### Editorial staging check (2026-10-27)

`data/editorial/eventpage-draft-staging-2026-10-27.json` contains 27 staged
single-Event copy records. A read-only check against local
`127.0.0.1:5437/daibilet_baseline` found 0 of those Event IDs and 0 exact-title
matches; the database currently has 0 EventPage rows. No staging payload was
posted to the API and no production write was made. Editors may continue
preparing copy in the staging file, but must not attach it to another local
Event by title similarity. Resume API attachment only after the intended
catalog snapshot contains the exact IDs, or after a verified ID map is reviewed.

## Local development status

The six migration files already recorded by `daibilet_baseline` were restored
from their original Git commits. `20261027120000_event_pages` was then applied
to local `daibilet_baseline`; Prisma reports the database up to date. No
production database was touched.

The existing `/admin/events/:id` workbench now has a **Подробности** tab. It can
create a single-Event draft, edit page title/slug/SEO and content, preview the
content on desktop/mobile, and save immutable revisions. It seeds a new draft
from an existing single-Event PdpDocument when one exists. The tab explicitly
shows that public URL and indexing have not changed.

The same workbench also has a **Продажи** tab. It loads on demand and filters
orders server-side by this Event ID in both the catalog API and the separate
finance API. Channel and status filters remain in the event card URL; order
detail links return to the same event-scoped selection. If either API fails,
the tab shows an explicit source error instead of a false zero. The admin orders
registry accepts the same `eventId` filter. No cross-database reads were added.

The EventPage editor supports manually added **context blocks** for the event:
each has an H3 heading and text field, can be removed or moved in the editorial
order, and is placed after the main event description. In preview, the dynamic
"Практическая информация" block is shown below them as a separate, read-only
placeholder; dates and prices remain sourced from catalog/session data. This is
editor and preview behavior only until EventPage is connected to public runtime.

## Next implementation slice

1. Add an EventPage event selector in the tab for reviewed multi-Event pages.
2. Build a dry-run sync/backfill that creates one page per eligible Event and
   reports missing/duplicate slugs without changing public routes.
3. Join EventPage to existing public DTO only after exact URL mapping and
   PDP rendering behavior are approved.
4. Switch sitemap/canonical/redirect behavior as a separate SEO release with
   URL-level smoke and rollback data.
