# EventPage editorial transfer — 2026-11-04

## Production changes

Transferred editorial text into the existing production EventPages through the backend's `updateAdminEventPage` service. The service appended a revision for each changed page. No pages or Event/EventPage links were created, deleted, or reassigned.

- **35** EventPages received text from the exact-matched 2026-10-27 rewrite batch. Each stored EventOverride was SHA-256 checked against the local rewrite source before transfer.
- **7** TEP EventPages received the previously approved current EventOverride text. Their original event descriptions and EventPage source snapshots were retained. The referenced TEP batch body was unavailable locally, so this used the already-saved production rewrite as source.
- **1** existing EventPage, “Новогодняя сказка: вечерний Петербург”, received the prepared editorial document for **122** linked Ticketscloud Event IDs. The local-only archive pointer was removed from public content; original descriptions remain in the 122 EventPageEvent source snapshots and in the local source archive.
- **43 distinct EventPages now contain editorial text**. The first pass updated 35 batch pages plus the New Year page; a second pass added the 7 TEP pages and idempotently skipped the 36 pages already updated. All resulting content and link snapshots were read back and checked.

Every affected page remains `DRAFT`, `isIndexable=false`, and unpublished. No canonical, sitemap, redirect, public slug, or catalog changes were made. Existing EventOverride copies were retained to avoid changing current legacy event pages before a separate URL migration.

## Editorial editor change

The EventPage editor now shows the archived source description under each linked Event, explicitly labeled “Оригинальный текст источника · не используется в EventPage”. The EventPage content editor is labeled as the active rewrite saved to the draft page. This UI change is deployed.

Validation: `pnpm --filter @daibilet/web typecheck` and targeted ESLint on the two changed files both passed.

## Expired legacy event URL fallback

Production's active TypeScript public-event read model now retains an event page after its final session disappears from the saleable schedule. It returns `availability=ENDED` (or `NO_UPCOMING` when the last source date is still in the future), with no ticket offers or purchase action. The page stays available as a non-indexable fallback; published stable EventPages retain their own publication/indexability rules.

Deployed in commit `9e0de8071e77bffe3f3ee5086d91c4471e3a96e5` through [CI run 41905438199](https://github.com/Twisterrrrr/daibilet/actions/runs/41905438199) and [production deploy run 41906122798](https://github.com/Twisterrrrr/daibilet/actions/runs/41906122798).

Production verification for the sitemap-reported example `/events/kvartet-olgi-vesninoi-dzhazovye-divy-izmenivshie-mir-6ae313555b438d3f3e7245f5`:

- API and page return HTTP 200.
- API reports `ENDED`, 0 sessions, 0 offers, and `purchaseReady=false`.
- HTML includes the ended-session notice, `noindex, follow`, and no Event JSON-LD.
- Deploy smoke and delayed post-deploy observation passed. At 2026-11-04 20:35 UTC the crawler monitor reported `bot5xx=0`, `referenceErrors=0`; web/API services were active with zero restarts and local health probes returned HTTP 200.

## Still excluded

- 2 Ticketscloud entries with source-batch/status uncertainty.
- 23 Cline entries without a reliable original/source record.
- 9 outdated selection rows.
- The separate prepared Penza rewrite, pending freshness and factual validation.
- TEP records without an existing EventPage target.

The audit CSV is a pre-transfer snapshot; this result file records the subsequent production writes.
