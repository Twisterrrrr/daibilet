# SPBBOATS extraction for Next.js + Prisma

Дата: 2026-07-10.

Этот документ фиксирует повторный аудит `D:\coding\SPBBOATS` после решения идти в full-stack monorepo на Next.js + Prisma.

Цель: не копировать legacy целиком, а забрать доменные контракты, DTO-подходы и SEO/runtime-паттерны, которые нужны Daibilet для быстрого запуска и дальнейших фаз.

## Что изучено

Ключевые источники в SPBBOATS:

- `docs/product/landings.md` - композиционная модель лендингов.
- `docs/core/events.md` - событие, сеансы, ticket categories, open date и source ownership.
- `docs/core/classification.md` - category/subcategory/tag policy и publish-gate.
- `docs/core/checkout.md` - checkout invariants, idempotency, availability.
- `docs/product/finance.md` - YooKassa, supplier finance, ledger, reports, documents.
- `docs/archive/BuyerAccountAudit.md` - "Мои покупки" через checkout/payment/fulfillment.
- `packages/backend/prisma/schema.prisma` - большая production-схема.
- `packages/backend/src/catalog/*` - catalog service, publish gate, listing health, event quality.
- `packages/backend/src/landing/*` - materializer, landing filters, SEO audit.
- `packages/backend/src/account/*` - buyer purchase read-model.
- `packages/backend/src/checkout/*` - payment/fulfillment state logic.
- `packages/frontend/src/app/*` - Next routes, metadata, sitemap, robots, structured data.

Размер схем:

| Проект | Prisma lines | Models | Enums |
| --- | ---: | ---: | ---: |
| SPBBOATS legacy | 4201 | 120 | 116 |
| Daibilet current | 2009 | 66 | 55 |

Вывод: Daibilet уже идет правильным "тонким" путем. В текущей схеме есть основные рельсы фаз 2-4, но runtime и DTO еще нужно переводить на Prisma/TypeScript постепенно.

## Главный вывод

SPBBOATS - донор контрактов, не кодовая база для копирования.

Нам нужны:

- SEO-дисциплина Next pages;
- typed public/admin DTO;
- event/session/offer семантика;
- publish/readiness gates;
- landing composition;
- checkout/payment/fulfillment invariants;
- supplier finance boundaries.

Нам не нужны прямо сейчас:

- полный Nest-монолит;
- BullMQ/Redis/Sentry/Cloudinary/PDF/EDO как обязательный стек;
- несколько версий админок;
- supplier self-service как первый шаг;
- split payments;
- сложный trust score;
- тяжелый trip planner runtime.

## Канон для Daibilet

### 1. Public SEO должен жить в Next, не в Vite SPA

Из SPBBOATS берем:

- `generateMetadata` для событий, городов, площадок, лендингов, статей;
- `generateStaticParams` для верхнего слоя indexable страниц;
- `revalidate` per route;
- `robots` для thin/expired/private pages;
- canonical/OpenGraph;
- JSON-LD: `Event`, `BreadcrumbList`, `FAQPage`, venue/offers;
- sitemap index с раздельными sitemap по сущностям.

Решение для Daibilet:

- production public target выбирается через `PUBLIC_APP_FILTER`: текущий default `@daibilet/public`, после приемки Cursor-ветки можно переключить на `@daibilet/web`;
- старый backend bridge временный;
- indexable маршруты должны постепенно стать Prisma-backed route handlers/server components;
- `/landings/:slug` не должен быть SEO-основой для широких посадочных. Для больших запросов нужны корневые URL: `/river-cruises`, `/bus-tours`, `/salute-9-may`; городские варианты - `/cities/:citySlug/:landingSlug` или согласованный человекочитаемый маршрут.

### 2. Event - карточка, EventSession - слот времени

Из SPBBOATS подтверждено:

- событие не равно слоту provider;
- расписание импортных TC/Teplohod событий read-only;
- open date нельзя смешивать с обычными слотами в одном событии;
- категории билетов и цены - отдельный коммерческий слой, а не просто `priceFromRub` на карточке.

Решение для Daibilet:

- `Event` - одна public/admin карточка;
- `EventSession` - время начала/доступность/емкость;
- `ProviderLink` - единый слой identity для provider `EVENT`, `SESSION`, `OFFER`, `VENUE`;
- `EventOffer` - ticket category/read model: название, цена, старая цена, group size, weekday mask, provider payload;
- в public catalog и stats считаем grouped events, не provider slots.

### 3. Imported data и local override не смешиваются

Из SPBBOATS берем инвариант:

- source-managed поля остаются под контролем источника;
- ручная модерация пишет override;
- админ/поставщик не должны "подменять" внешний источник без audit trail.

Текущий Daibilet уже близок:

- `EventOverride` есть;
- `EventManagementMode` есть;
- `EventChangeRequest` и `EventChangeLog` есть;
- `scheduleLocked` есть.

Что добавить позже:

- quality/status поля в override;
- manual boost / suppress low quality;
- content template data для городов/площадок/лендингов;
- более явные moderation states для venue merge/dedupe.

### 4. Readiness и SEO audit должны быть backend-owned

Из SPBBOATS берем:

- `EventQualityService`;
- `PublishGateService`;
- `ListingHealthService`;
- `SeoAuditService`;
- admin list health utils.

Коды, которые нужно держать как контракт:

- `MISSING_CATEGORY`;
- `MISSING_PRIMARY_SUBCATEGORY`;
- `TOO_MANY_SUBCATEGORIES`;
- `MISSING_DESCRIPTION`;
- `MISSING_IMAGE`;
- `MISSING_LOCATION`;
- `MISSING_ACTIVE_OFFER`;
- `NO_VALID_PRICE`;
- `NO_FUTURE_SESSIONS`;
- `NO_PRICE`;
- `NO_PHOTO`;
- `NO_SUBCATEGORY`;
- `SUBCATEGORY_LEGACY_ONLY`.

Решение для Daibilet:

- фронт не вычисляет бизнес-готовность сам;
- admin получает issue codes и человекочитаемые labels из backend/contracts;
- SEO audit внедряем как read-model, не как отдельный тяжелый раздел на старте;
- public не публикует страницы с `isIndexable=true`, если они thin/empty.

### 5. Landing и Collection - разные сущности

Из SPBBOATS берем:

- `LandingType`: `CITY`, `MULTI_CITY`;
- `LandingTheme`;
- `LandingContentBlock`;
- `LandingRelatedLink`;
- filters-first selection;
- отдельные admin/public DTO;
- блоки: hero, quick filters, comparison/table, FAQ, story/SEO text, related landings, city grid.

В текущем Daibilet уже есть:

- `Landing`;
- `LandingTheme`;
- `LandingContentBlock`;
- `LandingRelatedLink`;
- `LandingMatch`.

Чего нет и нужно добавить отдельно:

- `Collection` как каталожная подборка, отдельная от лендинга;
- unified filter builder для landing + collection;
- админский редактор блоков без сырого JSON как основного UX;
- public renderer блоков без "каши" и без повторения одного события сотни раз.

Правило:

- `Landing` - SEO/воронка/контентная страница.
- `Collection` - быстрый каталожный срез.
- Они могут использовать общий filter engine, но не должны быть одной сущностью.

### 6. Buyer account - "Мои покупки", не технические заказы

Из SPBBOATS берем:

- покупатель = `SiteUser/User`;
- public UX - "Мои покупки";
- виджетные покупки и внутренний checkout сходятся в один read-model;
- технические слова `external`, source ids и длинные UUID не показываются покупателю;
- guest tracking по короткому коду остается отдельным входом.

Решение для Daibilet:

- `ExternalOrder` остается зеркалом widget-покупки;
- `CheckoutOrder` станет основой внутренней покупки;
- buyer screen агрегирует оба источника;
- `publicCode` - человекочитаемый код заказа;
- PII поставщику выдавать только в минимальном объеме и по роли.

### 7. Phase 2 finance начинается не с кнопки YooKassa

Из SPBBOATS берем:

- immutable order snapshot;
- idempotency keys;
- state machines для checkout/payment/fulfillment/refund;
- ledger как источник баланса поставщика;
- reports/documents поверх ledger;
- legal/bank snapshots;
- payment modes: `SINGLE_MERCHANT`, `AGENT_SINGLE_PAYOUT`, `SPLIT_MERCHANT`.

Текущий Daibilet уже имеет модели:

- `CheckoutOrder`, `CheckoutItem`;
- `Payment`, `PaymentEventLog`, `ProcessedWebhookEvent`;
- `FulfillmentItem`;
- `RefundRequest`;
- `Supplier`, `SupplierLegalProfile`, `SupplierBankAccount`, `SupplierUser`;
- `SupplierLedgerEntry`, `SupplierReport`, `SupplierSettlement`, `SupplierDocument`;
- `Review`, `ExternalReview`, `ReviewRequest`, supplier responses/disputes.

Что это значит:

- БД-рельсы есть;
- runtime включать только после state machines, STUB checkout и smoke;
- TC/Teplohod остаются `EXTERNAL`;
- первые ручные поставщики могут идти через `PLATFORM` только после launch gates.

## Что уже есть в Daibilet и что осталось

| Область | Статус | Следующий шаг |
| --- | --- | --- |
| Next public shell | Есть | заменить proxy `/api/public/*` на Prisma handlers по одному |
| Prisma schema | Есть, легче legacy | добавить `Collection` и недостающие индексы/read models по мере переноса |
| Provider identity | Есть `ProviderLink` | использовать `SESSION` для всех временных слотов |
| Event change workflow | Есть state/validation/apply/admin API | добавить supplier draft routes позже |
| Landing composition | Схема есть | подключить admin block editor и public renderer |
| SEO runtime | Частично | metadata/json-ld/sitemap/robots для всех indexable routes |
| Buyer account | MVP есть | единый read-model `ExternalOrder + CheckoutOrder` |
| Finance/supplier DB | Есть | не включать YooKassa runtime до STUB/state/smoke |
| Collections | Нет | добавить отдельно от лендингов |
| Venue/city hub quality | Частично | readiness + content blocks + noindex gates |

## Очередность внедрения в Next+Prisma

### Step A. Public SEO foundation

1. `robots.ts`.
2. `sitemap.xml` index.
3. sitemaps for events/cities/venues/landings/collections later.
4. `generateMetadata` for event/city/venue/landing.
5. JSON-LD for event, breadcrumbs, FAQ.

### Step B. Prisma public read models

1. `/api/public/stats`.
2. `/api/public/home/preview`.
3. `/api/public/events` with filters, pagination and grouped events.
4. `/api/public/events/:slug`.
5. `/api/public/cities/:slug` and `/api/public/venues/:slug`.
6. `/api/public/landings/:slug` as data API, while SEO routes use human URLs.

### Step C. Catalog quality gates

1. Move readiness issue codes into typed contracts.
2. Add event/venue/city/landing SEO/readiness audit.
3. Use issue codes in admin lists and detail pages.
4. Add launch filters: no price, no purchase entry, no future sessions, thin content.

### Step D. Landing/collection split

1. Add `Collection` model.
2. Add shared filter builder.
3. Admin collection editor as catalog slice.
4. Landing editor as content composition.
5. Public table/quick-filter renderer for landing CITY pages.

### Step E. Phase 2 runtime, after MVP launch-critical work

1. checkout/payment/fulfillment/refund state machines;
2. STUB checkout on one manual event;
3. admin supplier/payment settings;
4. YooKassa sandbox;
5. supplier LC read-first;
6. reviews;
7. ledger reports/payouts.

## Cursor integration notes

Cursor can continue JS/Prisma deployment and UI integration, but should not overwrite these contracts:

- event = card, session = slot;
- source-managed imported fields are read-only;
- manual changes go through override/change request/audit;
- `ExternalOrder` and `CheckoutOrder` are separate sources, unified only in read-model;
- `Landing` and `Collection` are separate product entities;
- public SEO routes should be real Next routes, not SPA-only pages;
- readiness and SEO audit come from backend/contracts, not duplicated UI heuristics.

## Mentor verdict

Мы не должны "переехать в SPBBOATS". Мы должны взять оттуда взрослые правила эксплуатации:

- не ломать источник данных;
- не публиковать мусор;
- не считать слот событием;
- не менять платежный snapshot;
- не выдавать поставщику лишние данные покупателя;
- не включать финконтур без state/idempotency/smoke.

Текущая Daibilet-схема уже достаточно богатая для фаз 2-4. Главный риск теперь не отсутствие моделей, а преждевременное включение runtime до того, как DTO, SEO, state machines и операционные экраны стали надежными.
