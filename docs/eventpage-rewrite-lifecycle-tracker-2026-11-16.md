# EventPage rewrite lifecycle tracker — 2026-11-16

Production was queried read-only on 16 November 2026 at 15:39 MSK. The exported CSV has one row per EventPage (6,545 rows), including pages that have not been rewritten, so new editorial batches can be added and existing pages can be rechecked from the same ledger.

## Snapshot

| Measure | Pages / slots |
| --- | ---: |
| EventPage records in production | 6,545 |
| Pages with an active editorial rewrite marker | 1,205 |
| Rewritten pages with a current saleable session or valid open-date offer | 1,054 |
| Rewritten pages without a current saleable session or valid open-date offer | 151 |
| Indexable rewritten pages | 1,003 |
| Indexable rewritten pages with current saleable events | 853 |
| Rewritten pages with `READY` status but `noindex` | 202 |
| Current saleable pages without an active editorial rewrite | 3,822 |
| Current saleable sessions across all EventPages | 29,785 |

The 151 rewritten pages without current sale do not necessarily need their text removed. Their EventPage and rewrite remain in the ledger; the row marks that no saleable future session was found at this snapshot.

## Definitions

- **Active editorial rewrite** — current `EventPage.content` contains the `ACTIVE_EDITORIAL_REWRITE` marker.
- **Current sale** — a linked Event is `READY` and has either an active, non-archived session starting at or after the snapshot time in Moscow, with an active `EventOffer`; or it is a valid `OPEN_DATE` Event with an active offer.
- **`REWRITE_LIVE`** — an active rewrite and current sale both exist.
- **`REWRITE_NO_CURRENT_SALE`** — the rewrite exists, but the current database has no saleable future session or valid open-date offer.
- **`NEEDS_REWRITE_LIVE`** — no active rewrite marker, but the linked Events currently have saleable sessions/offers. These are candidates for the editorial queue, subject to identity and duplicate review.
- **`NO_REWRITE_NO_CURRENT_SALE`** — neither an active rewrite nor a current sale was found.

“Live” here means current saleability in the production database. The query does not make HTTP requests and therefore does not certify that every URL returns HTTP 200 or that the provider still has ticket inventory beyond its active offer/session flags.

## Files

- `data/ticketscloud/editorial/eventpage-rewrite-lifecycle-tracker-2026-11-16.csv` — full row-level snapshot. Filter `tracker_status` to see rewritten pages with sales, rewritten pages without sales, and unrevised pages that still have sales.
- `scripts/sql/eventpage-rewrite-lifecycle-tracker.sql` — read-only query that exports the same ledger. Run it through the production SSH tunnel and direct stdout to a new dated CSV; do not point it at the local baseline.

The tracker records page ID, URL, title, city, venue, page status/indexability, rewrite marker, latest revision metadata, linked-event count, current session/offer counts, next saleable slot, and derived tracker status. It intentionally does not change EventPage content, links, SEO fields, or publication state.