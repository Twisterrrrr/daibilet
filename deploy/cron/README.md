# Cron jobs

Канон F4.2: out-of-process sync через `@daibilet/worker` (`node apps/worker/bin/run.mjs <job>`).
Wrappers ниже сохраняют flock/nice; systemd `ExecStart` без смены пути.

См. [phase-f4-worker.md](../phases/phase-f4-worker.md), [apps/worker/README.md](../../apps/worker/README.md).

## Prod: Ticketscloud catalog sync (nightly, out-of-process)

Полный `tc:sync` тяжёлый для 3.8Gi — **не** гонять днём. Онлайн-правки: `npm run tc:sync -- --ids=...`.

```bash
chmod +x /opt/daibilet/deploy/cron/tc-catalog-sync.sh
mkdir -p /var/log/daibilet
```

Systemd (предпочтительно, 1×/сутки 03:20):

```bash
cp /opt/daibilet/deploy/systemd/daibilet-tc-catalog-sync.service /etc/systemd/system/
cp /opt/daibilet/deploy/systemd/daibilet-tc-catalog-sync.timer /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now daibilet-tc-catalog-sync.timer
systemctl list-timers | grep tc-catalog
```

Или cron:

```
20 3 * * * APP_DIR=/opt/daibilet /opt/daibilet/deploy/cron/tc-catalog-sync.sh >> /var/log/daibilet/tc-catalog-sync.log 2>&1
```

| Setting | Value |
|---------|-------|
| Schedule | nightly 03:20 |
| Isolation | flock + nice 15 + ionice best-effort |
| Memory | MemoryHigh 1600M / MemoryMax 2000M (systemd); `NODE_OPTIONS=--max-old-space-size=1536` (catalog JSON ~245MB) |
| Script | **must be executable** (`chmod +x deploy/cron/tc-catalog-sync.sh`) - иначе timer `203/EXEC` |
| Post-sync | light Next revalidate + light API warm (`TC_CATALOG_SYNC_FULL_WARM=0`) |
| Full warm | set `TC_CATALOG_SYNC_FULL_WARM=1` in service drop-in if needed |
| Log | `/var/log/daibilet/tc-catalog-sync.log` |
| Verify | после run ищи `importedEvents` в логе; fetch-only + OOM + `worker.job.done exitCode:0` = баг (fixed fail-on-signal) |
| Post-check | утром после 03:20 UTC: `deploy/scripts/verify-tc-catalog-sync.sh` (или grep log на `importedEvents` + `exitCode:0`) |
| Alert | `tc-catalog-sync.sh` exit 1 если в хвосте лога нет `importedEvents` > 0 или `exitCode!=0` |

## Prod: Ticketscloud orders-only (обязательно для зеркала заказов)

Только `npm run tc:orders` — **не** каталог (`tc:sync` / `tep:sync`).

```bash
chmod +x /opt/daibilet/deploy/cron/tc-orders-sync.sh
mkdir -p /var/log/daibilet
crontab -e
```

```
*/10 * * * * APP_DIR=/opt/daibilet /opt/daibilet/deploy/cron/tc-orders-sync.sh >> /var/log/daibilet/tc-orders-sync.log 2>&1
```

- Интервал: **10 минут** (допустимо 5–15).
- Lookback: последние `TC_ORDERS_LOOKBACK_DAYS` дней (по умолчанию 3) + flock против overlap.
- Лог: `/var/log/daibilet/tc-orders-sync.log`

## Prod: Teplohod orders-only — ОТЛОЖЕНО (2026-07-19)

Партнёр teplohod.info: **нет** API/выгрузки заказов. Cron `tep-orders-sync` **не** ставить на prod (скрипт `deploy/cron/tep-orders-sync.sh` и `npm run tep:orders` — заготовка в репо).

- Не требовать `TEP_ORDERS_TOKEN` как блокер.
- Активный orders cron: только `tc-orders-sync` (`*/10`).


## Staging (nightly health)

```bash
chmod +x /opt/daibilet-staging/deploy/cron/nightly-health.sh
chmod +x /opt/daibilet-staging/scripts/post-deploy-check.sh

crontab -e
```

```
15 4 * * * APP_DIR=/opt/daibilet-staging PUBLIC_BASE=https://staging.daibilet.ru /opt/daibilet-staging/deploy/cron/nightly-health.sh
```

Лог: `/var/log/daibilet/nightly-health.log`

## Prod (nightly health)

Рекомендуется на prod (не только staging): API + widgets + **Next :3001** smoke.

```
15 5 * * * APP_DIR=/opt/daibilet PUBLIC_BASE=https://daibilet.ru PORT=4000 POST_DEPLOY_WEB_BASE=http://127.0.0.1:3001 /opt/daibilet/deploy/cron/nightly-health.sh
```

Лог: `/var/log/daibilet/nightly-health.log`  
CODEX: см. [codex-prod-readiness-handoff.md](../docs/codex-prod-readiness-handoff.md) §1.

## Parity (раз в неделю, только staging с typed stack)

```
0 3 * * 0 cd /opt/daibilet-staging && bash scripts/run-parity-check.sh >> /var/log/daibilet/parity.log 2>&1
```

Требует `DATABASE_URL` и `DAIBILET_TS_*=1` + `start:ts`.

## Prod: еженедельный дайджест блога (новые события → Article REVIEW)

Черновик статьи **без auto-publish**. Редактор правит в Admin → Блог и публикует вручную.

```bash
chmod +x /opt/daibilet/deploy/cron/blog-weekly-digest.sh
crontab -e
```

```
0 7 * * 0 APP_DIR=/opt/daibilet /opt/daibilet/deploy/cron/blog-weekly-digest.sh >> /var/log/daibilet/blog-weekly-digest.log 2>&1
```

- Расписание: **воскресенье 07:00** (серверное время).
- Скрипт: `node scripts/blog-weekly-digest.js` (slug `afisha-nedeli-YYYY-MM-DD`, status=`REVIEW`, `isIndexable=false`).
- Лог: `/var/log/daibilet/blog-weekly-digest.log`
- Ручной прогон: `cd /opt/daibilet && npm run blog:weekly-digest` (или `--dry-run`).

## Prod: SEO.20 listing garbage audit (daily → Telegram)

Скан saleable public catalog (`title`/`description`, с учётом `EventOverride`) на CTA offsite / HTML-паразиты / CAPS / mojibake → один сводный алерт в Telegram (cap 10 + count).

```bash
chmod +x /opt/daibilet/deploy/cron/audit-listings.sh
crontab -e
```

```
0 4 * * * APP_DIR=/opt/daibilet /opt/daibilet/deploy/cron/audit-listings.sh >> /var/log/daibilet/audit-listings.log 2>&1
```

- Env: `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` в `/opt/daibilet/.env`. Без них скрипт отрабатывает и пишет warn (алерт skip).
- Ручной: `cd /opt/daibilet && pnpm audit:listings` / `--dry-run`.
- Лог: `/var/log/daibilet/audit-listings.log`
- Cron на prod ставить отдельно (не вшит в deploy-prod-next): нужен owner approval + проверка Telegram env.

## Prod: review-request emails (после сессии)

Просьба оставить отзыв покупателям с email в `ExternalOrder` (сессия 1–2 дня назад).

```bash
chmod +x /opt/daibilet/deploy/cron/review-requests.sh
crontab -e
```

```
0 10 * * * APP_DIR=/opt/daibilet /opt/daibilet/deploy/cron/review-requests.sh >> /var/log/daibilet/review-requests.log 2>&1
0 10 * * 0 APP_DIR=/opt/daibilet /opt/daibilet/deploy/cron/review-requests.sh --reminders >> /var/log/daibilet/review-requests.log 2>&1
```

- Без `SMTP_HOST`/`SMTP_FROM` — создаёт `ReviewRequest`, письмо skip + лог URL.
- Для отправки: SMTP env + `nodemailer` в `apps/backend`.
- Ручной: `npm run reviews:requests` / `--dry-run` / `--reminders`.

## Prod: CPU/RAM mitigation (TEP sync + OOM watch)

### Deploy discipline
- Use deploy/scripts/deploy-prod-next.sh: **one** controlled sequence (stop web -> restart api -> start web).
- Do not batch-restart staging/docker/unrelated units in the same pass.

### TEP catalog sync (out-of-process, preferred)
Prefer cron or systemd oneshot over in-process API auto-sync:

`ash
chmod +x /opt/daibilet/deploy/cron/tep-catalog-sync.sh
# In /opt/daibilet/.env:
#   TEP_AUTO_SYNC_ENABLED=0
#   DAIBILET_PUBLIC_STARTUP_WARM=0
#   TEP_AUTO_SYNC_STARTUP_DELAY_MS=2700000
#   TEP_AUTO_SYNC_SKIP_IF_FRESH_MS=21600000
`

Cron (every 12h, offset 20 min):

`
20 */12 * * * APP_DIR=/opt/daibilet /opt/daibilet/deploy/cron/tep-catalog-sync.sh >> /var/log/daibilet/tep-catalog-sync.log 2>&1
`

Or systemd timer (MemoryHigh/Max isolation):

`ash
cp /opt/daibilet/deploy/systemd/daibilet-tep-catalog-sync.service /etc/systemd/system/
cp /opt/daibilet/deploy/systemd/daibilet-tep-catalog-sync.timer /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now daibilet-tep-catalog-sync.timer
`

In-process fallback (only if cron/timer off): TEP_AUTO_SYNC_ENABLED=1 with 45min startup delay + skip-if-fresh 6h.

| Setting | Value |
|---------|-------|
| Interval | 12h |
| Cache warm | +15 min after sync (post-sync only; startup public warm off) |
| Startup delay | 45 min + skip if last SUCCESS <6h |
| Import nice | TEP_SYNC_NICE=15 |

### Public catalog DTO rebuild (Catalog Worker, shared disk) — INC.504.5c

Prefer systemd timer over API child-spawn. API should use `DAIBILET_CATALOG_REBUILD_MODE=off`.

```bash
chmod +x /opt/daibilet/deploy/cron/rebuild-public-catalog-dto.sh
cp /opt/daibilet/deploy/systemd/daibilet-catalog-dto-rebuild.service /etc/systemd/system/
cp /opt/daibilet/deploy/systemd/daibilet-catalog-dto-rebuild.timer /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now daibilet-catalog-dto-rebuild.timer
# In /opt/daibilet/.env:
#   DAIBILET_CATALOG_REBUILD_MODE=off
systemctl restart daibilet-api
# Oneshoot first warm before traffic if disk empty:
systemctl start daibilet-catalog-dto-rebuild.service
```

| Setting | Value |
|---------|-------|
| Interval | 8 min (`OnUnitActiveSec`) |
| MemoryMax | 900M |
| Artifact | `var/cache/public-catalog-dto.json` (v2 + indexes) |
| P1 alert strings | `catalog disk staleness`, `legacy inline SQL fallback` |

tc-orders cron */10 must stay unchanged (flock preserved).

## Prod: SSR warm + healthcheck (`daibilet-tasks`)

Канон MSK (INC.504.17 / INC.504.19 / INC.504.20): один файл `/etc/cron.d/daibilet-tasks` + скрипт `ssr-healthcheck.sh`.

```bash
install -m 755 deploy/cron/ssr-healthcheck.sh /opt/daibilet/deploy/cron/ssr-healthcheck.sh
cp deploy/cron/daibilet-tasks /etc/cron.d/daibilet-tasks
chmod 644 /etc/cron.d/daibilet-tasks
# trailing newline required; do not install legacy daibilet-warm-hubs alongside
```

| Job | Schedule | Notes |
|-----|----------|-------|
| warm hubs | **OFF** (INC.504.20) | commented; optional `0 */2` after hang root cause closed |
| SSR healthcheck | `* * * * *` | `ssr-healthcheck.sh` via flock+timeout 90s; curl fail **or** TTFB>5s → **SIGKILL+start** + `pkill -f '[w]arm-hub-pages'`; log `/var/log/daibilet/ssr-health.log`; **INC.504.25:** SKIP while deploy active marker / missing prerender-manifest / cold-start grace 90s |

INC.504.19: не писать `TTFB=$(curl … \|\| echo 999)` - при hang multiline ломает `bc` и restart никогда не срабатывает.

INC.504.20: **не** держать inline `date +%Y…` / `%{time_…}` без `\%` в `/etc/cron.d/*` - cron трактует голый `%` как newline и обрезает CMD (healthcheck «стрелял» каждую минуту, но restart-ветка была мертва). Логика вынесена в `deploy/cron/ssr-healthcheck.sh`. Dry: `DAIBILET_SSR_HEALTH_DRY_RUN=1 DAIBILET_SSR_HEALTH_URL=http://127.0.0.1:39999/ /opt/daibilet/deploy/cron/ssr-healthcheck.sh`.

INC.504.25: `deploy-prod-next.sh` держит flock `/var/lock/daibilet-web-deploy.lock` + marker `daibilet-web-deploy.active` на всё окно stop→build→start→warm. Healthcheck при curl=7 mid-deploy больше не поднимает web на half-built `.next` (ENOENT `prerender-manifest.json` → crash-loop 502, в т.ч. на `/my-day`).

### OOM watch
`ash
chmod +x /opt/daibilet/deploy/scripts/oom-watch.sh
chmod +x /opt/daibilet/deploy/scripts/watch-tep-sync-load.sh
`

`
# Every 5 min: skim + alert log only when swap>350Mi or MemoryCurrent near MemoryHigh
*/5 * * * * /opt/daibilet/deploy/scripts/oom-watch.sh
`

- Skim: /var/log/daibilet/oom-watch.log
- Alerts only: /var/log/daibilet/oom-watch-alerts.log

Manual load sample around sync:

`
APP_DIR=/opt/daibilet DURATION_SEC=600 /opt/daibilet/deploy/scripts/watch-tep-sync-load.sh
`

### Postgres / dockerd (optional later — do NOT migrate without explicit request)
Prod PG stays in Docker (daibilet-tours-postgres:5437). Moving PG to host is optional capacity work; risk of data loss if rushed. Periodically docker system prune (already cron weekly) is enough to keep idle image/build cache from growing; do not stop the prod postgres container.

OOM checklist: journalctl -u daibilet-web -u daibilet-api -p err --since '24 hours ago'
