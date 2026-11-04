# EventPage crosswalk for the available Search Console inventory — 2026-11-04

Source: [`event-pdp-search-console-url-inventory-2026-10-27.csv`](./event-pdp-search-console-url-inventory-2026-10-27.csv), joined to the complete production EventID matrix [`eventpage-eventid-assignment-matrix-2026-11-04.csv.gz`](./eventpage-eventid-assignment-matrix-2026-11-04.csv.gz) using exact Event IDs encoded in the legacy URL or an exact EventID candidate already recorded in the inventory.

## Results

- The source inventory contains **1,521 URL rows**.
- **1,515 rows** resolve to an exact Event ID in the current matrix; these represent **1,514 unique Event IDs**. One Event ID appears under two legacy URL forms.
- **346 rows** have a candidate EventPage target in the matrix: 173 already have a direct EventPage link and 173 have an unambiguous product-page assignment candidate.
- **1,169 rows** have an exact Event ID but no assigned EventPage target yet: 1,071 are `HOLD_NOT_READY` and 98 are `HOLD_NO_CURRENT_SALE`.
- **6 rows** have no exact Event ID match and remain unresolved.

The row-level join, including original URL, GSC metrics, EventID status, assignment decision, and candidate EventPage key, is in [`eventpage-search-console-crosswalk-2026-11-04.csv`](./eventpage-search-console-crosswalk-2026-11-04.csv).

## How to use this map

An exact ID match establishes which Event record the legacy URL names. A candidate EventPage key does not establish that the relation has been written, that the page is published, or that a redirect is safe. Keep legacy fallback for all rows until the EventPage exists, current slots and venue are correct, and a separate SEO review approves the canonical/sitemap/redirect transition.

The six unmatched URLs and the duplicate-URL EventID need explicit URL review. This file is the available 1,521-row Search Console inventory; it does **not** claim to reconcile the separate queue of 78 current unmatched URLs and 1,305 historical URLs.

No database, canonical, sitemap, redirect, or article content was changed while building this crosswalk.
