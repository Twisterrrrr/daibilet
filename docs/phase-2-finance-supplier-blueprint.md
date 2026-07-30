# Phase 2: финконтур, checkout и ЛК поставщика

Дата: 2026-07-09.

Основано на исследовании SPBBOATS:

- `docs/core/checkout.md`;
- `docs/product/finance.md`;
- `docs/ADMIN_V4_FREEZE_CRITERIA.md`;
- `docs/product/admin-v4-imported-sales.md`;
- `docs/archive/specs/SupplierOrdersArchitecture.md`;
- `docs/archive/specs/ReviewModuleSpec.md`;
- `packages/backend/prisma/schema.prisma`;
- `packages/backend/src/checkout/*`;
- `packages/backend/src/supplier/*`;
- `packages/backend/src/admin/admin-suppliers.controller.ts`;
- `packages/frontend-supplier*`.

## Цель фазы

Фаза 2 переводит Daibilet из чистого агрегатора в управляемый marketplace-контур:

- полный финконтур через Daibilet для выбранных поставщиков;
- собственный checkout параллельно с покупкой через виджеты;
- ЛК поставщика;
- операционная работа с заказами, выплатами, документами и отзывами;
- сохранение текущей widget-first модели для TC/Teplohod до готовности внутренних продаж.

## Главный принцип

Не заменяем виджетную модель одним рывком.

В системе одновременно живут два потока:

- `EXTERNAL` - покупка у поставщика/билетной системы через виджет или deeplink, источник истины `ExternalOrder`;
- `PLATFORM` - покупка через Daibilet/YooKassa, источник истины `CheckoutOrder`, `Payment`, `FulfillmentItem`.

Для пользователя и оператора сверху нужен единый read-model "покупка", но в БД нельзя смешивать эти контуры в одну неоднозначную таблицу.

## Что берем из SPBBOATS

### Checkout / payment инварианты

- Сумма платежа берется только из immutable snapshot заказа.
- После создания платежа snapshot нельзя менять.
- Один активный payment intent на одну попытку оплаты.
- Webhook обрабатывается идемпотентно.
- Fulfillment не создает дублей при повторном запуске.
- Checkout завершается только когда все позиции подтверждены или компенсированы.
- Состояния checkout/payment/refund меняются только через state machine.

### Двухконтурная корзина

SPBBOATS использовал `PurchaseFlow`:

- `PLATFORM` - оплачивается через нашу платформу;
- `EXTERNAL` - оплачивается у внешнего провайдера.

Для нас это особенно важно: TC/Teplohod остаются внешним контуром, а музеи/ручные поставщики могут идти через Daibilet checkout.

### Supplier finance

Берем идею слоев:

- ledger как источник истины по балансу поставщика;
- payouts поверх ledger;
- reports/documents поверх ledger;
- disputes блокируют выплаты;
- legal/bank snapshots не переписываются задним числом.

### Payment modes

Берем постепенную стратегию:

1. `SINGLE_MERCHANT` - деньги идут на Daibilet, чек от Daibilet.
2. `AGENT_SINGLE_PAYOUT` - деньги идут на Daibilet, но чек агентский, поставщик как принципал.
3. `SPLIT_MERCHANT` - целевой режим на будущее, когда будет понятна схема split.

Для запуска Phase 2 безопаснее стартовать с `SINGLE_MERCHANT` в sandbox и одном тестовом поставщике.

### Supplier LC read-first

ЛК поставщика стартует как read-first:

- дашборд;
- мои события;
- заказы;
- баланс;
- отчеты;
- документы;
- отзывы;
- реквизиты;
- команда;
- интеграции.

Редактирование критичных данных ограничено: payment settings и налоговая модель только через admin.

### Reviews

Берем ограничение:

- отзывы включаются только для внутренних/owned событий;
- для импортных TC/Teplohod событий отзывы отключены;
- поставщик не может скрывать отзыв сам;
- ответ поставщика проходит модерацию;
- dispute workflow есть, но без сложного арбитража в первой версии.

## Что не берем из SPBBOATS сейчас

- Полный NestJS-монолит и его контроллеры как есть.
- Большой trust score как обязательный gate.
- ЭДО как production-интеграцию.
- Подарочные сертификаты.
- Complex RBAC matrix.
- Supplier self-service редактирование всего каталога.
- Split-платежи на старте.
- Сложные threaded disputes и support chat.

## Архитектура Phase 2

### Backend modules

Новые модули лучше вводить постепенно:

- `checkout` - создание checkout order, snapshot, state machine;
- `payments` - YooKassa/STUB provider, payment state, webhooks;
- `fulfillment` - исполнение позиций заказа;
- `refunds` - заявки и processing возвратов;
- `suppliers` - admin/supplier read-models, роли, legal/bank;
- `supplier-finance` - ledger, payouts, reports, documents;
- `reviews` - internal/external reviews, supplier response, disputes.

### Public

Public должен уметь:

- показывать событие с `WIDGET_ONLY`, `INTERNAL_CHECKOUT`, `HYBRID`;
- открывать виджет для `EXTERNAL`;
- вести в наш checkout для `PLATFORM`;
- не смешивать кнопку "Купить" и "Перейти к поставщику" без понятной подписи;
- показывать отзывы только когда `reviewCapability=ENABLED`.

### Admin

Admin должен получить:

- Suppliers table/detail;
- supplier legal/bank profile;
- payment settings;
- supplier events/venues;
- internal checkout orders;
- external orders;
- refunds;
- payouts;
- reports/documents;
- review moderation.

### Supplier app

Supplier app можно делать отдельным `apps/supplier`, но начинать с минимального набора:

- auth/access через `SiteUser` + `SupplierUser`;
- dashboard;
- events read-only;
- orders;
- reviews;
- finance summary;
- requisites;
- team.

## Ближайший backlog

### Phase 2.0: DB contracts

Добавить недостающие рельсы в Prisma:

- `PurchaseFlow`;
- `FulfillmentItem`;
- `RefundRequest`;
- `ProcessedWebhookEvent`;
- `IdempotencyKey`;
- `PaymentEventLog`;
- `PaymentMode`, `PspFeeMode`;
- `SupplierLegalProfile`, `SupplierBankAccount`;
- `SupplierLedgerEntry`;
- `SupplierReport`, `SupplierReportLine`;
- `SupplierDocument`, `SupplierDocumentFile`;
- `SupplierSettlement`, `SupplierDispute`;
- `Review`, `ReviewSupplierResponse`, `ReviewDispute`, `ExternalReview`, `ReviewRequest`, `ReviewActionLog`.

### Phase 2.0b: event management and buyer account contracts

Этот слой обязателен для ЛК поставщика, но не должен блокировать первые продажи через виджеты.

События должны поддерживать четыре управленческих режима:

- `SOURCE_MANAGED` - импортные TC/Teplohod события, расписание и внешние id остаются source-managed;
- `DAIBILET_MANAGED` - админ Daibilet ведет событие от имени поставщика или площадки;
- `SUPPLIER_DRAFTS` - поставщик создает черновики и изменения, админ публикует после проверки;
- `SUPPLIER_SELF_SERVICE` - будущий режим для доверенных поставщиков.

Правило: админ не "притворяется поставщиком", а явно действует от имени поставщика с audit trail.

Контракты:

- `Event.supplierId` - основной поставщик события;
- `Event.purchaseFlow` - `EXTERNAL` или `PLATFORM`;
- `Event.managementMode` - кто управляет карточкой;
- `Event.scheduleLocked` - импортное расписание read-only, ручное расписание editable;
- `EventChangeRequest` - черновик/заявка поставщика на создание, правку, удаление, расписание, цены, SEO или публикацию;
- `EventChangeLog` - неизменяемый аудит действий админа, поставщика и системы;
- `SupplierEvent.canEdit*` - granular permissions для поставщика;
- `ExternalOrder.siteUserId` и normalized buyer contacts - привязка виджетных покупок к "Моим покупкам";
- `SiteUser.lastLoginAt`, `phone`, `emailVerifiedAt` - минимальное усиление buyer account без отдельного тяжелого auth-контура.

Расписание:

- `EventKind.SINGLE` - один слот;
- `EventKind.RECURRING` - повторяющаяся сетка слотов;
- `EventKind.OPEN_DATE` - билет без фиксированного сеанса;
- в одном `Event` нельзя смешивать open date и обычные слоты;
- `EventSession` получает capacity/isActive/cancel fields для будущих операций со слотами;
- `EventOffer` получает old price, group size, quota и weekday mask для нормальной модели ticket categories.

Buyer account:

- public UX остается "Мои покупки";
- в один read-model собираются `ExternalOrder` и будущие `CheckoutOrder`;
- технические слова "external", source ids и длинные внутренние id не показываются покупателю;
- внешний заказ можно привязать к пользователю по явному входу, e-mail/телефону или support/admin action.

### Phase 2.1: state machines and tests

- checkout state machine;
- payment state machine;
- fulfillment state machine;
- refund state machine;
- tests for valid/invalid transitions;
- tests for idempotent no-op.

Первый реализованный state layer: `event-change-request-state`.

Правила:

- `DRAFT -> SUBMITTED -> APPROVED -> APPLIED`;
- `APPROVED -> APPLY_FAILED` фиксирует сбой применения payload, после чего system может повторить `apply`;
- `SUBMITTED -> REJECTED`, затем `REJECTED -> DRAFT` после правок;
- `DRAFT`, `SUBMITTED`, `REJECTED` можно отменить только в разрешенных сценариях;
- `APPLIED` и `CANCELLED` являются terminal states;
- повторные `approve`, `apply`, `cancel`, `reject` в уже достигнутом статусе возвращают явный idempotent no-op;
- supplier может работать только в режимах `SUPPLIER_DRAFTS` и `SUPPLIER_SELF_SERVICE`;
- supplier не может запрашивать publish/unpublish/delete/archive;
- supplier schedule/offer/content/media/SEO changes требуют явных `SupplierEvent.canEdit*`;
- `scheduleLocked` блокирует schedule changes даже если событие временно ведется админом;
- `SOURCE_MANAGED` импортные TC/Teplohod офферы read-only для этого state layer;
- admin approve/reject и system apply разделены, чтобы later API мог безопасно писать audit и применять payload в транзакции.

Mentor follow-up:

- state layer обязан смотреть не только на `managementMode`, но и на `scheduleLocked`;
- apply должен быть транзакционным в будущем API: data write + `EventChangeLog` + status update вместе;
- `payload` по `requestType` должен получить typed validation перед подключением HTTP routes.

Второй реализованный слой: `event-change-request-payload`.

Правила:

- каждый `EventChangeRequest.type` имеет отдельную Zod-схему payload;
- лишние поля запрещены, чтобы technical/source ids не протекали в заявки;
- content/media/SEO updates требуют хотя бы одно осмысленное поле;
- `SCHEDULE_UPDATE` валидирует `SINGLE`, `RECURRING`, `OPEN_DATE` как разные режимы;
- `OPEN_DATE` нельзя смешивать с sessions или recurrence;
- `SINGLE` требует ровно один session;
- `RECURRING` требует recurrence rule или generated sessions;
- destructive admin requests (`DELETE`, `ARCHIVE`, `UNPUBLISH`) требуют `reason`;
- `OFFER_UPDATE` валидирует ticket categories: title, price, old price, capacity, group size, weekday mask;
- `CREATE` сверяет `event.kind` и `schedule.mode`.

Граница:

- это пока чистая validation library без HTTP route;
- перед apply нужен transaction layer и typed payload applier;
- optimistic guard по `baseSnapshot.eventUpdatedAt` будет добавлен при подключении БД.

Mentor follow-up 2026-07-10:

- generic `UPDATE` intentionally allows only content/media/SEO patches; schedule and ticket categories must use `SCHEDULE_UPDATE` and `OFFER_UPDATE`;
- validation has two modes: `draft` for saving work-in-progress and `apply` for DB writes;
- `CREATE` may be saved as a draft without schedule, but `apply` requires a schedule;
- every existing-event `apply` payload requires `baseSnapshot.eventUpdatedAt` for optimistic conflict checks;
- server-owned fields (`supplierId`, `purchaseFlow`, `managementMode`) are not accepted inside `CREATE.event`; API/applier context must derive them;
- all schedule date-times must include timezone (`Z` or explicit offset), and duplicate sessions are compared by actual instant, not by raw string;
- schedule `timezone`, when present, must be a valid IANA timezone;
- recurring schedule apply requires generated sessions; recurrence-only payloads stay draft-level until the expansion layer exists;
- `OFFER_UPDATE` requires explicit operation semantics: `UPSERT_LIST` or `REPLACE_ALL`;
- offer lists reject duplicate ids/titles, invalid old price, and invalid weekday mask.

Implemented transactional apply slice 2026-07-10:

- `event-change-request-applier` applies approved existing-event requests inside one Prisma transaction;
- apply checks state transition, payload apply-mode validation and `baseSnapshot.eventUpdatedAt`;
- content/media/SEO writes go through `EventOverride` where possible, preserving imported source fields;
- schedule apply replaces `EventSession` rows for manual/unlocked events and clears open-date/session conflicts;
- offer apply supports `UPSERT_LIST` and `REPLACE_ALL`; replace-all archives active offers before creating manual offers;
- request status is updated to `APPLIED` and `EventChangeLog` is written in the same transaction;
- admin route: `POST /api/admin/event-change-requests/:id/apply`;
- current exclusions: `CREATE` apply, contentBlocks storage, gallery storage and recurrence expansion service.

Implemented admin moderation/read API slice 2026-07-10:

- `GET /api/admin/event-change-requests` lists requests with status/type/supplier/event/search filters, pagination and facets;
- rows expose safe admin DTO fields and `payloadKeys`, not raw `payload`;
- `GET /api/admin/event-change-requests/:id` exposes payload preview, warnings and computed "current/proposed" diff;
- `POST /api/admin/event-change-requests/:id/approve` and `/reject` review submitted requests and write `EventChangeLog`;
- reject requires an admin comment;
- `POST /api/admin/event-change-requests/:id/apply` stays a separate system/apply step and invalidates public caches;
- contracts live in `packages/contracts/src/admin.ts`, so admin UI can be wired without retyping backend shapes;
- admin UI page `/change-requests` lists requests, filters by status/type/search, opens a detail drawer and exposes approve/reject/apply actions;
- raw payload editing and manual field-level merge are intentionally deferred.

### Phase 2.2: admin supplier control plane

- suppliers list/detail;
- legal/bank profile;
- payment settings;
- supplier users;
- supplier events/venues;
- readiness for internal checkout.

Статус 2026-07-22:

- ✅ contracts + Prisma read API: `GET /api/admin/suppliers`, `GET /api/admin/suppliers/:id`;
- ✅ admin page `/suppliers` с readiness, событиями, заказами, ledger/finance summary и отзывами;
- ✅ readiness guardrails покрыты unit-тестом;
- ⏳ write actions отложены: создание/редактирование поставщика, legal/bank update, payment settings update.

### Phase 2.2b: event schedule management

Checkout sells a concrete ticket category on a concrete slot, or an open-date product. Before enabling STUB/YooKassa checkout, admin must be able to inspect and edit manual schedules without touching imported TC/Teplohod schedules.

Status 2026-07-22:

- done: contracts for admin event schedule DTO, sessions and offers;
- done: backend routes `GET/PATCH /api/admin/events/:id/schedule`;
- done: backend routes to create, update, cancel and restore sessions;
- done: guardrails for `SOURCE_MANAGED`, `scheduleLocked`, `SINGLE`, `RECURRING`, `OPEN_DATE`, duplicate starts and capacity below sold;
- done: every schedule mutation writes `EventChangeLog` and invalidates public caches;
- done: minimal admin Schedule tab in event detail can unlock manual schedule, save mode, create slots, cancel and restore slots;
- next: Offers editor, recurrence-rule generator, then STUB checkout.

### Phase 2.3: checkout sandbox

- one manual/internal event;
- one supplier;
- STUB payment first;
- then YooKassa sandbox;
- payment webhook idempotency;
- fulfillment item issuance.

Status 2026-07-22:

- done: STUB checkout contract in `@daibilet/contracts/checkout`;
- done: public backend route `POST /api/checkout/stub`;
- done: `DAIBILET_STUB_CHECKOUT=1` is required to create stub orders in every non-test environment;
- done: checkout creates `CheckoutOrder`, `CheckoutItem`, `Payment(provider=MANUAL)`, `FulfillmentItem(provider=STUB)` and `SupplierLedgerEntry`;
- done: internal checkout is allowed only for `purchaseFlow=PLATFORM`, `managementMode=DAIBILET_MANAGED`, active supplier, manual active offer and a concrete future session or `OPEN_DATE`;
- done: imported TC/Teplohod events remain blocked from this path;
- done: idempotency is stored through `IdempotencyKey(scope=CHECKOUT_CREATE)`;
- done: `pnpm backend:checkout:seed-stub` creates one local manual open-date smoke product; add `-- --order` to create a STUB order directly;
- note: real YooKassa payment and fiscal receipt are intentionally not created in STUB mode.

Status 2026-07-30:

- done: YooKassa sandbox backend contour added next to STUB, not instead of widget-first sales;
- done: public backend route `POST /api/checkout/yookassa`;
- done: webhook route `POST /api/checkout/yookassa/webhook`;
- done: YooKassa create-payment flow creates local `CheckoutOrder(PENDING_PAYMENT)`, `CheckoutItem(RESERVED)`, `Payment(provider=YOOKASSA)` and `FulfillmentItem(PENDING)`;
- done: payment `succeeded` webhook confirms order, item and fulfillment and writes supplier ledger entries idempotently;
- done: payment `canceled` / failed path cancels local order and releases reserved capacity when possible;
- done: every non-test environment requires `DAIBILET_YOOKASSA_CHECKOUT=1` plus `YOOKASSA_SHOP_ID` and `YOOKASSA_SECRET_KEY`;
- done: `Idempotency-Key` is mandatory for `POST /api/checkout/yookassa` and is bound to the checkout payload;
- done: checkout redirect return URL is generated from server config, not accepted from arbitrary client input;
- done: route has a lightweight origin allowlist and in-memory rate limit; nginx/app-level production rate limits are still required;
- done: reconciliation/reaper CLI for expired `CheckoutOrder(PENDING_PAYMENT)` rows; remote YooKassa status is applied when `providerPaymentId` exists, and local reservations without provider id are expired safely.
- note: fiscal receipts are still not sent automatically; this must be enabled only after YooKassa/54-FZ settings and operator flow are approved.
- next before broad public enable: run live sandbox smoke, wire a scheduled server job for `pnpm backend:checkout:yookassa:reconcile -- --apply`, and add operator review for remote `pending` / `waiting_for_capture` payments that stay non-terminal for too long.

Sandbox env:

```bash
DAIBILET_YOOKASSA_CHECKOUT=1
DAIBILET_YOOKASSA_VERIFY_WEBHOOK=1
YOOKASSA_SHOP_ID=...
YOOKASSA_SECRET_KEY=...
YOOKASSA_RETURN_BASE_URL=https://daibilet.ru
```

Webhook to register in YooKassa LC:

```text
https://api.daibilet.ru/api/checkout/yookassa/webhook
```

Venue admission note:

- for MVP, museum/gallery/attraction entrance tickets can be represented as a manual `OPEN_DATE` event linked to the venue and classified as `VENUE_ADMISSION` in checkout DTO;
- long-term SPBBOATS-compatible model should add a separate `VenueAdmissionProduct` / venue-level offer layer, because some venues sell admission without a concrete event.

### Phase 2.4: orders and buyer account

- unified purchase read-model;
- external and internal purchases in "Мои покупки";
- admin order detail;
- manual operational notes;
- no technical ids in UI.

### Phase 2.5: supplier LC MVP

- ✅ read-first supplier dashboard: `GET /api/supplier/dashboard`;
- ✅ supplier events read model: `GET /api/supplier/events`;
- ✅ internal checkout order items: `GET /api/supplier/orders`;
- ✅ balance/ledger/payout snapshot: `GET /api/supplier/finance`;
- ✅ reviews queue: `GET /api/supplier/reviews`;
- ✅ legal/bank/profile snapshot: `GET /api/supplier/profile`;
- ✅ `apps/supplier` app shell;
- reports/documents write flows are deferred until real finance operations start.

### Phase 2.6: reviews MVP

- enable only for internal/owned events;
- post-purchase review request;
- moderation;
- supplier response moderation;
- dispute MVP.

### Phase 2.7: payouts and reports

- ledger movements on sale/commission/refund/payout;
- payout request;
- admin approval;
- report generation;
- document snapshot.

## Launch gates for Phase 2

Нельзя включать internal checkout для события, пока нет:

- поставщика;
- активного supplier-user owner/admin;
- legal profile;
- bank account или явной ручной payout-схемы;
- commission rule;
- payment mode;
- refund policy;
- public offer with price;
- payment provider config;
- test webhook smoke;
- admin order/refund screen;
- buyer purchase screen.

## Риски

- Юридическая модель чеков: кто продавец, кто агент, какие реквизиты в чеке.
- Возвраты: кто принимает решение, как отражается в ledger, как уведомляется покупатель.
- Mixed basket: если в корзине есть и widget, и Daibilet checkout, UX должен явно разделять оплату.
- PII: supplier не должен видеть лишние данные покупателя.
- Reviews: imported events не должны принимать отзывы, чтобы не спорить за чужое качество.

## Моя рекомендация

Идти не от YooKassa, а от state/contract слоя:

1. DB contracts и state machines.
2. Admin supplier/payment settings.
3. STUB checkout на одном событии.
4. YooKassa sandbox.
5. Supplier LC read-first.
6. Reviews.
7. Reports/payouts.

Так мы не закопаемся в финтех до того, как увидим первый управляемый внутренний заказ.
