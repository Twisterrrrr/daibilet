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
EventPage migration and editor/public-text runtime on existing Event URLs are
deployed on production. The stable-slug resolver and automatic sync provisioning
described below are local implementation changes and are not deployed yet.
Draft copy remains private; only explicit publication exposes its text.

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

### EventPage slug rule (2026-10-27)

New EventPage drafts start with a candidate slug that removes a recognized
Ticketscloud 24-character source ID or a numeric Teplohod ID only when it
matches the internal `evt_tep_<id>` identity. For a single-Event page, creation
appends the transliterated catalog city name (for example `-ufa` or `-perm`) unless it is
already present. A same-city collision gets the first free `-2`, `-3`, etc.
suffix; existing allocations are never renumbered. A multi-Event page does not
get a city suffix because it may cover multiple cities; its slug remains an
editor-reviewed choice. The provider identity remains on the Event/slot
records. These candidate slugs are internal and do not change public URLs,
canonical tags, or sitemap.

A dry-run over the 27.10 event-sitemap snapshot found 4,250 matched records with
an active session and offer. Removing source IDs yields 219 candidate-slug
collision groups covering 809 Event IDs. Adding the city would still leave 89
groups covering 222 IDs. Therefore slug equality is not enough to merge records.
The admin can later review whether exact slots belong on one EventPage. The 78
current sitemap URLs without a catalog match are outside this current-sale
drafting pass.

## Stable public-route gap closure (2026-11-02)

The earlier foundation left a gap: EventPage rows had no public slug resolver,
and provider sync did not provision a shell. The implementation now adds a
read-only public lookup by EventPage slug and makes that path load the linked
catalog Event DTO. Candidate DRAFT routes therefore render current event and
purchase data without exposing draft editorial copy. The metadata stays
`noindex,follow` until the page is explicitly publishable and indexable.

Ticketscloud and Teplohod imports now provision one DRAFT EventPage per
currently saleable Event when the additive tables exist. This is idempotent,
does not group Events, and ignores events with no active offer/saleable future
session. Candidate slugs strip only a provider identity suffix that matches
the Event's internal ID; city suffixes and `-2`, `-3` collision allocation
remain in the existing admin creation path. Sync stats report created,
existing, skipped, and schema-unavailable counts. No import should restore a
past event or activate the source system's finance flow. Public event API misses
are no longer retained in the process cache, so a 404 seen before a separate
catalog sync cannot hide a newly provisioned route for the cache TTL.

This closes stable page provisioning and route resolution. It does not change
canonical tags, robots policy for legacy slot URLs, sitemap membership, or
redirects. Blog href updates require a confirmed EventPage mapping for each
target; historical/past Events remain excluded from the current-sale batch.
Keep the 78 unresolved historical URLs and all existing legacy fallback
behavior unchanged until the owner-reviewed URL map is ready.

### Current-sale provisioning and link delivery (2026-11-02)

`scripts/provision-current-event-pages.mjs` performs an idempotent local
backfill. It refuses non-local database hosts, defaults to dry-run, and requires
`--apply` to create private DRAFT shells. Eligibility is the same as provider
sync (active offer plus an active future/current session or valid open-date
window); `evt_stub_*` fixtures are excluded. On `daibilet_baseline`, dry-run
found 50 current saleable Events and `--apply` created 50 private shells. None
was published or made indexable. Production was not changed.

Header search now resolves `EventPageEvent` by exact Event ID and returns the
stable `/events/{eventPage.slug}` href. It still uses the old event URL when a
page is not provisioned or the EventPage schema is absent during rollout; it
does not infer page membership from title, city, venue, or provider group id.

The EventPage admin view shows each linked Event's supplier/organizer, venue
name and address, and import source with external ID. Supplier, venue, address,
and external slot ID are review evidence only. The sole automatic grouping key
is an exact Ticketscloud `metaExternalId` within the same city, and only when it
resolves to one unambiguous EventPage; cross-city tour dates are not joined.
New candidate slugs use the readable event name plus city; a provider token is
removed only when it matches that Event's identity. Same-city slug collisions
receive `-2`, `-3`, etc. until an editor reviews whether records should share an
EventPage.

When all sessions on a stable EventPage have ended, keep the EventPage URL
returning HTTP 200. The page shows no stale ticket CTA or price and explains
that published sessions ended; related current events remain available. A
published/indexable seasonal EventPage stays indexable through the off-season.
New sessions attached to its existing EventPage restore the schedule and
purchase UI automatically. A newly imported Event with a new source ID is not
auto-merged by title: an editor must explicitly link it to the durable page.

The EventPage editor now provides a server-backed candidate search by event
title, city, venue, address, supplier, or source ID. It displays provenance and
allows explicit attach, move, or split with confirmation. Moving a slot from a
multi-Event page preserves its source page; moving from a single-Event page is
allowed only for a provably untouched private sync shell. Splitting creates a
private draft and records enough history to move the Event back. The editor
also lists same-city Ticketscloud `metaExternalId` matches already attached
elsewhere; ambiguous matches stay separate until an operator reviews them.
Sync may group only when one exact Ticketscloud meta ID and city resolve to one
unambiguous existing EventPage. It does not merge across cities; tour dates stay
on separate city pages with matching page-level editorial content where an
editor chooses to reuse it.

The public CMS article response rewrites an event href only when its exact
legacy Event slug or canonical path maps to an EventPage. This makes rendered
article links use the stable page URL without editing the stored article text.
Unmatched links, including unresolved historical/past URLs, remain unchanged.
The same rule takes effect in production after this code is deployed and the
current-sale shell backfill has run against production data. It does not switch
canonical tags, sitemap entries, or redirects.

After the EventPage relation map is finalized, rebuild and reconcile
collections (landings): retain membership from currently saleable catalog
Events/sessions, but ensure each event card links to its EventPage rather than
an individual slot URL. Check city-specific and multi-city collections,
duplicates caused by grouping, and seasonal collections against future
saleable inventory for their city. Do not hide a collection based only on the
calendar month if future departures are available (for example winter boat
rides in Moscow or Saint Petersburg). This review does not itself change
collection canonicals or sitemap policy.

## Next implementation slice

1. Recheck the 6 HTTP 429 staged records. Keep the 1 API 404 and 4 `review_required`
   records out of production draft creation unless current-sale status and exact
   Event identity are verified.
2. Run a reviewed current-sale backfill for private DRAFT shells. Never publish
   them or change routes in the batch operation.
3. Update article links only where the target EventPage is confirmed; do not
   leave new article hrefs pointing at an individual slot URL.
4. Rebuild/reconcile collections after EventPage relations are finalized; verify
   event-card links, city/multi-city membership, grouped-slot duplicates and
   seasonal inventory before changing collection visibility.
5. Add an explicit reviewed Event selector for multi-Event EventPages and report
   slug collisions before saving.
6. Switch sitemap/canonical/redirect behavior only after exact URL mapping,
   Search Console/Webmaster history, URL-level smoke, and rollback data are
   reviewed as a separate SEO release.
