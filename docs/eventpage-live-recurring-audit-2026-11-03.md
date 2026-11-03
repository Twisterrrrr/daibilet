# Live recurring EventPage audit — 2026-11-03

Read-only snapshot from the production database. The full matrix, including every Event ID, is in [`eventpage-live-recurring-matrix-2026-11-03.csv`](./eventpage-live-recurring-matrix-2026-11-03.csv); the SQL used to reproduce it is [`eventpage-live-recurring-matrix.sql`](../scripts/eventpage-live-recurring-matrix.sql).

## Population and proposed relationships

- The production database contains **139,081 Event records** in total.
- The live recurring slice contains **28,379 Ticketscloud Event IDs** with an active offer and a future active session. Exact provider identity plus city yields **569 groups**: **101** single-ID groups and **468** multi-ID groups. The largest group has **2,703 Event IDs**.
- A further **50 live recurring records** are TEPLOHOD events without a Ticketscloud parent ID. They remain individual products; the matrix lists each Event ID separately.
- **4 Ticketscloud groups** already have exactly one linked DRAFT EventPage (North Venice, Neva Symphony, Three Bridges, and the cider cruise). No group in this slice points to multiple EventPages.
- **554 unlinked Ticketscloud groups** have one title variant and one venue. They are candidates for automatic DRAFT EventPage shells, keyed by `metaExternalId + city`.
- **11 unlinked groups** need review: 8 have title variants and 3 have multiple venues. The remaining fourth multiple-venue group is North Venice, already represented by the approved DRAFT page for its two piers.
- No supplier relationship was populated for these imported records in `Event.supplierId` / `SupplierEvent`. That means the production relation cannot independently prove supplier identity. The proposed automatic key is the explicit Ticketscloud parent ID and city; the 11 title/venue exceptions stay out of automatic grouping.

## Mapping rule

1. Ticketscloud `metaExternalId` is the product identity for dated child Events. One EventPage is created for a parent ID within one city; different cities remain separate pages.
2. The page links one representative Event ID. Its public event DTO resolves upcoming siblings from the same Ticketscloud source, parent ID, and city. We do not attach thousands of child IDs to `EventPageEvent`.
3. Catalog and search use that same group identity to resolve one linked EventPage. If the group points to conflicting pages, the old event/slot URL remains the fallback.
4. TEPLOHOD records without that Ticketscloud identity are not title-merged. Each remains a separate page candidate.
5. Candidate pages remain `DRAFT`, `noindex`, and without canonical paths. This audit did not change canonical tags, sitemap membership, redirects, articles, or public URLs.

## Checks still required before provisioning and SEO cutover

- Deploy the group resolver to isolated staging and test a representative linked slot from a multi-ID Ticketscloud group, including its city boundary and conflict fallback.
- Verify catalog, search, article-link mapping, and public EventPage route on staging.
- Only after staging passes, create the unambiguous candidate shells on production and review the 11 exceptions. Publishing, canonicals, sitemap changes, and redirects remain separate steps after the URL map and article links are reconciled.
