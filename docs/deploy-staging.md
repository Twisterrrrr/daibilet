# Deploy: Staging на Timeweb Cloud

Дата: 2026-07-09.

Цель: проверить `integrate/mvp-launch` на staging **без затирания** prod `daibilet.ru`.

## Директории

| Назначение | Путь |
|------------|------|
| Код staging | `/opt/daibilet-staging` |
| Public static | `/var/www/daibilet/staging` |
| Admin static | `/var/www/daibilet/staging-admin` |
| Prod (не трогать) | `/opt/daibilet` |

## Первичная установка на сервере

```bash
ssh root@213.171.7.16

cd /opt
git clone -b integrate/mvp-launch https://github.com/Twisterrrrr/daibilet.git daibilet-staging
cd /opt/daibilet-staging

cp .env.example .env
# Заполнить DATABASE_URL (можно ту же БД или отдельную staging-БД)
# PORT=4001 для staging API
```

Скопировать prod secrets (TC/TEP tokens) из `/opt/daibilet/.env` при использовании той же БД.

## Env staging

```bash
NODE_ENV=production
PORT=4001

DATABASE_URL=postgresql://...

DAIBILET_REQUIRE_ADMIN_AUTH=1
ADMIN_EMAIL=admin@daibilet.ru
ADMIN_PASSWORD=...

TICKETSCLOUD_API_TOKEN=...
TICKETSCLOUD_WIDGET_TOKEN=...
TEP_API_URL=https://api.teplohod.info/v1
TEP_WIDGET_ID=14208
```

Build-time:

```bash
PUBLIC_API_URL=https://api.daibilet.ru   # или staging API subdomain
PUBLIC_SITE_URL=https://staging.daibilet.ru
TEP_WIDGET_ID=14208
```

## Деплой одной командой

```bash
cd /opt/daibilet-staging
chmod +x deploy/scripts/deploy-staging.sh
BRANCH=integrate/mvp-launch ./deploy/scripts/deploy-staging.sh
```

Скрипт: `git pull`, `npm install`, migrations, build public+admin, rsync static, restart `daibilet-api-staging`, **post-deploy-check** (health, stats, widgets, invariants).

## Post-deploy (фаза D)

```bash
POST_DEPLOY_PUBLIC_BASE=https://staging.daibilet.ru PORT=4001 npm run check:post-deploy
npm run check:sync-invariants
npm run check:widgets -- --base https://staging.daibilet.ru
```

Parity typed vs legacy (нужен `DATABASE_URL`, опционально `start:ts` + `DAIBILET_TS_*`):

```bash
npm run check:parity
```

Env template: `deploy/env/staging.env.example`  
Nightly cron: `deploy/cron/README.md`

## Systemd

```bash
cp deploy/systemd/daibilet-api-staging.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now daibilet-api-staging
```

Service слушает `127.0.0.1:4001`.

## Nginx

Шаблон: `deploy/nginx/staging.daibilet.ru.conf.snippet`

- `staging.daibilet.ru` → `/var/www/daibilet/staging`
- `X-Robots-Tag: noindex, nofollow` — staging не индексируем
- `/api/` → upstream `daibilet_api_staging` (port 4001)

```bash
nginx -t && systemctl reload nginx
```

## Smoke staging

- [ ] `npm run check:post-deploy` (или автоматически из deploy-staging.sh)
- [ ] `curl http://127.0.0.1:4001/api/health`
- [ ] `https://staging.daibilet.ru/` — главная
- [ ] `/events`, event detail, city, venue, landing
- [ ] TC widget open
- [ ] Teplohod widget open
- [ ] Admin на staging-admin (basic auth)
- [ ] Sources / Events / Orders без mock data

## Переключение на prod

Только после полного smoke staging:

1. Backup `/opt/daibilet` и `/var/www/daibilet/*`
2. Merge `integrate/mvp-launch` → deploy branch
3. `deploy/scripts/deploy-from-git.sh` на prod
4. DNS/upstream switch по [deploy-timeweb.md](./deploy-timeweb.md)

**Не переключать `daibilet.ru` без staging smoke.**
