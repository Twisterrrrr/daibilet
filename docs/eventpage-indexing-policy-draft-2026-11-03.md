# EventPage indexing policy (draft) — 2026-11-03

This is a policy proposal for review. It does **not** change public routes,
canonical tags, robots metadata, redirects, or sitemap membership.

## Core rule

An EventPage is the stable public identity for an event or a deliberately
reviewed group of event records. A slot/session is inventory attached to that
identity, not its own search landing page. URL stability and indexability are
separate decisions: a page can keep returning HTTP 200 while it is `noindex`.

## Index when all identity/content checks pass

- The page represents one verified event identity, or an explicitly reviewed
  tour/recurrence grouping. Similar titles, same supplier, or provider group IDs
  alone are not enough to merge records.
- The page has useful, non-duplicated public content: a clear title, city/place
  facts where known, an informative description or editorial sections, and a
  correct purchase/availability state. A ticket widget alone is not content.
- The page has a stable clean EventPage URL and a single intended canonical.
- It is public (not draft/private) and has no explicit editorial `noindex`.
- It has current/future inventory **or** a deliberate keep-alive reason (for
  example, a recurring/seasonal event expected to return, or proven historical
  organic demand/backlinks).

`Needs editing` is an editorial queue state, not by itself a reason to hide a
currently useful event page from users or search. If the current source record
is too thin or identity is uncertain, keep it reachable for users as needed,
but use `noindex` until reviewed.

## Keep reachable, but do not index

- Draft, private, or unpublished EventPages.
- Ambiguous/duplicate candidates awaiting identity review.
- Search, filter, sort, pagination, and other parameterized catalog states;
  these should not create indexable variants of an EventPage.
- Thin records with no useful facts beyond a title and a purchase link.
- Slot-specific URLs once a verified EventPage mapping exists. Before the
  mapping is complete, preserve their current response/fallback; do not
  blanket-noindex or redirect the legacy URL set.
- Pages explicitly marked `noindex` by an editor after review.

## After the last slot ends

- Do not return 404 merely because inventory ended. Keep the stable EventPage
  at HTTP 200 and show that the date/season has ended, with relevant alternatives
  and a way to find future dates if they become available.
- For recurring or seasonal events, evaluate future availability and evidence
  of recurrence/demand, not the current month. Keep indexability when the page
  remains a useful destination and is expected to return.
- For a one-off event, retain its URL and useful historical content. Decide
  `index` vs `noindex` from content quality and search value; never manufacture
  replacement slots or restore a past event just to avoid a 404.

## URL transition safeguards

- New internal links should point to the EventPage URL only when that route
  resolves publicly. Until then, keep the working legacy event URL.
- Keep old slot/event URLs as fallback aliases while the URL correspondence map
  is incomplete. After exact mapping, redirect only verified aliases (301/308
  as a separate SEO release); unknown historical URLs remain untouched.
- Sitemap should contain only canonical, indexable EventPages, never every
  ticket slot. Change sitemap/canonical/robots together only after the current
  sitemap, Search Console and Webmaster URL history, route resolution, and
  rollback list have been checked.

## Current implementation gap

The public `/events/[slug]` route now resolves a published EventPage slug and
catalog links can use it when the page is published. Its canonical remains the
legacy Event path until the separate URL-map release gate. A stable EventPage
URL is `noindex,follow` unless its own `isIndexable` flag is explicitly true;
legacy URL robots behavior is unchanged during this transition. The sitemap is
still based on catalog Event records. Therefore this proposal is only partly
enforced and is not yet the final SEO cutover.

## Release gate

Before enabling this policy in production, implement and verify:

1. Public lookup by published EventPage slug, with legacy Event URL fallback.
2. Public DTO fields for stable EventPage URL and an explicit indexability
   decision/reason.
3. Persistent HTTP 200 rendering when a page has no saleable sessions, without
   restoring old inventory.
4. Consistent canonical/robots/sitemap output and noindex for query variants.
5. Exact legacy URL mapping, including Search Console and Yandex Webmaster
   URL-level history, plus rollback data.
6. Smoke checks for current sale, ended one-off, seasonal event, duplicate
   candidate, unknown old URL, and an imported event after sync.
