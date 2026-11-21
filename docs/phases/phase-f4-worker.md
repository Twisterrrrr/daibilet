# F4.2 — Sync jobs → `apps/worker`

**Статус:** ✅ MVP в репо (CLI + cron wrappers). Prod: после `git pull` следующие cron/timer runs идут через worker. Admin Sources без изменений.

## Архитектура

```
cron / systemd oneshot
  → deploy/cron/{tc,tep}-*-sync.sh (flock + nice)
  → node apps/worker/bin/run.mjs <job>
  → root scripts/* (tc-sync, tep-import-fixtures, tc-sync-orders, …)

Next Admin Sources Sync
  → POST legacy API (:4000)
  → spawn(scripts/*)   # тот же pipeline, не через worker CLI
```

Не long-running daemon: jobs oneshot, изоляция уже через systemd MemoryMax + flock.

## Jobs

| CLI job | Scripts | Prod schedule |
|---------|---------|---------------|
| `tc-catalog` | `tc-sync.js` | nightly 03:20 |
| `tep-catalog` | `tep-import-fixtures.js` + `revalidate-next-home.mjs` | 12h |
| `tc-orders` | `tc-sync-orders.js` | `*/10` |
| `tep-orders` | stub | **off** |
| `health` | — | smoke |

## Проверка

```bash
pnpm worker -- health
node apps/worker/bin/run.mjs list
# on prod after pull (no web restart needed for worker files):
APP_DIR=/opt/daibilet node /opt/daibilet/apps/worker/bin/run.mjs health
```

## Gaps / next

- F4.3: port remaining Vite deep CRUD (Events override, Landings matches) → затем retire `/legacy`
- Optional later: API spawn через worker CLI (единый entry); не блокер
- Finance / checkout не трогаем
