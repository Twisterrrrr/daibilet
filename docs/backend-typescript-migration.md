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

## Phase 2.5: order ticket write route

Цель: перенести launch-critical route ручного добавления/обновления билета в заказе, потому что оператору нужно быстро вписывать реальные номера билетов и статусы.

Что сделано:

- добавлен `src/admin-orders-handler.ts`;
- `POST /api/admin/orders/:id/tickets` обрабатывается в TS entrypoint до legacy handler;
- `orderTicketPayloadSchema` расширена под реальный UI payload: `externalTicketId`, `number`, `ticketNumber`, `ticketId`, `eventId`, `sessionId`, `status`, `ticketStatus`;
- typed handler сохраняет legacy-доменные ошибки `ticket_number_required` и `order_not_found`, а `validated-handler.ts` теперь отдает `error.statusCode` как настоящий HTTP status.

Smoke 2026-06-25:

- `npm run backend:typecheck` - ok;
- `node --check apps/backend/src/server.js` - ok;
- `PORT=4034 DAIBILET_REQUIRE_ADMIN_AUTH=1 ADMIN_EMAIL=admin@daibilet.ru ADMIN_PASSWORD=admin123 npm --prefix apps/backend run dev:ts` поднял TS entrypoint;
- `POST /api/admin/orders/extord_tc_698b97b8114fe9ea0d071479/tickets` без auth вернул `401 admin_auth_required`;
- тот же `POST` с auth, но без номера билета, вернул `400 ticket_number_required`;
- `POST /api/admin/orders/not-a-real-order/tickets` с auth вернул `404 order_not_found`;
- успешный `POST` создал `ExternalTicket` с `origin='manual'`, затем тестовый билет удален и `ExternalOrder.updatedAt` восстановлен.

## Phase 3: dto.js decomposition

Перед началом декомпозиции зафиксирован legacy-аудит: [`legacy-schema-audit.md`](legacy-schema-audit.md). Главный вывод: не копировать большой SPBBOATS `schema.prisma`, а перенести его зрелые инварианты - `Event -> Session -> Offer -> ProviderLink`, readiness codes с backend и landing blocks/filter engine.

Разрезать `dto.js` на 5-7 модулей:

- `sources.dto.ts`;
- `orders.dto.ts`;
- `admin-events.dto.ts`;
- `landings.dto.ts`;
- `public-catalog.dto.ts`;
- `public-pages.dto.ts`;
- `readiness.ts`.

Каждый модуль должен экспортировать typed функции и использовать контракты из `src/types`.

Перед массовым переносом read-models в Prisma нужно сделать маленький Prisma bridge в `packages/db` и additive-решение для source identity на уровне session/offer. Иначе TS просто типизирует текущую DTO-сложность, но не устранит причину: TC slot сейчас местами ведет себя как отдельный `Event`, хотя доменно это `EventSession`.

Prisma bridge, 2026-06-25:

- добавлен `packages/db/src/client.ts` с singleton `PrismaClient` + `PrismaPg` adapter;
- добавлен `packages/db/scripts/smoke.ts`;
- добавлены scripts `db:typecheck` и `db:smoke` в root/package db;
- smoke на живой БД вернул: 8761 events, 22976 sessions, 9111 offers, 248 venues, 59 cities, 5 landings, 13 externalOrders, 0 externalTickets.

ProviderLink additive layer, 2026-06-25:

- добавлен enum `ProviderEntityKind` и модель `ProviderLink` для `EVENT`, `SESSION`, `OFFER`, `VENUE`;
- старый `EventSourceLink` остается как compatibility layer;
- добавлены миграции `20260625173000_provider_links` и `20260625174500_provider_links_backfill`;
- backfill и корректировка Teplohod offer identity заполнили 40901 provider links: 8761 EVENT, 22976 SESSION, 9111 OFFER, 53 VENUE;
- миграция `20260630113000_provider_offer_identity_fix` закрепила `ticket.id` как внешний id билетной категории Teplohod, а `eventId` как parent id;
- `migrate status` показывает 9 миграций и `Database schema is up to date`;
- smoke теперь проверяет `providerLinks`.

First Prisma public catalog slice, 2026-06-30:

- добавлен `provider-links.repository.ts` для typed lookup внешних identity;
- добавлен `public-catalog.dto.ts`: Prisma raw read-model + typed filters/facets/sort/pagination/cache;
- source event identity читается из `ProviderLink`, `EventSourceLink` остается fallback;
- `public-catalog-handler.ts` подключает новый DTO в TS entrypoint по флагу `DAIBILET_TS_PUBLIC_CATALOG=1`;
- query schema синхронизирована с public UI: добавлены `maxPrice` и `destination`, `priceMax` оставлен как alias;
- TS entrypoint регистрирует `clearPublicCatalogDtoCache` через общий `registerPublicCacheInvalidator`, поэтому sync/manual writes сбрасывают legacy и Prisma cache вместе;
- добавлен `npm run backend:catalog:parity` для сравнения legacy и Prisma DTO;
- parity прошел для time, price/maxPrice, category и search: total, первые ids и facets совпали;
- HTTP smoke: cold Prisma path около 2.0-2.2 s, warm path 4-7 ms, 324 сгруппированные карточки.

Флаг пока выключен по умолчанию только для контролируемого rollout и parity-наблюдения. Cache invalidation уже объединен между legacy и Prisma path.

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
