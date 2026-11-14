# Production EventPage drafts for recurring events — 2026-11-03

## What was created

After re-exporting the live recurring matrix from production, the provisioning script revalidated every selected identity against current database state and created **604 private DRAFT EventPages**:

- **554 Ticketscloud parent+city groups**. Each page is linked to one representative Event ID; the stable page resolver finds the dated sibling slots by exact provider parent and city. Different cities remain different pages.
- **50 Teplohod Events** without a Ticketscloud parent identity. Each remains an independent page candidate; no title-based merging was used.

The existing production matrix had four linked Ticketscloud groups. The refreshed matrix now shows **558 of 569** live TC parent+city groups linked to exactly one page; **11 groups remain unlinked for review** because of title or venue variants. All **50/50** Teplohod candidates are linked individually. No group in the refreshed matrix points to multiple pages.

Every page created by this batch is `DRAFT`, `isIndexable=false`, has no `publishedAt` or `canonicalPath`, and has one `/events/<slug>` CANDIDATE route. Verification returned 604 pages, 604 safe draft links, zero unexpectedly public pages, and zero missing candidate routes.

## Current matrix files

- [`eventpage-live-recurring-matrix-2026-11-03-refresh.csv`](./eventpage-live-recurring-matrix-2026-11-03-refresh.csv) — live production snapshot immediately before provisioning.
- [`eventpage-live-recurring-matrix-2026-11-03-after-drafts.csv`](./eventpage-live-recurring-matrix-2026-11-03-after-drafts.csv) — refreshed snapshot after provisioning, with page IDs/slugs/statuses represented by page slug/status fields.
- [`eventpage-live-recurring-matrix-2026-11-03.csv`](./eventpage-live-recurring-matrix-2026-11-03.csv) — initial snapshot; historical only.

## Production safety

- Backup was created before writes: `/var/backups/daibilet/postgres/daibilet-before-recurring-eventpages-20261103T194500Z.dump` (130 MB).
- SHA-256: `497373516d7f6001e072336966c1cad9791223068e70fae3a617476abaed1a5`.
- The provisioning script refuses writes without explicit production flags, a reviewed candidate count, and a production database target. It revalidates saleability and grouping eligibility before creating pages, then verifies the noindex/no-canonical invariants.
- No slot URL, canonical, sitemap, redirect, article URL, or public page status was changed by this batch.
- Imported events continue to use the ticket provider's purchase widget. This work does not open Daibilet's finance contour.

## Staging and release status

- Staging API and web use release `8ba1bc930`. The staged build completed successfully; API/web health, catalog, search, home, and robots checks returned HTTP 200. Staging remains noindex for Googlebot.
- The latest staging smoke also removed a stale DTO cache entry left by a temporary smoke record. After cache rebuild, the deleted smoke slug no longer appears in the catalog or cache; the deleted route correctly returns 404. A live legacy slot URL remains a fallback route.
- Local focused EventPage/search tests passed 12/12; backend typecheck passed. GitHub Actions run `41705598297` for the same SHA `8ba1bc9302330f17bfa1eccd094339da79fc15fd` completed successfully, including checkout, backend tests/typecheck, web tests/typecheck, Next build, and admin build. A duplicate push-triggered run `41705325538` remains pending at checkout; the successful full CI run for the exact same commit is the validation result.
- The code release that changes public catalog/search URL behavior has not been switched on production by this data-only provisioning step. Canonical/sitemap/redirect/article cutover remains a separate, gated phase after the reviewed URL map and release checks.

## Direct EventID-to-EventPage verification

The read-only production export [`eventpage-live-direct-eventid-links-2026-11-03.csv`](./eventpage-live-direct-eventid-links-2026-11-03.csv), reproducible with [`eventpage-live-direct-eventid-links.sql`](../scripts/eventpage-live-direct-eventid-links.sql), contains **2,167 distinct Event IDs** with direct EventPage links:

- 1,558 `SINGLE` Event IDs link to 1,558 pages.
- 609 `RECURRING` Event IDs link to 608 pages. One approved North Venice page links two Event IDs for the same provider product with different departure piers.
- Total: 2,166 distinct pages. Every Event ID maps to exactly one page.
- All 2,166 pages are private `DRAFT`, `isIndexable=false`, and have no canonical path or publication timestamp. The export is not evidence that any page has been published or indexed.

The CSV is a production snapshot, not a live connection. Re-run the SQL before any publication or routing batch.

## Reproducible provisioning

Run `scripts/provision-eventpage-live-recurring.mjs` against the reviewed after-sync matrix. It selects only one-title/one-venue TC parent+city groups without existing pages, plus standalone Teplohod candidates, and checks every candidate again against the live database. It never publishes pages or changes SEO routing.
