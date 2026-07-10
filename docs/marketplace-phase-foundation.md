# Marketplace Phase Foundation

Цель документа - зафиксировать, что в Prisma уже заложено для фаз 2-4, не включая это преждевременно в продажи через виджеты.

## Текущая граница MVP

До запуска первых продаж `Daibilet` работает как агрегатор с покупкой через виджеты Ticketscloud и Teplohod:

- каталог, города, площадки, лендинги и SEO-хабы живут в нашей БД;
- финансовый контур остается на стороне билетных систем;
- мы храним факт покупки, покупателя, статус заказа и билетов через `ExternalOrder` / `ExternalTicket`;
- пользовательский UX называется "Мои покупки", без технических слов про внешние заказы.

## Фаза 2: YooKassa и поставщики

Заложенные модели:

- `Supplier` - карточка поставщика, юридические данные, дефолтный режим продаж, YooKassa shop id, банковские реквизиты;
- `SupplierUser` - доступы в будущий ЛК поставщика через текущий `SiteUser`;
- `SupplierVenue` - какие площадки принадлежат или управляются поставщиком;
- `SupplierEvent` - какие события поставщик продает и в каком режиме: `WIDGET_ONLY`, `INTERNAL_CHECKOUT`, `HYBRID`;
- `SupplierCommissionRule` - комиссии на уровне поставщика, категории или события;
- `SupplierLegalProfile`, `SupplierBankAccount` - реквизиты и статус проверки;
- `SupplierLedgerEntry` - источник истины для баланса поставщика;
- `SupplierReport`, `SupplierReportLine` - отчеты по периодам;
- `SupplierDocument`, `SupplierDocumentFile` - документы и снапшоты;
- `SupplierSettlement`, `SupplierDispute` - сверки и споры по отчетам;
- `FiscalReceipt` - будущие чеки/возвраты, привязанные к заказу, платежу и поставщику;
- `Payout` / `PayoutItem` - будущие выплаты поставщикам.

Что пока не включено:

- создание платежей YooKassa;
- фискализация;
- возвраты через Daibilet;
- баланс поставщика и акты.

## Фаза 3: внутренний checkout

Заложенные модели:

- `CheckoutOrder` - внутренний заказ Daibilet с коротким `publicCode` для интерфейса;
- `CheckoutItem` - позиции заказа: событие, сеанс, оффер, поставщик, цена и будущий билет;
- `Payment` - платежный объект YooKassa или ручная операция;
- `FulfillmentItem` - исполнение каждой позиции заказа;
- `RefundRequest` - заявки и processing возвратов;
- `PaymentEventLog`, `ProcessedWebhookEvent`, `IdempotencyKey` - аудит и защита от дублей;
- связка `CheckoutOrder.externalOrderId` - мост к старому виджетному заказу, если понадобится объединять историю покупок.

Правило: `ExternalOrder` остается зеркалом виджетной покупки, а `CheckoutOrder` используется только тогда, когда платеж реально проходит через Daibilet.

## Фаза 4: планировщик поездок

Заложенные модели:

- `TripPlan` - план поездки пользователя;
- `TripPlanItem` - событие, сеанс, площадка или уже купленная позиция внутри маршрута;
- `TripVoucher` - единый ваучер по плану;
- `TripVoucherItem` - состав ваучера по событиям и билетам.

Планировщик не должен дублировать каталог. Он ссылается на `Event`, `EventSession`, `Venue` и `CheckoutItem`.

## Рекомендуемый порядок оживления

1. Довести Prisma-backed DTO и каталог до стабильного состояния.
2. В админке добавить раздел поставщиков: карточка, юридические данные, площадки, события, режим продаж.
3. Добавить supplier account read-only: события, заказы, выплаты без самостоятельного редактирования критичных данных.
4. Включить YooKassa sandbox для одного тестового поставщика и одного события в режиме `INTERNAL_CHECKOUT`.
5. Добавить чеки и возвраты после подтверждения сценария оплаты.
6. Только после этого расширять внутренний checkout на несколько поставщиков и собирать единый ваучер.

## Неприятные места, которые нельзя спрятать

- Суммы в финансовых таблицах храним в копейках (`amountKopecks`, `totalKopecks`, `commissionKopecks`), а в public/admin отображаем в рублях.
- Короткий номер заказа - это `publicCode`; внутренний `id` остается техническим.
- Статусы enum храним на английском, UI обязан показывать русские подписи.
- Нельзя смешивать `ExternalOrder` и `CheckoutOrder` в одном списке без явного типа источника данных на уровне DTO.
- Нельзя включать `INTERNAL_CHECKOUT` для события без поставщика, комиссии, платежного провайдера и правил чеков.

## Phase 2.0 contract migration

Новая миграция:

```text
packages/db/prisma/migrations/20260709223000_phase2_commerce_supplier_contracts/migration.sql
```

Она добавляет недостающий contract слой после исследования SPBBOATS:

- `PurchaseFlow`: `PLATFORM` / `EXTERNAL`;
- fulfillment/refund/idempotency модели;
- payment modes: `SINGLE_MERCHANT`, `AGENT_SINGLE_PAYOUT`, `SPLIT_MERCHANT`;
- supplier legal/bank/report/document/dispute контур;
- reviews: internal reviews, supplier responses, disputes, external reviews, post-purchase review requests.

Эта миграция тоже аддитивная. Она не включает YooKassa runtime и не меняет текущий widget-first public flow.
