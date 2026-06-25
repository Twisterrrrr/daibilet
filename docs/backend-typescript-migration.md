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
- `src/server-entry.ts` - parallel TS entrypoint that starts the existing `server.js` request handler.

Важно: production runtime пока остается на `server.js` + `db.js`. `server-entry.ts` нужен для smoke и постепенного сравнения поведения, а не для немедленного переключения production.

Smoke 2026-06-24:

- `npm run backend:typecheck` - ok;
- `node --check apps/backend/src/server.js` - ok;
- `PORT=4022 npm --prefix apps/backend run dev:ts` поднял сервер;
- `GET http://127.0.0.1:4022/api/health` вернул `200`.
- `PORT=4023 node apps/backend/src/server.js` поднял legacy entrypoint;
- `GET http://127.0.0.1:4023/api/health` вернул `200`.

Локальный warm cache во время smoke может падать, если Postgres `127.0.0.1:5437` не поднят. Это не блокирует проверку entrypoint, но для сравнения public/admin routes нужно поднимать DB.

Второй slice Phase 2:

- `src/routing.ts` - typed `RouteContext`, `matchPath`, `isRoute`;
- `src/validation.ts` - zod helpers для query/body payload и единая `validation_error` форма.

Эти модули пока не подключены к legacy `server.js`. Их задача - дать безопасный API для следующего шага: выносить маршруты по одному и сразу заменять raw `URLSearchParams`/payload на typed validation.

Пример будущего маршрута:

```ts
const context = createRouteContext(request, response);
if (isRoute(context, 'GET /api/public/events')) {
  const query = parseSearchParams(publicCatalogQuerySchema, context.searchParams);
  sendJson(response, await buildCatalogSessions(db, query));
}
```

## Phase 2.1: validated TS entrypoint

Цель: начать использовать TypeScript в реальном request flow, но не менять production-поведение legacy `server.js`.

Что сделано:

- добавлен `src/validated-handler.ts`;
- `server-entry.ts` запускает legacy `handleRequest` через TS-обертку;
- `server.js` получил опциональный `startServer({ handler })`, но прямой запуск `node src/server.js` по-прежнему использует старый handler;
- включена zod-валидация query-параметров для безопасных GET-маршрутов:
  - `GET /api/public/events`;
  - `GET /api/public/orders`;
  - `GET /api/admin/events`;
  - `GET /api/admin/orders`;
  - `GET /api/admin/venues`;
  - `GET /api/admin/buyers`;
  - `GET /api/admin/order-event-candidates`;
  - `GET /api/admin/landings`;
  - `GET /api/admin/landings/:slug/candidates`.

Ограничение: body validation для POST/PATCH пока не подключаем к legacy handler, потому что чтение body в TS-обертке потребит stream до старого обработчика. Это нужно делать уже при переносе конкретного route.

Smoke 2026-06-24:

- `npm run backend:typecheck` - ok;
- `node --check apps/backend/src/server.js` - ok;
- `PORT=4024 npm --prefix apps/backend run dev:ts` поднял TS entrypoint;
- `GET http://127.0.0.1:4024/api/health` вернул `200`;
- `GET http://127.0.0.1:4024/api/public/events?limit=9999` вернул `400 validation_error`;
- `PORT=4025 node apps/backend/src/server.js` поднял legacy entrypoint;
- `GET http://127.0.0.1:4025/api/health` вернул `200`.

Во время smoke локальный warm cache падал с `ECONNREFUSED 127.0.0.1:5437`, потому что Postgres не был поднят. Это не блокирует проверку entrypoint/validation, но для route-by-route сравнения нужна поднятая БД.

## Phase 2.2: first TS write route

Цель: перенести первый write-route в TS entrypoint целиком, чтобы body validation стала runtime-поведением, а не только подготовленной схемой.

Что сделано:

- добавлен `src/admin-landings-handler.ts`;
- `PATCH /api/admin/landings/:slug/matches/:eventId` теперь обрабатывается в TS entrypoint до legacy handler;
- TS entrypoint проверяет Basic Auth для protected routes до typed route handlers;
- body валидируется через `landingMatchPayloadSchema`;
- payload сохраняет `eventIds`/`groupEventIds`, чтобы ручное действие применялось ко всей группе слотов, а не к одному source-event;
- после записи вызывается тот же `invalidatePublicCaches('landing match update')`, что и в legacy route.

Важно: production `node src/server.js` все еще идет через legacy route. Новый write-route активен в `server-entry.ts`, чтобы можно было сравнивать поведение без риска для launch `main`.

Smoke 2026-06-24:

- `npm run backend:typecheck` - ok;
- `node --check apps/backend/src/server.js` - ok;
- `PORT=4026 DAIBILET_REQUIRE_ADMIN_AUTH=1 ADMIN_EMAIL=admin@daibilet.ru ADMIN_PASSWORD=admin123 npm --prefix apps/backend run dev:ts` поднял TS entrypoint;
- `GET /api/health` вернул `200`;
- `PATCH /api/admin/landings/river-walks/matches/evt_1` без auth вернул `401 admin_auth_required`;
- тот же `PATCH` с auth, но без `status`, вернул `400 validation_error`;
- тот же `PATCH` с auth и битым JSON body вернул `400 validation_error`;
- `GET /api/public/events?limit=9999` вернул `400 validation_error`;
- legacy `PORT=4027 node apps/backend/src/server.js` поднялся и `GET /api/health` вернул `200`.

## Phase 2.3: event override write route

Цель: перенести следующий admin write-route, который напрямую влияет на public SEO и контент карточки события.

Что сделано:

- добавлен `src/admin-events-handler.ts`;
- `PATCH /api/admin/events/:id/override` теперь обрабатывается в TS entrypoint до legacy handler;
- body валидируется через `eventOverridePayloadSchema`;
- пустые строки в nullable override-полях превращаются в `null`, что сохраняет поведение очистки override из UI;
- `editorStatus` ограничен publish-статусами `DRAFT`, `REVIEW`, `READY`, `PUBLISHED`, `HIDDEN`;
- после записи вызывается тот же `invalidatePublicCaches('event override update')`, что и в legacy route.

Важно: production `node src/server.js` все еще идет через legacy route. Новый event override route активен только в `server-entry.ts`.

Smoke 2026-06-24:

- `npm run backend:typecheck` - ok;
- `node --check apps/backend/src/server.js` - ok;
- schema smoke: `{ title: '  ', seoTitle: '  SEO  ' }` парсится как `{ title: null, seoTitle: 'SEO' }`;
- `PORT=4030 DAIBILET_REQUIRE_ADMIN_AUTH=1 ADMIN_EMAIL=admin@daibilet.ru ADMIN_PASSWORD=admin123 npm --prefix apps/backend run dev:ts` поднял TS entrypoint;
- `GET /api/health` вернул `200`;
- `PATCH /api/admin/events/evt_1/override` без auth вернул `401 admin_auth_required`;
- тот же `PATCH` с auth, но `editorStatus='BROKEN'`, вернул `400 validation_error`;
- тот же `PATCH` с auth и битым JSON body вернул `400 validation_error`;
- legacy `PORT=4031 node apps/backend/src/server.js` поднялся и `GET /api/health` вернул `200`.

DB smoke 2026-06-25:

- Postgres `127.0.0.1:5437` поднят, текущий объем: 8761 events, 248 venues, 59 cities, 5 landings;
- `PATCH /api/admin/events/evt_tep_17/override` через TS entrypoint записал `seoTitle='Codex smoke SEO title'`, БД вернула это значение, затем запись откатана к исходному состоянию;
- `PATCH /api/admin/landings/river-walks/matches/evt_tep_17` через TS entrypoint записал `manualStatus='PINNED'`, `score=1000`, затем `LandingMatch` откатан к исходному состоянию.

## Phase 2.4: event moderation write route

Цель: закрыть рядом с override второй write-route карточки события, который меняет редакционный статус.

Что сделано:

- `PATCH /api/admin/events/:id/moderation` обрабатывается в `src/admin-events-handler.ts`;
- добавлен `eventModerationPayloadSchema`;
- `editorStatus` обязательно должен быть одним из `DRAFT`, `REVIEW`, `READY`, `PUBLISHED`, `HIDDEN`;
- после записи вызывается `invalidatePublicCaches('event moderation update')`.

Smoke 2026-06-25:

- `npm run backend:typecheck` - ok;
- `node --check apps/backend/src/server.js` - ok;
- `PORT=4033 DAIBILET_REQUIRE_ADMIN_AUTH=1 ADMIN_EMAIL=admin@daibilet.ru ADMIN_PASSWORD=admin123 npm --prefix apps/backend run dev:ts` поднял TS entrypoint;
- `PATCH /api/admin/events/evt_tep_17/moderation` без auth вернул `401 admin_auth_required`;
- тот же `PATCH` с auth, но `editorStatus='BROKEN'`, вернул `400 validation_error`;
- успешный `PATCH` с `editorStatus='PUBLISHED'` записал статус в `EventOverride`, затем запись откатана к исходному состоянию.

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
