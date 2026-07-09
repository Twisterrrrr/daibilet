# Cron: nightly health checks

После deploy фаз A–D на staging/prod.

## Staging (рекомендуется)

```bash
chmod +x /opt/daibilet-staging/deploy/cron/nightly-health.sh
chmod +x /opt/daibilet-staging/scripts/post-deploy-check.sh

crontab -e
```

```
15 4 * * * APP_DIR=/opt/daibilet-staging PUBLIC_BASE=https://staging.daibilet.ru /opt/daibilet-staging/deploy/cron/nightly-health.sh
```

Лог: `/var/log/daibilet/nightly-health.log`

## Prod (опционально)

```
15 5 * * * APP_DIR=/opt/daibilet PUBLIC_BASE=https://daibilet.ru PORT=4000 /opt/daibilet/deploy/cron/nightly-health.sh
```

## Parity (раз в неделю, только staging с typed stack)

```
0 3 * * 0 cd /opt/daibilet-staging && bash scripts/run-parity-check.sh >> /var/log/daibilet/parity.log 2>&1
```

Требует `DATABASE_URL` и `DAIBILET_TS_*=1` + `start:ts`.
