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

## Prod: Teplohod orders-only (каркас; ждёт токен партнёра)

Orders-only — **не** каталог (`tep:sync`). Candidate endpoint: `https://account.teplohod.info/api/orders` (prod probe → **401** без auth). Каталожный `api.teplohod.info/v1/orders` — **404**.

```bash
chmod +x /opt/daibilet/deploy/cron/tep-orders-sync.sh
mkdir -p /var/log/daibilet
crontab -e
```

```
*/15 * * * * APP_DIR=/opt/daibilet /opt/daibilet/deploy/cron/tep-orders-sync.sh >> /var/log/daibilet/tep-orders-sync.log 2>&1
```

- Интервал: **15 минут**.
- Без `TEP_ORDERS_TOKEN` скрипт пишет `status=BLOCKED` и exit 0 (не врёт SUCCESS / не импортирует).
- После выдачи токена: `TEP_ORDERS_TOKEN=…` (+ опц. `TEP_ORDERS_API_URL`, `TEP_ORDERS_AUTH=bearer|access-token|both`).
- Ручной прогон: `npm run tep:orders -- --probe` / `--dry-run` / `--from=… --to=…`.
- Лог: `/var/log/daibilet/tep-orders-sync.log`
- `tc-orders` cron не менять.

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

Teplohod auto-sync is **in-process** (TEP_AUTO_SYNC_* in .env / `apps/backend/src/server.js`), not cron.
`tc-orders` cron `*/10` must stay unchanged.

| Setting | Value |
|---------|-------|
| Interval | 12h (`TEP_AUTO_SYNC_INTERVAL_MS=43200000`) |
| Cache warm | +15 min after sync (`TEP_AUTO_SYNC_WARM_DELAY_MS=900000`) |
| Startup delay | 10 min (avoids sync storm on every restart) |
| Import nice | `TEP_SYNC_NICE=15` |

`ash
chmod +x /opt/daibilet/deploy/scripts/watch-tep-sync-load.sh
chmod +x /opt/daibilet/deploy/scripts/oom-watch.sh
`

`
# Hourly OOM skim
7 * * * * /opt/daibilet/deploy/scripts/oom-watch.sh
`

Manual load sample around sync:

`
APP_DIR=/opt/daibilet DURATION_SEC=600 /opt/daibilet/deploy/scripts/watch-tep-sync-load.sh
`

OOM checklist: `journalctl -u daibilet-web -u daibilet-api -p err --since '24 hours ago'`
