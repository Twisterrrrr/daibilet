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

Примечание 2026-07-11:

- public buyer lookup больше не должен зависеть от legacy handler в штатном public runtime;
- `GET /api/public/orders` и `GET /api/account/purchases` перенесены в `apps/public` как Next route handlers поверх Prisma;
- `GET /api/user/auth/*` пока остается за backend bridge, потому что там живет текущая логика refresh-cookie и выдачи JWT.

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

Provider session identity and typed catalog mapping, 2026-06-30:

- Prisma catalog теперь строит `upcomingSlots` из реальных `EventSession`, а не из representative event rows;
- для каждого слота читается `ProviderLink` с `entityKind=SESSION`;
- Ticketscloud получает `externalId` конкретного сеанса, Teplohod получает `externalParentId` события для своего widget contract;
- `landing-rules.ts` содержит типизированные правила и matcher, `public-catalog.mapper.ts` содержит mapper карточки и provider purchase routing;
- `public-catalog.dto.ts` больше не импортирует `LANDING_RULES` и `mapGroupedPublicSession` из `dto.js`;
- legacy-копии пока остаются внутри `dto.js` для прямого Node entrypoint и будут удалены после переключения production runtime на TS build/runner;
- добавлены 4 unit tests для landing constraints и session identity TC/Teplohod;
- catalog parity сохранился для time, price/maxPrice, category и search; 941 из 941 слотов проверенной выборки связаны с `ProviderLink SESSION`.

Cursor MVP integration, 2026-07-01:

- объединена ветка `feat/lovable-landings` (`c4f3b4b`) с `backend-ts-foundation`;
- сохранён полный public refresh: Lovable landings, catalog/cities/search, TC/Teplohod widgets, buyer account и статические страницы;
- Prisma catalog синхронизирован с новой open-date семантикой: 447 карточек в legacy и TS paths;
- TS landing rules получили canonical slugs `river-cruises`, `river-party`, `bus-tours`, `salute-9-may`, подкатегорийные сигналы и фильтр ночного расписания;
- hero stats теперь учитывает open-date события и совпадает с каталогом;
- buyer auth переведён на HMAC-SHA256, production требует `USER_JWT_SECRET`, credentialed CORS ограничен доменами Дайбилет;
- применена миграция `20260629150000_site_user`;
- browser smoke подтвердил главную, каталог, лендинг и login/account без console errors;
- landing audit учитывает open-date события и проходит 11 из 11 контрольных Teplohod cases;
- parity: 447 total, 935 из 935 проверенных catalog slots имеют `ProviderLink SESSION`.

Prisma public event detail, 2026-07-01:

- добавлен `public-event.dto.ts`: страница события собирается через Prisma из `Event`, `EventSession`, `EventOffer` и `ProviderLink`;
- одинаковые события провайдера остаются одной карточкой с ближайшими пятью сеансами, а не отдельными страницами по каждому времени;
- билетные категории и цены читаются из offer-уровня, цены ниже 100 рублей не попадают в публичную витрину;
- единый `provider-purchase.ts` использует identity сеанса для Ticketscloud и parent event identity для Teplohod;
- импортированное описание очищается от HTML, SEO override и ссылки на город/площадку сохраняют текущий public contract;
- новый route `GET /api/public/events/:slug` включается флагом `DAIBILET_TS_PUBLIC_EVENT=1`, legacy path остается fallback для контролируемого rollout;
- время `TIMESTAMP WITHOUT TIME ZONE` приводится из московского wall time к UTC в `public-datetime.ts`;
- event parity прошел для Ticketscloud, Teplohod с расписанием и Teplohod с открытой датой; catalog parity сохранился для 445 карточек и 916 session identities.

Границы следующих public read-models:

- каталог городов и каталог площадок остаются отдельными сущностями и маршрутами;
- подборки и лендинги не объединяются: подборка управляет составом карточек, лендинг содержит тематическую выдачу и контентные блоки;
- блог и внешние отзывы добавляются позже отдельными сущностями, без расширения `Event` универсальными JSON-полями.

Prisma public city read-model, 2026-07-01:

- добавлен `public-city.dto.ts` для `GET /api/public/destinations` и `GET /api/public/cities/:slug`;
- каталог направлений строится из сгруппированных public events: 22 самостоятельных города и 4 региональных агрегата, всего 26 направлений с двумя и более событиями;
- небольшие города сохраняют текущий routing в область, включая страницу `Московская область`, а canonical aliases `moscow -> moskva` и `saint-petersburg -> sankt-peterburg` работают на typed route;
- площадки городской страницы читаются через Prisma отдельно от будущего каталога площадок; их raw event count сохранен для parity с legacy;
- SEO-поля из `City` имеют приоритет, при их отсутствии DTO строит безопасный title, description и canonical path;
- route включается независимо через `DAIBILET_TS_PUBLIC_CITY=1`, общий invalidator сбрасывает catalog, event и city caches;
- city parity совпал с legacy для полного каталога направлений, Москвы и Московской области; live HTTP smoke подтвердил 154 события и 24 площадки Москвы, 2 события и 1 площадку области.

Остаточный performance-риск: первый typed `/api/public/destinations` ждет холодную сборку общего catalog read-model около 5 секунд. После прогрева city detail строится примерно за 120 ms. Перед включением флага по умолчанию нужно либо прогревать typed catalog при startup, либо материализовать легкий destination summary.

Prisma public venue read-model, 2026-07-01:

- добавлен отдельный `public-venue.dto.ts` для нового каталога `GET /api/public/venues` и существующей страницы `GET /api/public/venues/:slug`;
- каталог содержит 189 уникальных площадок с реальными сгруппированными public events; временные слоты не увеличивают счетчик площадки;
- detail сохраняет текущую семантику модерации: `HIDDEN` недоступен, `CANDIDATE` и `NONE` пока открываются, а `pageStatus` явно возвращается клиенту;
- расписание площадки строится из общего Prisma catalog read-model, related venues читаются отдельным Prisma-запросом по городу;
- ручные SEO-поля имеют приоритет, для пустых `seoH1`, title, description и canonical path создаются безопасные fallback-значения;
- route включается независимо через `DAIBILET_TS_PUBLIC_VENUE=1`, venue cache подключен к общему invalidator;
- venue parity прошел для `CANDIDATE` и простой локации `NONE`; live HTTP smoke подтвердил 189 площадок, detail 33 ms после catalog warmup и warm cache около 7 ms.

Новый backend-каталог площадок готов, но отдельный public route `/venues` еще нужно подключить в React после стабилизации backend read path. До массовой индексации администратор должен перевести готовые страницы из `CANDIDATE` в `PUBLISHED`.

Typed public stack warmup and venue catalog, 2026-07-01:

- добавлен `public-warmup.ts`: catalog Prisma read-model строится один раз, после него прогреваются destinations и venues;
- `DAIBILET_PUBLIC_PREWARM_BEFORE_LISTEN=1` откладывает открытие HTTP-порта до завершения legacy и typed warmup, поэтому первый покупатель не попадает в cold path;
- `.env.example` включает catalog, event, city и venue TS routes как единый проверенный stack;
- production systemd переведен с legacy `node apps/backend/src/server.js` на `npm --prefix apps/backend run start:ts`;
- deploy script устанавливает backend dependencies через `npm --prefix apps/backend ci`;
- добавлены 2 unit tests warmup orchestration, всего backend TS suite содержит 9 тестов;
- добавлен React-каталог `/venues` с верхними фильтрами по поиску, городу и типу, сортировкой и переходом на detail;
- related venues теперь считают сгруппированные карточки, а не raw provider slots: browser smoke убрал значения 1662/898 и вернул реальные 16/13/10;
- performance snapshot после prewarm: destinations 35/1 ms, venues 20/5 ms, Moscow city 38/9 ms; forced cold catalog остается warning около 4.9 s, warm 16 ms.

Browser smoke прошел на desktop и viewport 390x844: 189 площадок, фильтр `Douglas` возвращает одну карточку, переход открывает detail, горизонтального overflow и console errors нет.

Monorepo foundation and typed Source Health, 2026-07-02:

- корень переведен на единый pnpm workspace с пакетами `@daibilet/db`, `@daibilet/contracts` и `@daibilet/config`;
- production backend собирается через tsup в `apps/backend/dist/server-entry.js`, systemd больше не запускает source-файлы через `tsx` или npm;
- `GET /api/admin/sources` перехвачен typed handler и строится через Prisma DTO, legacy `buildAdminSources` остается только временным fallback для старого entrypoint;
- catalog sync и orders polling разделены в контракте и выбираются независимыми окнами истории, поэтому частые опросы заказов не скрывают состояние импорта каталога;
- counts учитывают `EventSourceLink` и `ProviderLink EVENT`, а временные слоты остаются сеансами и не увеличивают число сгруппированных карточек;
- admin Sources и Dashboard используют `@daibilet/contracts/source`; прототипный fallback источников из `data.js` удален;
- live parity с legacy: 2 источника, 601 сгруппированная карточка и 22 976 сеансов; production HTTP smoke подтвердил отдельные TC catalog/orders sync;
- TS suite содержит 14 unit-тестов и PostgreSQL integration test, включая source stale/error, purchase readiness, SQL counts и разделение sync-контуров.

Typed Dashboard and public home/stats, 2026-07-02:

- `GET /api/admin/dashboard` перехвачен typed handler и строится из SQL/Prisma read-model с launch metrics, без fallback на `data.js` в Dashboard UI;
- dashboard cache сбрасывается общим public invalidator и прогревается после sync/manual writes вместе с public read stack;
- `GET /api/public/stats`, `GET /api/public/home` и `GET /api/public/home/preview` вынесены в `public-home.dto.ts` и включаются флагом `DAIBILET_TS_PUBLIC_HOME=1`;
- hero stats больше не тянет весь public home: счетчик событий строится по saleable grouped cards и совпадает с typed catalog `total`;
- `stats.destinations` использует те же правила city/region routing, что и каталог: малые города вроде Раменского попадают в область, направления с одним событием не считаются отдельной посадочной;
- smoke на production bundle после mentor-fix: `/api/public/stats?refresh=1` сбрасывает общий public cache, следующий `/api/public/events?limit=1` подтвердил `stats.events=424` и `catalog.total=424`; warm `/api/public/home` 123 ms, `/api/public/home/preview` 45 ms, `destinations=26`, `venues=248`;
- backend TS suite содержит 21 unit-тест и 2 PostgreSQL integration tests, включая public home stats, refresh invalidation, warmup orchestration, source health и dashboard parity.

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
