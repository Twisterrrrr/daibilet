# Production EventPage draft batch — 2026-11-03

## Result

Revalidated the SIMPLE_CANDIDATE snapshot in eventpage-live-single-production-2026-11-03.csv against the production database before writing:

- 1,622 candidate Event IDs existed in production.
- 64 no longer had a future sellable session and were excluded.
- 1,558 remained READY SINGLE events with an active offer and a future sellable session. None was already linked or had a non-empty provider parent identity (metaExternalId).
- Created 1,558 EventPages, each linked to exactly one Event ID.

All created pages are DRAFT, isIndexable=false, publishedAt=null, with no canonicalPath, and each has one CANDIDATE route at /events/<slug>. They have no tour-group assignment. Verification found no public pages, canonical overrides, multi-event links, or route mismatches in this batch.

No event slot URLs, canonical tags, sitemap entries, redirects, or article links were switched. The 64 events without future sellable sessions remain outside this live-sale batch for later archive/URL triage.

## Production safety checks

- Staging migration status was up to date; staging already had 20261103130000_event_tour_groups.
- Production had exactly that one pending migration. It was applied from the staging worktree after a fresh production dump.
- Backup: /var/backups/daibilet/postgres/daibilet-20261103T180814Z.dump (128 MB).
- A transaction smoke on a real candidate was intentionally rolled back; its association count stayed 0 → 0 before the batch.
- After the batch, an admin EventPage read smoke returned a private one-event draft.
- API health, web home, and public stats returned HTTP 200 after the runtime SQL identifier fix and API restart.

## Runtime note

Production API code had an unquoted candidate_link.externalId reference, which PostgreSQL resolves as lowercase externalid. The column is named externalId (quoted). A one-line runtime hotfix was applied with a backup at /home/deploy/eventpage-runtime-hotfix-20261103/event-pages.js.before-quoted-column-fix; this correction should be carried by the next normal application deploy.

## Provisioning guard

scripts/provision-eventpage-simple-candidates.mjs can re-run the reviewed snapshot safely. It requires explicit production flags and counts, refuses any unexpected database target, revalidates live saleability immediately before writing, and only accepts already-linked pages if they remain single-event private drafts. It does not publish or change SEO routes.
