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

The migration is additive and creates no EventPage rows. Existing event routes,
old URLs, canonicals, sitemap, fallback lookup, ticket widgets, and indexing
remain unchanged. New rows default to `DRAFT` and `isIndexable=false`. The
public event DTO may expose editorial content only after an authenticated admin
explicitly publishes a `READY` EventPage (`publishedAt` is set); it is then
rendered on the existing Event URL for its explicitly linked Event. Publication
does not create a route, change canonical/robots/sitemap, or remove the legacy
fallback for Events without a published EventPage. If a published page is moved
back to `DRAFT` or `REVIEW`, the public text is withdrawn and the legacy
description is used again. Do not infer a multi-Event page from title
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
- `POST /api/admin/event-pages/:id/publish` publishes only a `READY` page with
  editorial text. This affects the rendered text on the existing Event route;
  it does not enable EventPage indexing or route/canonical/sitemap changes.
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

These endpoints require the existing admin authentication. The additive
EventPage migration and public runtime are deployed on production. Drafts remain
private; only explicit publication exposes their text on the existing Event URL.

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
single-Event copy records. The original local check found 0 target Event IDs in
`127.0.0.1:5437/daibilet_baseline`; this was a different catalog snapshot from
production. A later read-only production API check returned exact Event IDs for
20 records, 404 for 1, and 429 for 6 (retry needed). Four records are marked
`review_required`. No staging payload was posted and no EventPage draft was
created. Do not attach a rewrite to a different Event by title similarity.

## Local development status

The six migration files already recorded by `daibilet_baseline` were restored
from their original Git commits. `20261027120000_event_pages` was applied to
local `daibilet_baseline` and production `daibilet`; the production deploy
completed at commit `024172154`.

The existing `/admin/events/:id` workbench now has a **Подробности** tab. It can
create a single-Event draft, edit page title/slug/SEO and content, preview the
content on desktop/mobile, save immutable revisions, and explicitly publish a
READY text to the existing Event route. It seeds a new draft from an existing
single-Event PdpDocument when one exists. Source description is shown as
read-only provenance; the legacy EventOverride is a collapsed transition
reference, while EventPage is the sole new rewrite editor. After publication,
the EventPage text replaces the public description and old Event PdpDocument
sections/media are not rendered as a second content source. Existing route,
canonical, sitemap, and event/ticket inventory remain unchanged.

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
editor behavior is connected to the public runtime after explicit publication.

### ID-free EventPage slug rule (2026-10-27)

New EventPage drafts now start with a candidate slug that removes a recognized
Ticketscloud 24-character source ID or a numeric Teplohod ID only when it
matches the internal `evt_tep_<id>` identity. The provider identity remains on
the Event/slot records. The EventPage slug is currently internal and does not
change the public URL, canonical, or sitemap.

A dry-run over the 27.10 event-sitemap snapshot found 4,250 matched records with
an active session and offer. Removing source IDs yields 219 candidate-slug
collision groups covering 809 Event IDs. Adding the city would still leave 89
groups covering 222 IDs. Therefore slug equality is not enough to merge records.
When separate drafts request the same candidate slug, allocate the first free
`-2`, `-3`, etc. suffix under a transaction lock and keep the Events separate.
The allocated suffix is stored and never renumbered. The admin can later review
whether exact slots belong on one EventPage. The 78 current sitemap URLs without
a catalog match are outside this current-sale drafting pass.

## Next implementation slice

1. Recheck the 6 HTTP 429 staged records. Keep the 1 API 404 and 4 `review_required`
   records out of production draft creation unless current-sale status and exact
   Event identity are verified.
2. Create private DRAFT pages only for exact, currently selling, single-Event
   records. Never publish them or change routes in the batch operation.
3. Add an explicit reviewed Event selector for multi-Event EventPages and report
   slug collisions before saving.
4. Switch sitemap/canonical/redirect behavior only after exact URL mapping,
   Search Console/Webmaster history, URL-level smoke, and rollback data are
   reviewed as a separate SEO release.
