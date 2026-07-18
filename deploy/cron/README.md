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
- Teplohod orders: отдельного импортёра пока нет (нужен API партнёра).

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
