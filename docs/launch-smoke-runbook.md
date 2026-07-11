# Launch Smoke Runbook

Дата: 2026-07-11.

Цель: быстро проверить MVP после деплоя или после приемки Cursor `apps/web`, не смешивая smoke с ручным QA.

## Что Проверяет Скрипт

`pnpm smoke:launch` проверяет:

- public home, `robots.txt`, `sitemap.xml`;
- `/api/public/stats?refresh=1`;
- `/api/public/events?limit=12&sort=time&refresh=1`;
- detail API первого события из каталога;
- destinations, venues, city hub, venue hub;
- public API alias на `api.daibilet.ru`;
- backend `/api/health`;
- admin sources и наличие Ticketscloud + Teplohod;
- admin orders endpoint;
- опционально buyer lookup по точному номеру заказа/билета.

Скрипт не запускает sync по умолчанию. POST sync endpoints проверяются только с `--include-sync`.

## Локальный Smoke

В трех терминалах:

```bash
pnpm dev:backend
pnpm dev:public
pnpm dev:admin
```

Затем:

```bash
pnpm smoke:launch -- --skip-admin
```

Если backend запущен с basic auth:

```bash
ADMIN_EMAIL=admin@daibilet.ru ADMIN_PASSWORD=admin123 pnpm smoke:launch
```

## Production Smoke

После деплоя на Timeweb:

```bash
PUBLIC_BASE_URL=https://daibilet.ru \
API_BASE_URL=https://api.daibilet.ru \
ADMIN_BASE_URL=https://admin.daibilet.ru \
ADMIN_EMAIL=admin@daibilet.ru \
ADMIN_PASSWORD='<password>' \
pnpm smoke:launch
```

Если нужно проверить "Мои покупки" по точному номеру:

```bash
SMOKE_ORDER_LOOKUP='<order-or-ticket-number>' pnpm smoke:launch
```

Если нужно намеренно проверить sync endpoints:

```bash
pnpm smoke:launch -- --include-sync
```

## Cursor `apps/web`

Когда Cursor отдаст новый public target:

```bash
PUBLIC_APP_FILTER=@daibilet/web
```

Дальше smoke-команды не меняются. Nginx и systemd должны продолжать смотреть в `daibilet-public`, а конкретное Next-приложение выбирается через `PUBLIC_APP_FILTER`.

## Launch Blockers

Блокеры перед продажами:

- `stats.events` или `catalog.total` равны 0;
- public detail первого события не содержит город или площадку;
- `api.daibilet.ru/api/public/stats` не работает как alias;
- backend `/api/health` не отвечает;
- admin sources не содержит Ticketscloud или Teplohod;
- admin endpoint неожиданно отдает мок/ошибку вместо реального ответа.

Не блокеры:

- `SMOKE_ORDER_LOOKUP` не задан;
- sync endpoints не проверялись без `--include-sync`;
- city/venue hub пропущен, если в тестовом каталоге не нашлось slug.
