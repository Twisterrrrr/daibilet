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
- `/var/www/daibilet/public` - собранный public.
- `/var/www/daibilet/admin` - собранная admin.
- `/var/backups/daibilet` - архив старой версии перед переключением.

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

Если сервер будет тянуть приватный репозиторий в будущем, лучше выпустить deploy key. Сейчас репозиторий публичный.

## Env

На сервере нужен `/opt/daibilet/.env`. Секреты не коммитим.

Обязательные поля:

```bash
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://...

DAIBILET_REQUIRE_ADMIN_AUTH=1
ADMIN_EMAIL=admin@daibilet.ru
ADMIN_PASSWORD=...
# или лучше:
# ADMIN_PASSWORD_HASH=sha256:<hex>

TICKETSCLOUD_API_TOKEN=...
TICKETSCLOUD_WIDGET_TOKEN=...
TICKETSCLOUD_GRPC_ENDPOINT=simple.ticketscloud.com:443
TICKETSCLOUD_WIDGET_BASE_URL=https://ticketscloud.org/v1/widgets/common

TEP_API_URL=...
TEP_WIDGET_ID=14208
TEP_WIDGET_BASE_URL=https://teplohod.info
```

Build-time env для фронтов:

```bash
# Public build
VITE_DAIBILET_API_URL=https://api.daibilet.ru
VITE_TEP_WIDGET_ID=14208

# Admin build
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

Скрипт делает `git pull`, ставит зависимости, применяет миграции, собирает public/admin, копирует `dist` в `/var/www/daibilet/*`, рестартует `daibilet-api` и проверяет `/api/health`.

Ручной вариант ниже оставлен как fallback:

```bash
cd /opt/daibilet
npm install
npm --prefix apps/public ci
npm --prefix apps/admin ci

npm run db:generate
npm run db:migrate

VITE_DAIBILET_API_URL=https://api.daibilet.ru VITE_TEP_WIDGET_ID=14208 npm run public:build
VITE_DAIBILET_API_URL=/api VITE_DAIBILET_PUBLIC_URL=https://daibilet.ru npm run admin:build

mkdir -p /var/www/daibilet/public /var/www/daibilet/admin
rsync -a --delete apps/public/dist/ /var/www/daibilet/public/
rsync -a --delete apps/admin/dist/ /var/www/daibilet/admin/
```

## Backend service

Systemd-шаблон:

```ini
[Unit]
Description=Daibilet API
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/daibilet
EnvironmentFile=/opt/daibilet/.env
ExecStart=/usr/bin/env node apps/backend/src/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Команды:

```bash
cp deploy/systemd/daibilet-api.service /etc/systemd/system/daibilet-api.service
systemctl daemon-reload
systemctl enable --now daibilet-api
systemctl status daibilet-api
```

Если systemd не видит Node из `nvm`, нужно заменить `ExecStart` на полный путь к node.

## Nginx routing

Рекомендуемая схема:

- `daibilet.ru` отдает `/var/www/daibilet/public`.
- `api.daibilet.ru` проксирует только `/api/public/*` и `/api/health` наружу.
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

