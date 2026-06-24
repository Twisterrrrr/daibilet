# Backend TypeScript migration

Дата старта: 2026-06-24.

Ветка: `backend-ts-foundation`.

## Решение по репозиторию

Остаемся в текущей монорепе:

- `apps/backend` - API, sync orchestration, DTO/read models;
- `apps/public` - public frontend;
- `apps/admin` - admin frontend;
- `packages/db` - Prisma schema and migrations.

Отдельный репозиторий сейчас не нужен: он усложнит деплой, миграции БД и синхронизацию контрактов между backend/admin/public. Отдельная ветка безопаснее: `main` остается deploy-ready, TS-миграция идет параллельно.

## Phase 1: foundation

Цель: включить TypeScript без изменения runtime-поведения backend.

Сделано:

- добавлен `apps/backend/tsconfig.json`;
- добавлены scripts `backend:typecheck` и `apps/backend:typecheck`;
- добавлены зависимости `typescript`, `tsx`, `@types/node`, `zod`;
- заведены типовые контракты в `apps/backend/src/types/*`;
- заведены первые zod-схемы payload/query границ.

Не делаем в Phase 1:

- не переименовываем `server.js`, `db.js`, `dto.js`;
- не меняем SQL;
- не меняем public/admin API shape;
- не включаем `checkJs` для монолитного `dto.js`, чтобы не получить шум вместо пользы.

## Phase 2: typed entry/db/server

Следующий шаг:

1. Создать `src/env.ts` с typed env loader.
2. Перевести `db.js` в `db.ts`.
3. Перевести безопасные helper-функции из `server.js` в typed modules:
   - auth;
   - http json response;
   - cache key;
   - body parsing.
4. Оставить route map прежним, чтобы не менять поведение.

Первый slice Phase 2:

- `src/env.ts` - typed `.env` loader + zod schema;
- `src/auth.ts` - Basic Auth config/checks + protected path predicate;
- `src/http.ts` - JSON/empty/auth responses, request URL, body parsing;
- `src/db.ts` - typed equivalent of current `db.js`.

Важно: production runtime пока остается на `server.js` + `db.js`. Новые TS-модули будут подключаться следующим шагом через `server.ts` или точечную замену helper-импортов после smoke.

## Phase 3: dto.js decomposition

Разрезать `dto.js` на 5-7 модулей:

- `sources.dto.ts`;
- `orders.dto.ts`;
- `admin-events.dto.ts`;
- `landings.dto.ts`;
- `public-catalog.dto.ts`;
- `public-pages.dto.ts`;
- `readiness.ts`.

Каждый модуль должен экспортировать typed функции и использовать контракты из `src/types`.

## Phase 4: validation and tests

Добавить runtime-валидацию на входе:

- public catalog query;
- admin event override;
- landing match payload;
- order ticket payload;
- sync env/source payload where practical.

Минимальные тесты:

- группировка слотов в одну карточку;
- priceFrom не ниже минимальной отображаемой цены;
- landing pin/exclude/review;
- widget payload TC/Teplohod;
- source health stale/error cases.

## Когда думать про Fastify/Nest

Fastify/Nest имеет смысл после того, как:

- продажи запущены;
- public/admin API shape стабилен;
- `dto.js` уже разрезан;
- есть хотя бы минимальные tests/snapshots.

До этого framework migration даст больше движения, чем результата.
