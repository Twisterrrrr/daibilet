# EventPage editorial transfer — 2026-11-04

## Production changes

Transferred editorial text into the existing production EventPages through the backend's `updateAdminEventPage` service. The service appended a revision for each changed page. No pages or Event/EventPage links were created, deleted, or reassigned.

- **35** EventPages received text from the exact-matched 2026-10-27 rewrite batch. Each stored EventOverride was SHA-256 checked against the local rewrite source before transfer.
- **7** TEP EventPages received the previously approved current EventOverride text. Their original event descriptions and EventPage source snapshots were retained. The referenced TEP batch body was unavailable locally, so this used the already-saved production rewrite as source.
- **1** existing EventPage, “Новогодняя сказка: вечерний Петербург”, received the prepared editorial document for **122** linked Ticketscloud Event IDs. The local-only archive pointer was removed from public content; original descriptions remain in the 122 EventPageEvent source snapshots and in the local source archive.
- **43 distinct EventPages now contain editorial text**. The first pass updated 35 batch pages plus the New Year page; a second pass added the 7 TEP pages and idempotently skipped the 36 pages already updated. All resulting content and link snapshots were read back and checked.

Every affected page remains `DRAFT`, `isIndexable=false`, and unpublished. No canonical, sitemap, redirect, public slug, or catalog changes were made. Existing EventOverride copies were retained to avoid changing current legacy event pages before a separate URL migration.

## Editorial editor change

The EventPage editor now shows the archived source description under each linked Event, explicitly labeled “Оригинальный текст источника · не используется в EventPage”. The EventPage content editor is labeled as the active rewrite saved to the draft page. This UI change is local until its deployment completes.

Validation: `pnpm --filter @daibilet/web typecheck` and targeted ESLint on the two changed files both passed.

## Still excluded

- 2 Ticketscloud entries with source-batch/status uncertainty.
- 23 Cline entries without a reliable original/source record.
- 9 outdated selection rows.
- The separate prepared Penza rewrite, pending freshness and factual validation.
- TEP records without an existing EventPage target.

The audit CSV is a pre-transfer snapshot; this result file records the subsequent production writes.
