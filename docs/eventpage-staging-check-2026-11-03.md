# EventPage staging check — 2026-11-03

## Staging selection

- `daibilet-fresh` on `127.0.0.1:5438` is the usable isolated staging database for schema checks. Before migration it had 1 Event, 0 EventSessions, and no EventPage tables.
- `daibilet` on `127.0.0.1:5437` is a different, drifted local baseline (8,762 Events / 22,985 sessions). Prisma migration deploy stopped at the first pending migration, `20261014170000_places_taxonomy`, because `PlaceType` already existed. The failed migration attempt was marked rolled back; the existing Event/session rows were unchanged. Do not use this database as a migration staging target until its schema/migration history is reconciled.

## Work performed on isolated staging

- Took a PostgreSQL custom-format backup before migration: `D:\coding\backups\daibilet-fresh-staging-before-eventpage-migrations-20261103.dump`.
- Applied the 8 pending migrations successfully, through `20261103170000_event_session_archive`. Prisma reports the schema up to date afterward.
- Ran a transactional create/read smoke for a draft EventPage using the only staging Event fixture (`evt_stub_museum_open_date`). The page was rolled back after checking invariants: DRAFT, `isIndexable=false`, no canonical path, one linked Event ID, one CANDIDATE route. Post-smoke staging contains no EventPage created by the smoke.
- The fixture is a synthetic open-date museum event with no sessions. This validates schema/service wiring, not production sales data, real provider payloads, repeated slots, or a multi-pier EventPage.
- Backend tests `event-pages.test.js` and `public-event.dto.test.ts` passed: 9/9. `node --check scripts/audit-eventpage-live-inventory.mjs` passed.

## Production and deployment

- No production EventPage links, canonical paths, sitemap records, redirects, or article links were changed in this check.
- CI for `7476f0d56` is still reported `in_progress` in GitHub Actions, with both runs waiting at checkout. Prior commit `28181825f` passed. Do not describe the latest CI as green until the runs finish or are replaced by successful runs.
- For a representative staging acceptance test, refresh staging from a current, sanitized production snapshot (or seed a purpose-built fixture containing multiple live sessions and two distinct departures). Then validate the approved North Venice pair, session selection, venue labels, indexing gates, and legacy-route fallback before any SEO cutover.
