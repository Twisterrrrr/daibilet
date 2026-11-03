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

- Staging API and web now use release `80acd17f9`; both health checks return HTTP 200. Staging catalog endpoint returned HTTP 200. Staging remains noindex for Googlebot.
- A staging smoke previously verified a DRAFT EventPage route returns HTTP 200/noindex, and that a stable catalog link appears after the public catalog's SWR refresh. Old slot links remain fallback routes.
- Local focused EventPage/search tests passed 12/12; backend typecheck passed for the current patch. Production CI run `41702378011` was still in progress at the time of this report, stuck at the GitHub checkout step; do not report it green until GitHub marks it complete.
- The code release that changes public catalog/search URL behavior has not been switched on production by this data-only provisioning step. Canonical/sitemap/redirect/article cutover remains a separate, gated phase after the reviewed URL map and release checks.

## Reproducible provisioning

Run `scripts/provision-eventpage-live-recurring.mjs` against the reviewed after-sync matrix. It selects only one-title/one-venue TC parent+city groups without existing pages, plus standalone Teplohod candidates, and checks every candidate again against the live database. It never publishes pages or changes SEO routing.
