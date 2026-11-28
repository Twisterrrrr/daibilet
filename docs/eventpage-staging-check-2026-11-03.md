# EventPage staging check — 2026-11-03

## Correct staging target

- The server staging source directory is `/opt/daibilet-staging`; staging API and web currently run from release `/opt/daibilet-releases/8ba1bc930`. Their checked ports are API `:4001` and web `:3000`; both root/health checks return HTTP 200. The staging database target was checked without printing credentials: `127.0.0.1:5438/daibilet_staging`.
- The staging DB had 8,762 Events and 22,985 EventSessions. Before migration, only `20261103130000_event_tour_groups` and `20261103170000_event_session_archive` were pending.
- Took a PostgreSQL custom-format backup before applying them: `D:\coding\backups\daibilet_staging-before-eventpage-acceptance-20261103.dump`.
- Applied those two additive migrations on the correct staging database. Prisma reports schema up to date afterward.

## Acceptance smoke

- Staging contains both approved North Venice Event IDs, both unlinked and sharing `metaExternalId` `67b6dc7ba69cf48036df9f14`.
- Ran a transaction-only create/read smoke for one DRAFT EventPage linked to both Event IDs. Verified positions 0/1, `isIndexable=false`, no canonical path, and one CANDIDATE route. Rolled the transaction back and then verified zero persisted smoke pages, links, or routes.
- The snapshot is stale relative to production: both staging records currently show the same pier (`Фонтанки 104`) and only one has a future session; the production audit reported different pier data and one inactive Event ID. This validates multi-EventPage association mechanics, but not the correct per-session pier labels or current availability. Refresh/sync the catalog snapshot before those checks.
- Backend tests `event-pages.test.js` and `public-event.dto.test.ts` passed: 9/9. `node --check scripts/audit-eventpage-live-inventory.mjs` passed.

## Other local databases (not the server staging target)

- `127.0.0.1:5438/daibilet` is a scratch DB with one synthetic open-date Event. Its custom-format backup is `D:\coding\backups\daibilet-fresh-staging-before-eventpage-migrations-20261103.dump`; the 8 pending additive migrations were applied there for schema wiring and a one-Event rollback smoke.
- `127.0.0.1:5437/daibilet` is a drifted local baseline. Prisma deploy stopped at the first pending migration, `20261014170000_places_taxonomy`, because `PlaceType` already existed. That failed attempt was marked rolled back; no Event/session data changed. Do not use this database as a migration staging target until its schema/migration history is reconciled.

## Production and deployment

- The production follow-up created four private EventPage drafts after staging validation. Other production URL state remained unchanged: no canonical paths, sitemap records, redirects, or article links were switched.
- CI for `7476f0d56` and `4a264b33b` is still `in_progress` in GitHub Actions; prior commit `28181825f` passed. Do not describe the latest CI as green until the runs finish or are replaced by successful runs.
- Before SEO cutover, refresh/sync the server staging catalog from a current sanitized production snapshot (or seed an equivalent fixture), then validate current North Venice pier labels, session selection, live availability, indexability gates, and legacy-route fallback.

## Latest code-release smoke

- Release `8ba1bc930` was built and switched on the isolated staging services. Staging API health, web root, catalog, search, home, and robots returned HTTP 200. A deleted temporary smoke EventPage no longer appears in the catalog/cache and its route returns 404; an existing legacy slot URL still returns HTTP 200.
- Do not test production-only slugs against this staging database and interpret their 404 as a route regression: the staging snapshot has 8,762 Events and does not contain all production EventIDs. One such production-only slug returned 404 in staging for that expected reason. The EventPage draft-route acceptance smoke used a staging EventID fixture; production ID coverage still needs a sanitized/current staging snapshot before broader data-level parity claims.
- GitHub Actions run `41705598297` passed the full CI suite for `8ba1bc9302330f17bfa1eccd094339da79fc15fd`. A separate push-triggered duplicate run was still pending at checkout; it does not supersede the successful full run for the same SHA.
- The production deployment has not been executed. `/opt/daibilet` contains uncommitted local working changes, including EventPage code, so the standard workflow's `git reset --hard` must not be used until those changes are preserved or deployment is performed from an isolated release.
