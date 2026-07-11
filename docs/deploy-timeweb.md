# Deploy: Timeweb Cloud MVP

Дата: 2026-06-20.

Цель: поднять новый легкий MVP на сервере Timeweb Cloud без потери старой версии `daibilet.ru`.

## Известная инфраструктура

- IPv4: `213.171.7.16`.
- IPv6: `2a03:6f01:1:2::ef11`.
- SSH: `ssh root@213.171.7.16`.
- Public: `https://daibilet.ru`.
- Admin: `https://admin.daibilet.ru`.
- API: `https://api.daibilet.ru`.
- Временный admin login: `admin@daibilet.ru`.

## Что не затираем

Старую версию не заменяем сразу. Новый проект сначала поднимается в отдельной директории и проверяется на staging/upstream. Переключение домена делается только после smoke.

Рекомендуемые директории:

- `/opt/daibilet` - код приложения.
- `/var/www/daibilet/admin` - собранная admin.
- `/var/backups/daibilet` - архив старой версии перед переключением.

Public больше не выкладывается как static `dist`: `daibilet.ru` обслуживает Next.js server. Текущий default target - `@daibilet/public`; когда Cursor доведет `apps/web`, production target переключается через `PUBLIC_APP_FILTER=@daibilet/web`.

## GitHub

Новый репозиторий: `https://github.com/Twisterrrrr/daibilet.git`.

Локально:

```bash
git remote add origin https://github.com/Twisterrrrr/daibilet.git
git push -u origin main
```

На сервере:

```bash
cd /opt
git clone https://github.com/Twisterrrrr/daibilet.git daibilet
cd /opt/daibilet
```

Для безопасного запуска можно держать production на выбранной launch-ветке:

```bash
export GIT_BRANCH=integrate/mvp-launch
```

Если сервер будет тянуть приватный репозиторий в будущем, лучше выпустить deploy key. Сейчас репозиторий публичный.

## Env

На сервере нужен `/opt/daibilet/.env`. Секреты не коммитим.

Обязательные поля:

```bash
NODE_ENV=production
PORT=4000
PUBLIC_PORT=3000
PUBLIC_APP_FILTER=@daibilet/public
RUN_LAUNCH_SMOKE=0
DATABASE_URL=postgresql://...
DAIBILET_BACKEND_API_URL=http://127.0.0.1:4000
DAIBILET_SITE_URL=https://daibilet.ru

DAIBILET_REQUIRE_ADMIN_AUTH=1
ADMIN_EMAIL=admin@daibilet.ru
ADMIN_PASSWORD=...
# или лучше:
# ADMIN_PASSWORD_HASH=sha256:<hex>

TICKETSCLOUD_API_TOKEN=...
TICKETSCLOUD_WIDGET_TOKEN=...
TICKETSCLOUD_GRPC_ENDPOINT=simple.ticketscloud.com:443
TICKETSCLOUD_WIDGET_BASE_URL=https://ticketscloud.org/v1/widgets/common

TEP_API_URL=https://api.teplohod.info/v1
# Teplohod: токен не нужен, доступ по белому IP сервера (213.171.7.16 в allowlist)
TEP_WIDGET_ID=14208
TEP_WIDGET_BASE_URL=https://teplohod.info
```

Build-time env для фронтов:

```bash
# Public Next build
# После перехода на apps/web: PUBLIC_APP_FILTER=@daibilet/web
# В production оставляем пустым, чтобы public ходил в same-origin /api на daibilet.ru.
NEXT_PUBLIC_DAIBILET_API_URL=
NEXT_PUBLIC_SITE_URL=https://daibilet.ru
NEXT_PUBLIC_TEP_WIDGET_ID=14208
NEXT_PUBLIC_TC_WIDGET_TOKEN=...

# Admin Vite build
VITE_DAIBILET_API_URL=/api
VITE_DAIBILET_PUBLIC_URL=https://daibilet.ru
```

Для временного пароля можно оставить `ADMIN_PASSWORD`, но после запуска лучше заменить на `ADMIN_PASSWORD_HASH`.

Хеш можно получить так:

```bash
node -e "console.log('sha256:' + require('node:crypto').createHash('sha256').update(process.argv[1]).digest('hex'))" "admin123"
```

## Install/build

После первого `git clone` можно деплоить одной командой:

```bash
cd /opt/daibilet
chmod +x deploy/scripts/deploy-from-git.sh
deploy/scripts/deploy-from-git.sh
```

Скрипт делает `git pull` из `GIT_BRANCH` (`main` по умолчанию), ставит зависимости, применяет миграции, собирает выбранный Next public target через `PUBLIC_APP_FILTER` и admin, копирует только `apps/admin/dist` в `/var/www/daibilet/admin`, рестартует `daibilet-api` и `daibilet-public`, затем проверяет backend health и public stats. Если поставить `RUN_LAUNCH_SMOKE=1`, после рестарта дополнительно запускается `pnpm smoke:launch` по локальным service URL.

Ручной вариант ниже оставлен как fallback:

```bash
cd /opt/daibilet
pnpm install --frozen-lockfile

pnpm db:generate
pnpm db:deploy
pnpm typecheck
pnpm test
pnpm --filter @daibilet/backend build

PUBLIC_APP_FILTER=@daibilet/public
NEXT_PUBLIC_DAIBILET_API_URL= NEXT_PUBLIC_SITE_URL=https://daibilet.ru NEXT_PUBLIC_TEP_WIDGET_ID=14208 pnpm --filter "$PUBLIC_APP_FILTER" build
VITE_DAIBILET_API_URL=/api VITE_DAIBILET_PUBLIC_URL=https://daibilet.ru pnpm --filter @daibilet/admin build

mkdir -p /var/www/daibilet/admin
rsync -a --delete apps/admin/dist/ /var/www/daibilet/admin/
```

## Systemd services

Backend service:

```ini
[Unit]
Description=Daibilet API
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/daibilet
EnvironmentFile=/opt/daibilet/.env
ExecStart=/usr/bin/env node /opt/daibilet/apps/backend/dist/server-entry.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Public Next service:

```ini
[Unit]
Description=Daibilet Public Next.js
After=network.target daibilet-api.service
Wants=daibilet-api.service

[Service]
Type=simple
WorkingDirectory=/opt/daibilet
EnvironmentFile=/opt/daibilet/.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/env sh -lc 'PUBLIC_PORT="${PUBLIC_PORT:-3000}" pnpm --filter "${PUBLIC_APP_FILTER:-@daibilet/public}" preview'
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Команды:

```bash
cp deploy/systemd/daibilet-api.service /etc/systemd/system/daibilet-api.service
cp deploy/systemd/daibilet-public.service /etc/systemd/system/daibilet-public.service
systemctl daemon-reload
systemctl enable --now daibilet-api daibilet-public
systemctl status daibilet-api
systemctl status daibilet-public
```

Если systemd не видит Node/pnpm из `nvm`, нужно заменить `ExecStart` на полный путь к node/pnpm или добавить PATH override.

## Nginx routing

Рекомендуемая схема:

- `daibilet.ru` проксирует весь сайт в Next public server `127.0.0.1:3000`.
- `api.daibilet.ru/api/public/*` проксирует в Next public server, чтобы внешние smoke/API попадали в актуальные Prisma handlers.
- `api.daibilet.ru/api/health`, `/api/admin/*`, `/api/v1/tc/*`, `/api/v1/tep/*` проксируются в backend `127.0.0.1:4000`.
- `admin.daibilet.ru` отдает `/var/www/daibilet/admin` и проксирует `/api/*` на backend. Вся admin-зона дополнительно закрыта basic auth.

Backend тоже защищает `/api/admin/*`, `/api/v1/tc/*`, `/api/v1/tep/*`, `/api/db/*`, поэтому даже прямой доступ к `api.daibilet.ru/api/admin/...` должен получить `401`.

Шаблон nginx лежит в `deploy/nginx/daibilet.conf.example`.

Для временного basic auth:

```bash
apt-get update
apt-get install -y apache2-utils
htpasswd -bc /etc/nginx/.htpasswd-daibilet-admin admin@daibilet.ru '<password>'
cp deploy/nginx/daibilet.conf.example /etc/nginx/sites-available/daibilet.conf
ln -s /etc/nginx/sites-available/daibilet.conf /etc/nginx/sites-enabled/daibilet.conf
nginx -t
systemctl reload nginx
```

Если SSL уже подключен через панель Timeweb, нужно перенести server blocks в существующий SSL-конфиг или добавить `listen 443 ssl` с актуальными путями сертификатов.

## First sync

После запуска API:

```bash
curl https://api.daibilet.ru/api/health
curl -u "admin@daibilet.ru:<password>" -X POST https://admin.daibilet.ru/api/v1/tc/sync
curl -u "admin@daibilet.ru:<password>" -X POST https://admin.daibilet.ru/api/v1/tep/sync
curl "https://daibilet.ru/api/public/stats?refresh=1"
curl "https://api.daibilet.ru/api/public/stats?refresh=1"
```

Teplohod лучше проверять именно на сервере `213.171.7.16`, потому что этот IP добавлен в whitelist.

## Smoke before DNS/upstream switch

- Public home открывается быстро, счетчики событий/городов/площадок не равны нулю.
- `/events` показывает сгруппированные события, а не слоты.
- Event detail показывает город, площадку, категории билетов, 5 ближайших сеансов и кнопку виджета.
- TC widget открывается.
- Teplohod widget открывается на событии Teplohod.
- Admin открывается только после basic auth.
- `api.daibilet.ru/api/admin/dashboard` без auth возвращает `401`.
- Sources показывает TC и Teplohod, last sync, counts, ошибки.
- Orders/Buyers не показывают моковые данные.

Автоматический вариант:

```bash
PUBLIC_BASE_URL=https://daibilet.ru \
API_BASE_URL=https://api.daibilet.ru \
ADMIN_BASE_URL=https://admin.daibilet.ru \
ADMIN_EMAIL=admin@daibilet.ru \
ADMIN_PASSWORD='<password>' \
pnpm smoke:launch
```

Подробнее: [Launch Smoke Runbook](launch-smoke-runbook.md).
