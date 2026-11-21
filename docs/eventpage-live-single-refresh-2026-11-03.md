# Live SINGLE EventPage triage refresh — 2026-11-03

Production read-only snapshot at 19:36 MSK. This refresh is newer than the initial single-event exports from earlier on 03.11; use it for the current live `SINGLE` pool. No EventPage rows, routes, canonical URLs, sitemap entries or redirects were changed.

## Current production counts

- `SINGLE` records in production: 14 870.
- `READY` records with an active offer and at least one current/future active, non-cancelled, non-archived dated session: 4 650.
- Offer/source mix: 4 641 Ticketscloud, 9 TEPLOHOD.
- No live candidate is linked to an EventPage yet.
- The 4 650 live candidates are bucketed in `eventpage-live-single-production-2026-11-03.csv`:
  - 1 622 `SIMPLE_CANDIDATE`: unique normalized title across all `SINGLE`, unique proposed EventPage slug within the live pool, and no obvious date/time token in the title.
  - 2 493 `REVIEW_REPEATED_TITLE`: normalized title repeats somewhere in the full `SINGLE` corpus; a repeated title can be a real series, a tour or separate products.
  - 31 `REVIEW_SLUG_COLLISION`: title is otherwise unique, but the candidate EventPage slug collides with another live record.
  - 504 `REVIEW_TITLE_HAS_DATE_OR_TIME`: title contains a date/time/year pattern. This is a review signal, not proof that two records are the same product.

Buckets are assigned in that order, so each Event ID appears exactly once. The date/title check is deliberately conservative and heuristic. `SIMPLE_CANDIDATE` means a good first draft-page batch, not approval to publish or switch SEO URLs.

## Source identity limitation

For all 4 650 live candidates, the query found no linked internal `Supplier`/active `SupplierEvent` and no `EventSourceLink.metaExternalId`. The import path persists Ticketscloud provider metadata separately, but it does not currently connect organizer/seller identity to an internal Daibilet supplier record. Do not use missing supplier linkage or `metaExternalId` as evidence that two cards are unrelated; repeated/date-bearing groups still need source/program review.

## Staging limitation

Staging runs the audit script, but it is not a production mirror for this catalog snapshot: the four sample Event IDs checked from the refreshed candidate pool were absent in staging. Do not use staging counts to accept or reject production EventPage mappings. For data-level staging, seed a small sanitized fixture from the chosen production case or refresh only the necessary catalog rows; do not copy orders or buyer data.

## Next sequence

1. Review a small sample from `SIMPLE_CANDIDATE` and verify the draft EventPage flow on sanitized staging fixtures.
2. Backfill draft EventPages only for the confirmed, no-collision batch; keep them non-indexable until text, venue/address, offer and URL mapping are checked.
3. Resolve repeated-title, date-bearing and slug-collision rows in the review queue; preserve separate city pages for confirmed tours.
4. Only after the Event ID → EventPage → old URL map is checked should canonical, sitemap and 301/308 behavior change.
