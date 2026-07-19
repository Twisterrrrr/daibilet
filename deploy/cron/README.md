# Cron jobs

После deploy фаз A–D на staging/prod.

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

## Prod (опционально: nightly health)

```
15 5 * * * APP_DIR=/opt/daibilet PUBLIC_BASE=https://daibilet.ru PORT=4000 /opt/daibilet/deploy/cron/nightly-health.sh
```

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

	c-orders cron */10 must stay unchanged (flock preserved).

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
