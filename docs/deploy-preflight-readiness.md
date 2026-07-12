# Deploy Preflight And Admin Readiness

Дата: 2026-07-12.

Цель: до переключения `daibilet.ru` быстро понять, готов ли серверный контур, env и админские API. Это отдельный слой от ручного QA и от Cursor `apps/web`.

## 1. Deploy Preflight

Команда:

```bash
pnpm preflight:deploy -- --env-file .env
```

На сервере:

```bash
cd /opt/daibilet
pnpm preflight:deploy -- --env-file /opt/daibilet/.env
```

Что проверяется:

- Node.js 22+ и наличие `pnpm`;
- обязательные deploy-файлы: systemd, nginx, deploy script, smoke script;
- env: `DATABASE_URL`, `PORT`, `PUBLIC_PORT`, `PUBLIC_APP_FILTER`, `DAIBILET_BACKEND_API_URL`, `DAIBILET_SITE_URL`;
- admin auth env;
- Ticketscloud и Teplohod env;
- выбранный package из `PUBLIC_APP_FILTER` существует и имеет `build` + `preview`;
- deploy script и `daibilet-public.service` действительно используют `PUBLIC_APP_FILTER`;
- nginx route для `api.daibilet.ru/api/public/*`;
- git branch и чистота рабочего дерева.

Перед запуском с Cursor `apps/web`:

```bash
PUBLIC_APP_FILTER=@daibilet/web pnpm preflight:deploy -- --env-file .env
```

Блокеры:

- выбранный `PUBLIC_APP_FILTER` не существует;
- `DATABASE_URL` не задан;
- `PORT` и `PUBLIC_PORT` совпадают;
- нет admin auth;
- нет TC/Teplohod env для источников;
- отсутствуют deploy/systemd/nginx файлы.

Warnings не всегда блокируют запуск, но их надо прочитать. Пример: `DATABASE_URL` на localhost допустим, если Postgres живет на том же сервере.

## 2. Admin/Backend Readiness

Команда:

```bash
ADMIN_EMAIL=admin@daibilet.ru \
ADMIN_PASSWORD='<password>' \
pnpm readiness:admin -- \
  --api-url https://api.daibilet.ru \
  --admin-url https://admin.daibilet.ru
```

Локально:

```bash
ADMIN_EMAIL=admin@daibilet.ru ADMIN_PASSWORD=admin123 pnpm readiness:admin
```

Что проверяется:

- `/api/health`;
- admin endpoint без auth должен вернуть `401`;
- `/api/admin/dashboard`;
- `/api/admin/sources` и наличие Ticketscloud + Teplohod;
- `/api/admin/events`;
- `/api/admin/orders`;
- `/api/admin/buyers`;
- `/api/admin/event-change-requests`;
- `/api/admin/venues`;
- `/api/admin/cities`;
- `/api/admin/landings`.

Команда read-only: она не запускает sync, не approve/reject/apply, не меняет данные.

Блокеры:

- backend health не отвечает;
- admin доступен без auth на production;
- нет Ticketscloud или Teplohod в sources;
- пустой events/venues/cities каталог перед запуском продаж;
- критичный admin endpoint возвращает 500/404.

Не блокеры:

- orders пустые до первых продаж;
- buyers пустые до первых продаж;
- change requests пустые;
- landings пустые, если запускаем только общий каталог.

## 3. Порядок Перед Переключением Домена

1. `pnpm preflight:deploy -- --env-file /opt/daibilet/.env`.
2. `pnpm build` или deploy script.
3. `pnpm readiness:admin` по production доменам.
4. `pnpm smoke:launch` по production доменам.
5. Ручной smoke виджетов TC/Teplohod.
6. Только потом переключать/оставлять `daibilet.ru` на новом Next public.
