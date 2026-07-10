# Текущий статус Daibilet

Дата обновления: 2026-07-10.

## Коротко

Мы строим легкий монорепозиторий Daibilet поверх Prisma, TypeScript и pnpm workspace. Текущий MVP остается widget-first: покупка идет через Ticketscloud и Teplohod.info, финансовый контур и чеки пока не проходят через Daibilet.

Рабочая ветка Codex: `codex/phase2-foundation`.

## Главный этап

Сейчас проект на этапе backend/DB hardening перед финальной интеграцией public/admin и деплоем.

Основной вектор:

1. Не затирать текущую live-версию daibilet.ru.
2. Не накатывать Cursor UI поверх Codex backend вслепую.
3. Довести Prisma-backed DTO и migration story.
4. Дать Cursor четкий промпт/ветку для деплоя или интеграции.
5. После стабилизации перейти к фазе 2: YooKassa и ЛК поставщика.

## Что готово

- Монорепо: `apps/public`, `apps/admin`, `apps/backend`, `packages/db`, `packages/contracts`, `packages/config`.
- Prisma schema и shared Prisma client в `packages/db`.
- Backend TypeScript foundation и typed entrypoint.
- Typed public DTO/read-models для ключевых public-контуров.
- ProviderLink как единый слой identity для provider `EVENT`, `SESSION`, `OFFER`, `VENUE`.
- Событие доменно считается карточкой, а временной слот - `EventSession`.
- Public catalog группирует слоты и не должен показывать один слот как отдельное событие.
- Admin sources отделяет catalog sync от orders sync.
- Readiness codes заведены на backend-стороне.
- Buyer account и "Мои покупки" заведены в MVP-логике.
- External orders остаются зеркалом покупок через виджеты.
- Teplohod локально работает через fixture bridge, production должен использовать белый IP сервера.
- Заложена БД-основа фаз 2-4:
  - поставщики и доступы;
  - комиссии и выплаты;
  - внутренний checkout;
  - YooKassa payment/fiscal receipt foundation;
  - trip planner и единый ваучер.
- Начата Phase 2.0 после исследования SPBBOATS:
  - fulfillment/refund/idempotency contracts;
  - supplier legal/bank/report/document contracts;
  - review contracts;
  - payment modes для `SINGLE_MERCHANT` / agent / split будущего.

## Что не включено в текущий MVP runtime

- YooKassa платежи через Daibилет.
- Фискализация чеков через Daibilet.
- Возвраты через Daibilet.
- Баланс, акты и полноценные выплаты поставщикам.
- Supplier self-service с самостоятельным управлением каталогом.
- Единый внутренний checkout.
- Trip planner с единым ваучером.
- Полноценный блог и внешние отзывы.

Эти блоки уже можно строить на новой схеме, но включать их нужно отдельными фазами.

## Последняя крупная DB-закладка

Добавлена миграция:

```text
packages/db/prisma/migrations/20260709210000_marketplace_phase_foundation/migration.sql
```

Она добавляет foundation под:

- `Supplier`, `SupplierUser`, `SupplierVenue`, `SupplierEvent`;
- `SupplierCommissionRule`;
- `CheckoutOrder`, `CheckoutItem`, `Payment`, `FiscalReceipt`;
- `Payout`, `PayoutItem`;
- `TripPlan`, `TripPlanItem`, `TripVoucher`, `TripVoucherItem`.

Граница: миграция аддитивная. Она не меняет поведение сегодняшних покупок через виджеты.

Добавлена Phase 2.0 миграция:

```text
packages/db/prisma/migrations/20260709223000_phase2_commerce_supplier_contracts/migration.sql
```

Она добавляет contract слой для параллельного внутреннего checkout и будущего ЛК поставщика:

- `PurchaseFlow`, `FulfillmentItem`, `RefundRequest`;
- `ProcessedWebhookEvent`, `PaymentEventLog`, `IdempotencyKey`;
- supplier legal/bank/report/document/dispute модели;
- reviews/external reviews/review requests;
- payment modes и PSP fee modes.

Граница: это все еще не включение платежей через Daibilet в runtime.

Добавлена Phase 2.0b миграция:

```text
packages/db/prisma/migrations/20260710110000_phase2_event_management_buyer_account/migration.sql
```

Она добавляет contract слой для расширенного управления событиями и buyer account:

- админ может вести событие от имени поставщика через `DAIBILET_MANAGED`;
- поставщик может создавать черновики/заявки через `EventChangeRequest`;
- действия админа, поставщика и системы пишутся в `EventChangeLog`;
- расписание импортных событий остается read-only через `scheduleLocked`;
- ручные события получают open-date metadata, slot capacity и ticket category fields;
- `ExternalOrder` можно привязывать к `SiteUser`, чтобы "Мои покупки" показывали и widget-покупки, и будущие внутренние заказы.

Граница: это не включает Supplier self-service и не меняет текущий public checkout.

Добавлен первый Phase 2.1 state-machine слой:

```text
apps/backend/src/event-change-request-state.ts
apps/backend/src/event-change-request-state.test.ts
```

Он фиксирует допустимые переходы `EventChangeRequest`, actor gates, supplier permissions и read-only правило для source-managed расписания/офферов. Это пока чистый доменный слой без HTTP API и без записи в БД.

После mentor audit слой усилен:

- `scheduleLocked` теперь отдельно блокирует изменения расписания;
- добавлен `APPLY_FAILED` для сбоев применения approved payload;
- повторные critical actions дают idempotent no-op;
- admin approve/reject отделены от system apply.

Добавлен второй Phase 2.1 validation слой:

```text
apps/backend/src/event-change-request-payload.ts
apps/backend/src/event-change-request-payload.test.ts
```

Он валидирует `EventChangeRequest.payload` по `type`: content, media, SEO, schedule, offers, create/update и destructive admin actions. Open date нельзя смешивать со слотами, `SINGLE` требует один session, `RECURRING` требует recurrence rule или generated sessions, а лишние поля запрещены.

Mentor follow-up 2026-07-10:

- `UPDATE` payload narrowed to content/media/SEO only; schedule and offers are separate request types.
- Payload validation now supports `draft` and `apply` modes.
- `CREATE` can be stored as a draft without schedule, but cannot be applied without schedule.
- Every existing-event apply payload requires `baseSnapshot.eventUpdatedAt`.
- `CREATE.event` does not accept server-owned `supplierId`, `purchaseFlow` or `managementMode`; those must come from API/applier context.
- Schedule date-times require timezone, schedule timezone must be valid IANA, duplicate sessions compare by actual instant, and offer updates require explicit `UPSERT_LIST` or `REPLACE_ALL`.
- Recurring schedule apply requires generated sessions until the recurrence expansion layer exists.

Добавлен третий Phase 2.1 transactional apply слой:

```text
apps/backend/src/event-change-request-applier.ts
apps/backend/src/event-change-request-applier.test.ts
apps/backend/src/admin-event-change-requests-handler.ts
apps/backend/src/admin-event-change-requests-handler.test.ts
```

Он применяет approved `EventChangeRequest` для существующих событий в одной Prisma transaction: проверяет state transition, валидирует payload в `apply` mode, сверяет `baseSnapshot.eventUpdatedAt`, пишет `EventOverride`/`Event`/`EventSession`/`EventOffer`, обновляет статус заявки на `APPLIED` и создает `EventChangeLog`.

Граница текущего apply слоя:

- `CREATE` заявок пока не применяется, только валидируется как draft/apply contract;
- `contentBlocks` и `gallery` пока возвращают controlled unsupported error, пока не подключено хранилище блоков/медиа;
- `RECURRING` schedule требует уже generated sessions;
- route включен как admin-only `POST /api/admin/event-change-requests/:id/apply`;
- после успешного apply сбрасывается public cache.

Добавлен четвертый Phase 2.1 admin read/API слой:

```text
apps/backend/src/admin-event-change-requests.dto.ts
apps/backend/src/admin-event-change-requests.dto.test.ts
apps/backend/src/admin-event-change-requests-handler.ts
apps/backend/src/admin-event-change-requests-handler.test.ts
apps/backend/src/event-change-request-review.ts
apps/backend/src/event-change-request-review.test.ts
apps/admin/src/pages/EventChangeRequestsPage.tsx
packages/contracts/src/admin.ts
```

Он делает `EventChangeRequest` управляемым из админки:

- `GET /api/admin/event-change-requests` возвращает список заявок с фильтрами по статусу, типу, поставщику, событию и поиску;
- строки содержат событие, поставщика, автора, ревьюера, статус, тип, доступные действия и `payloadKeys`, но не сырой payload;
- `POST /api/admin/event-change-requests/:id/approve` переводит submitted-заявку в approved и пишет audit log;
- `POST /api/admin/event-change-requests/:id/reject` требует комментарий администратора и пишет audit log;
- `POST /api/admin/event-change-requests/:id/apply` применяет approved payload через transactional applier и прогревает public cache.
- в admin добавлена страница `/change-requests` с фильтрами, таблицей заявок и кнопками approve/reject/apply.

Граница: это базовый операторский UI. Полный detail/diff экран с просмотром сырого payload и сравнением полей еще следующий слой.

## Последние проверки

На 2026-07-10 прошли:

```bash
pnpm db:validate
pnpm db:typecheck
pnpm backend:typecheck
pnpm --filter @daibilet/admin typecheck
pnpm backend:test:ts
```

`backend:test:ts`: 73 теста прошло.

## Ближайшие шаги

1. Проверить новую marketplace migration на локальной БД через `pnpm db:migrate` или `pnpm db:deploy` в корректном окружении.
2. Проверить Phase 2.0 migration на локальной БД.
3. Добавить checkout/payment/refund state machines и тесты.
4. Продолжить вынос тяжелых read-models из `dto.js` в Prisma/TypeScript.
5. Зафиксировать clean integration path с Cursor-веткой UI, без overwrite текущего backend.
6. Обновить deploy plan под pnpm, Prisma migrations и typed backend entrypoint.
7. Перед первой продажей пройти smoke из `docs/launch-qa-and-deploy.md`.

## Блокеры перед настоящим запуском

- Не смешивать live daibilet.ru и новую версию без staging.
- Не включать внутренний checkout до YooKassa sandbox, фискализации и правил возврата.
- Проверить `robots.txt`, `sitemap.xml`, `www` redirect и canonical на production.
- Прогнать реальные виджеты TC и Teplohod на сервере с белым IP.
- Убедиться, что admin защищен и не показывает fallback/mock данные как реальные.

## Как обновлять этот файл

Обновлять после каждого крупного блока:

- новая миграция;
- новый public/admin/backend route;
- deploy или smoke;
- решение по Cursor/legacy;
- решение по фазам 2-4.
