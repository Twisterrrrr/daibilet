# Launch Ops Pack

Дата: 2026-07-13.

Цель: запускать Daibilet на Timeweb Cloud по повторяемой процедуре, без ручной импровизации в день первых продаж.

## 1. Серверная Схема

Домены:

- `daibilet.ru` и `www.daibilet.ru` - public Next;
- `api.daibilet.ru` - backend API и public API alias;
- `admin.daibilet.ru` - админка под basic auth.

Сервисы:

- `daibilet-api.service` - backend `apps/backend/dist/server-entry.js`;
- `daibilet-public.service` - выбранный public target через `PUBLIC_APP_FILTER`;
- nginx - routing, SSL, admin basic auth;
- Postgres - основная БД.

Текущий безопасный public target:

```bash
PUBLIC_APP_FILTER=@daibilet/public
```

После приемки Cursor:

```bash
PUBLIC_APP_FILTER=@daibilet/web
```

## 2. Production Env

Шаблон без секретов:

```text
deploy/env.production.example
```

На сервере настоящий файл:

```bash
/opt/daibilet/.env
```

Обязательные группы:

- `DATABASE_URL`;
- `PORT`, `PUBLIC_PORT`, `PUBLIC_APP_FILTER`;
- `DAIBILET_SITE_URL`, `DAIBILET_BACKEND_API_URL`;
- admin auth: `ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH` или временно `ADMIN_PASSWORD`;
- Ticketscloud API/widget tokens;
- Teplohod `TEP_API_URL`, `TEP_WIDGET_ID`;
- `USER_JWT_SECRET` для buyer account.

Перед выкладкой:

```bash
cd /opt/daibilet
pnpm preflight:deploy -- --env-file /opt/daibilet/.env
```

## 3. Backup Перед Деплоем

Минимальный backup БД:

```bash
mkdir -p /opt/daibilet-backups
pg_dump "$DATABASE_URL" \
  --format=custom \
  --file="/opt/daibilet-backups/daibilet-$(date +%Y%m%d-%H%M%S).dump"
```

Проверить, что backup не пустой:

```bash
ls -lh /opt/daibilet-backups | tail
```

Restore на отдельную БД для проверки:

```bash
createdb daibilet_restore_check
pg_restore --dbname=daibilet_restore_check /opt/daibilet-backups/<file>.dump
```

## 4. Deploy Procedure

На сервере:

```bash
cd /opt/daibilet
GIT_BRANCH=<branch> RUN_LAUNCH_SMOKE=0 deploy/scripts/deploy-from-git.sh
```

Скрипт делает:

- `git fetch/checkout/pull`;
- `pnpm install --frozen-lockfile`;
- `pnpm db:generate`;
- `pnpm db:deploy`;
- `pnpm typecheck`;
- backend tests;
- backend build;
- выбранный public build;
- admin build;
- restart `daibilet-api` и `daibilet-public`;
- nginx reload;
- health checks.

## 5. Fresh Sync Перед Продажами

После деплоя и перед открытием трафика:

```bash
curl -u admin@daibilet.ru:'<password>' -X POST https://api.daibilet.ru/api/admin/sources/ticketscloud/sync
curl -u admin@daibilet.ru:'<password>' -X POST https://api.daibilet.ru/api/v1/tep/sync
```

Если Teplohod sync endpoint в конкретной ветке называется иначе, проверить `api.daibilet.ru` routes и не запускать fixture bridge на production.

После sync:

```bash
PUBLIC_BASE_URL=https://daibilet.ru \
ADMIN_BASE_URL=https://api.daibilet.ru \
ADMIN_EMAIL=admin@daibilet.ru \
ADMIN_PASSWORD='<password>' \
pnpm acceptance:catalog
```

## 6. Smoke

Admin/backend:

```bash
ADMIN_EMAIL=admin@daibilet.ru \
ADMIN_PASSWORD='<password>' \
pnpm readiness:admin -- \
  --api-url https://api.daibilet.ru \
  --admin-url https://api.daibilet.ru
```

Public launch:

```bash
PUBLIC_BASE_URL=https://daibilet.ru \
API_BASE_URL=https://api.daibilet.ru \
ADMIN_BASE_URL=https://api.daibilet.ru \
ADMIN_EMAIL=admin@daibilet.ru \
ADMIN_PASSWORD='<password>' \
pnpm smoke:launch
```

Catalog:

```bash
PUBLIC_BASE_URL=https://daibilet.ru \
ADMIN_BASE_URL=https://api.daibilet.ru \
ADMIN_EMAIL=admin@daibilet.ru \
ADMIN_PASSWORD='<password>' \
pnpm acceptance:catalog
```

## 7. Manual QA

Перед первыми продажами руками проверить:

- главная загрузилась без нулевых счетчиков;
- `/events` с фильтрами;
- карточка TC события открывает виджет;
- карточка Teplohod события открывает виджет;
- страница события показывает город, площадку, цены и до пяти ближайших сеансов;
- `/cities`, городская страница, `/venues`, страница площадки;
- лендинг с событиями без дублей;
- `/my-orders` или `/account/purchases`;
- admin Sources показывает свежий TC/Teplohod sync;
- admin Events, Orders, Buyers, Cities, Venues, Landings открываются.

## 8. Rollback

Самый быстрый rollback:

```bash
cd /opt/daibilet
git checkout <previous-good-sha>
pnpm install --frozen-lockfile
pnpm db:generate
pnpm --filter @daibilet/backend build
pnpm --filter "$PUBLIC_APP_FILTER" build
pnpm --filter @daibilet/admin build
systemctl restart daibilet-api
systemctl restart daibilet-public
systemctl reload nginx
```

Если проблема только в Cursor public:

```bash
PUBLIC_APP_FILTER=@daibilet/public
systemctl restart daibilet-public
```

Если применена плохая миграция:

1. Остановить сервисы.
2. Не делать ручные `DELETE/UPDATE` в production.
3. Поднять restore из последнего backup на отдельной БД.
4. Переключить `DATABASE_URL` только после проверки restore.

## 9. Launch Blockers

Не открывать продажи, если:

- `pnpm preflight:deploy` падает;
- `pnpm acceptance:catalog` падает;
- `pnpm readiness:admin` падает;
- `pnpm smoke:launch` падает;
- TC или Teplohod source stale после fresh sync;
- виджет TC или Teplohod не открывается руками;
- `stats.events` равен 0;
- каталог показывает временные слоты как отдельные события.

## 10. После Запуска

В первые сутки:

- проверять `pnpm monitor:lite` каждые 1-2 часа;
- смотреть admin Sources после каждого sync;
- сверить первые заказы в admin Orders;
- проверить, что покупатель может найти заказ по номеру;
- записывать все launch issues отдельным списком, без срочных рефакторингов.
