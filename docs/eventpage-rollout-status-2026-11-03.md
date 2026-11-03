# EventPage rollout status — 2026-11-03

## What is now concretely in place

Production has **2,166 private EventPages** with direct links to **2,167 Event IDs**:

| Event group | Event IDs | EventPages | Current state |
|---|---:|---:|---|
| Live, saleable `SINGLE` | 1,558 | 1,558 | DRAFT, noindex |
| Live, saleable `RECURRING` | 609 | 608 | DRAFT, noindex |
| **Total** | **2,167** | **2,166** | **No pages published** |

The one-page/two-EventID exception is the approved North Venice product with different departure piers. These are still provider-sold tickets; no imported sale was routed through Daibilet finance.

The recurring batch created 604 new drafts: 554 unambiguous Ticketscloud parent+city groups and 50 individual Teplohod events. Four recurring pages had already existed. Eleven Ticketscloud groups remain in review. Details and the full EventID export are in [the recurring provisioning report](./eventpage-live-recurring-provisioning-2026-11-03.md), [the live EventID-to-EventPage export](./eventpage-live-direct-eventid-links-2026-11-03.csv), and the [read-only SQL query](../scripts/eventpage-live-direct-eventid-links.sql).

## Code, staging, CI, production

- Code SHA `8ba1bc9302330f17bfa1eccd094339da79fc15fd` is pushed to `feat/next-monorepo`.
- Full GitHub CI run `41705598297` passed for that exact SHA: checkout, dependency install, Prisma, backend tests/typecheck, web tests/typecheck, Next build, admin build, and script checks.
- Staging release `8ba1bc930` passed the health and route smoke checks. Staging's temporary stale DTO cache entry was removed and verified absent after rebuild.
- Production runtime has **not** been switched to this code SHA. Only private DRAFT records were created in the production database; existing slot URLs, public page status, canonical, sitemap, redirects, and article links were not changed.

## What is required before calling the URL migration complete

1. Deploy the code release to production and smoke both API and web while preserving the old slot URL fallback.
2. Finish the 11 recurring review groups and the remaining single-event candidates that are not currently saleable.
3. Build the reviewed mapping from existing slot URLs and historical Search Console/Webmaster URLs to EventPages. Do not infer links by title alone.
4. Verify article and collection links resolve to EventPages.
5. Only after the mapping is reviewed: publish eligible EventPages, then update canonical/sitemap, then add exact 301/308 redirects for mapped legacy URLs. Keep unknown URLs on fallback.

**Current status:** EventPage draft coverage and staging validation are in place. Production code deployment, remaining review, historical URL mapping, and the SEO cutover are open work. This is not a completed production rollout.
