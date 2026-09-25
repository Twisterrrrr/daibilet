# Sitemap / crawler monitoring follow-up

Branch: `codex/seo-canonical-monitoring`, based on `origin/feat/next-monorepo` at `0175a019f`.

## Sitemap

The active sitemap generator now calls `venueSitemapEntry`, which always uses `venueCanonicalPath`. The shared entry builder is covered by the canonical invariant (previously the test compared the canonical helper to itself). All indexability filters are preserved; no family/data migration is included.

Read-only export of ALL production Venue rows on this run: **4083**, not the historical 3659. Audit of the production entry builder: **4083 checked, 0 sitemap/canonical mismatches, 15 stale stored paths**. Stored paths are informational; the resolver ignores the wrong family. No database rows changed. This validates the new code against production data, not a deployed web artifact.

Reproduce on the server:

```
node --env-file=.env scripts/export-venue-canonical-audit.mjs /tmp/venue-canonical-audit.json
apps/web/node_modules/.bin/tsx --tsconfig apps/web/tsconfig.json scripts/audit-venue-sitemap.ts /tmp/venue-canonical-audit.json 4083
```

Pass the current exported count explicitly if the catalog grows. The audit fails on a partial export.

## Hourly monitoring

Existing `crawler-log-monitor.mjs` already checks Googlebot/YandexBot 5xx in nginx and ReferenceError/cleanImportedDescription errors in the web/API journal. The installed production schedule was every two hours; changed to hourly at :07 and verified cron service active. Durable alert file: `/var/log/daibilet/crawler-alerts.jsonl`; scan log: `/var/log/daibilet/crawler-monitor.log`.

Production `.env` has no TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID. External notification delivery is therefore NOT enabled. Configure those two values to use the existing Telegram transport. No test messages were sent. Recent logs contained Googlebot 502 alerts; the latest inspected clean scan had zero bot 5xx and zero reference errors. This does not establish that all historical 502 causes are fixed.

## SSR OG

Already implemented and wired in event + venue/location metadata: `resolveSsrOgImage`. Tests passed for empty/unsafe URLs, 404, HTML, corrupt image bytes, network errors, oversized responses, and valid JPEG. Existing default asset is `/images/og/default-og.jpg`. No redundant implementation added.

## IndexNow cohort report

`scripts/webmaster-indexnow-report.mjs` reads the saved 162-path manifest, paginates `/indexing/samples`, counts evidence of crawl after the actual submission timestamp, stores per-URL history and week-over-week delta. Missing sample means unknown, never “not crawled”. After five days without positive evidence, it adds bounded HTTP diagnostics and calls for Webmaster/log/robots/canonical review. API errors fail the job without replacing the previous report with a false zero.

API contract: https://yandex.ru/dev/webmaster/doc/ru/reference/hosts-indexing-samples (sample list capped at 50,000 URLs; not proof of search inclusion).

Required `.env`: YANDEX_WEBMASTER_TOKEN, YANDEX_WEBMASTER_USER_ID, YANDEX_WEBMASTER_HOST_ID, INDEXNOW_SUBMITTED_AT (actual ISO submission timestamp). None of the Webmaster credentials were configured during this run. Thus no live Webmaster count is claimed and the report cron is not installed yet.

Run: `node --env-file=.env scripts/webmaster-indexnow-report.mjs`.
Install after configuration: `sudo bash deploy/scripts/install-webmaster-report.sh` (Monday 09:30 server time).
Reports: `/var/lib/daibilet/webmaster/`; job log: `/var/log/daibilet/webmaster-indexnow.log`.

## Validation and rollout

Canonical/SSR tests: 19 passed; crawler tests: 3 passed; Webmaster report tests: 2 passed. Web sitemap changes still need the regular reviewed web deployment. The only production configuration change made here is the hourly crawler cron.

Rewrite work is isolated in `codex/event-description-rewrite` and postponed at the owner's request; no migration, provider spend or rewrite cron was applied.
