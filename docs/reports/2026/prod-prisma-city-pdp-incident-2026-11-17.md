# Production incident: Prisma destination PDP mismatch and bot 5xx

**Date:** 2026-11-17 (UTC)  
**Environment:** MSK production (`daibilet-api`, `daibilet-web`, Postgres `:5437`)  
**Status:** recovered; deployment hardening remains follow-up work.

## Impact

Crawler monitoring reported 18 bot 5xx responses in the 05:06–06:06 UTC
window. Nginx access logs contain 504 responses on event pages around
05:26–05:29 UTC. During investigation, public city pages also returned 500.

## Confirmed causes

There were multiple failures, not one:

1. A long-running read-only database query held locks while the production
   migration for `Venue.publicSlug` waited. Requests queued behind the DDL and
   some SSR event requests timed out with 504.
2. At 05:32 UTC, the API process exited after PostgreSQL could not allocate a
   2 MiB shared-memory segment. The production Postgres container had only the
   Docker default 64 MiB `/dev/shm`.
3. The deployment was interrupted between migrations. Migration
   `20261115100000_destination_pdp_documents` had a `started_at` row but no
   `finished_at`; neither destination PDP table existed. The production
   generated Prisma Client also lacked `City.pdpDocument`, while the checked-out
   backend source queried that relation. This caused city API/SSR 500s after the
   API restarted on the newer source.

`/api/health` continued to return 200 and did not detect the route-level schema
mismatch.

## Recovery performed

- Saved and validated a production logical backup before changing the Postgres
  container configuration.
- Set production Postgres `shm_size` to 512 MiB, matching staging; verified the
  same named data volume remained mounted and the container became healthy.
- Regenerated the ignored Prisma Client files against the checked-out schema.
- Confirmed the interrupted destination migration had created none of its
  tables, marked that attempt rolled back with Prisma migration resolution, and
  applied the migration with `migrate deploy`.
- Restarted only `daibilet-api` after client generation and migration completed.

## Verification

After recovery, the city API for Volzhskiy and its SSR page returned 200; the
Novosibirsk city page returned 200. API and web health checks returned 200. The
current representative event URLs returned either 200 or 404, not 5xx; some
old URLs no longer resolve to live events and require a separate URL/content
audit.

## Follow-up

- The production compose file has a manual `shm_size: 512mb` edit. The same
  change is committed as `d4951cc84` (`fix(infra): enlarge postgres shared
  memory`) on `feat/next-monorepo`; reconcile the production checkout through a
  normal release so it no longer has config drift.
- Make interrupted deploy handling explicit: before restarting API after a
  canceled migration, inspect unfinished rows in `_prisma_migrations`, actual
  schema objects, and the generated Prisma Client. Do not infer route health
  from `/api/health` alone.
- Review whether deployment should apply migrations from an immutable candidate
  release before switching the live checkout. A canceled migration must not
  leave the running service able to load new backend source against old schema
  or generated client.
- Keep post-deploy checks for a real city API endpoint and a city SSR route in
  addition to health and catalog smoke checks.
