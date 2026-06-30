# Legacy SPBBOATS schema audit

Дата: 2026-06-25.

Цель: использовать SPBBOATS как источник зрелых доменных решений для сложных DTO, но не переносить тяжелую legacy-систему целиком.

## Что просмотрено

Основные источники в `D:\coding\SPBBOATS`:

- `packages/backend/prisma/schema.prisma` - большая legacy-схема: 4202 строки, 120 моделей, 116 enum.
- `packages/backend/prisma/catalog-foundation.schema.fragment.prisma` - поздняя попытка выделить легкое продаваемое ядро: 7 моделей.
- `packages/backend/prisma/CATALOG_FOUNDATION_MIGRATION.md` - описание сброса старого каталога в пользу sellable core.
- `docs/PROJECT-FOUNDATION.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/core/architecture.md`.
- `docs/core/events.md`, `docs/core/ingestion.md`, `docs/core/checkout.md`.
- `docs/product/landings.md`, `docs/product/admin-v4-imported-sales.md`.
- `docs/reports/admin-v4-dto-gaps.md`.

## Главный вывод

Legacy полезен не как 120-модельный монолит, а как набор инвариантов:

- карточка события не равна слоту времени;
- сеанс/слот не равен билетной категории;
- цена привязана к ticket category/offer, а `priceFrom` - производная;
- внешний источник владеет импортными фактами, локальные override не затираются синком;
- публичный и админский DTO - read-model/projection, а не прямой дамп таблиц;
- лендинг - композиция hero/blocks/filter engine, а не второй каталог;
- external orders - зеркало внешнего заказа и операционный слой, без YooKassa/internal checkout.

Это совпадает с нашей текущей MVP-границей: виджеты TC/Teplohod, факт покупки, покупатель, номер/статус билета, без финансового контура Daibilet.

## Сравнение схем

| Схема | Масштаб | Что внутри |
|---|---:|---|
| SPBBOATS legacy `schema.prisma` | 120 models / 116 enums | Catalog, supplier, finance, checkout, refunds, reviews, chat, support, promo, SEO, content, ops |
| SPBBOATS `catalog-foundation` | 7 models / 10 enums | `Location`, `PlacePoint`, `Event`, `AdmissionProduct`, `Session`, `Offer`, `ProviderLink` |
| Current Daibilet schema | 27 models / 11 enums | Source/sync/raw, Event/Session/Offer, taxonomy, city/venue, landings/blocks, articles/SEO, external orders/tickets, quality issues |

Наша схема уже ближе к foundation, чем к старому монолиту. Проблема сейчас не в отсутствии всех таблиц, а в том, что импорт и DTO еще не всегда используют доменную границу правильно.

## Что переносить сейчас

### 1. Event как карточка, Session как слот

Legacy `core/events.md` и `catalog-foundation` явно разводят:

- `Event` - продаваемая/витринная карточка;
- `Session` / `EventSession` - конкретное время начала;
- `Offer` / `EventOffer` - билетная категория или коммерческая точка покупки.

У нас эти таблицы уже есть, но TC seed/import исторически создавал `Event` по внешнему `event.externalId`, а для TC внешний `event` часто является слотом. Поэтому DTO вынужден группировать события по `source + title + city + venue`.

Решение: переносить группировку из DTO в import/materialization layer. Для TC нужно создавать одну каноническую `Event` на группу и много `EventSession` для внешних слотов.

### 2. ProviderLink вместо Event-only source identity

Legacy foundation предлагает универсальный `ProviderLink`:

- `entityKind = EVENT | ADMISSION | SESSION | OFFER | LOCATION`;
- `externalId`;
- `externalParentId`;
- `payload`;
- unique `(source, entityKind, externalId)`.

У нас сейчас есть `EventSourceLink`, но он привязан только к `Event`. Из-за этого внешний ID слота/оффера приходится хранить в `EventSession.externalId`, `EventOffer.payload` и DTO-логике.

MVP-вариант без тяжелой миграции:

- оставить `EventSourceLink` для карточки события;
- добавить `ProviderLink` или минимальные `SessionSourceLink`/`OfferSourceLink`;
- для TC внешний слот хранить на `EventSession`, а source event/meta id связывать явно;
- для Teplohod event id связывать с `Event`, schedule time id - с `EventSession`, ticket id - с `EventOffer`.

Менторская позиция: лучше один `ProviderLink`, чем плодить source-specific поля в каждой таблице. Но мигрировать осторожно, additive.

### 3. Ticket categories/prices как отдельный слой

Legacy `core/events.md` говорит: продаем категории билетов, не места. Цена не должна быть просто полем события.

У нас `EventOffer` уже есть, но слишком легкий:

- `title`;
- `priceRub`;
- `widgetUrl` / `deeplinkUrl`;
- `payload`;
- `active`.

Следующий additive шаг:

- `externalId` или provider link для ticket category;
- `oldPriceRub` при наличии;
- `currency`;
- `sortOrder`;
- `capacity`/quota позже;
- `isPrimary` или `kind` позже;
- `priceFromRub` события считать как минимальную активную цену `>= 100` из offers/sessions, а не хранить как единственную правду.

### 4. Readiness codes как backend truth

Legacy Admin V4 contract фиксирует:

```ts
readiness: {
  status: 'READY' | 'NEEDS_ATTENTION' | 'BLOCKED';
  blockers: ReadinessIssue[];
  warnings: ReadinessIssue[];
}
```

У нас уже есть `QualityIssue` и readiness в DTO. Нужно закрепить коды как доменный контракт:

- `NO_FUTURE_SESSIONS`;
- `MISSING_PURCHASE_ENTRY`;
- `MISSING_PRICE`;
- `PRICE_TOO_LOW`;
- `MISSING_CATEGORY`;
- `MISSING_SUBCATEGORY`;
- `MISSING_VENUE`;
- `WEAK_DESCRIPTION`;
- `MISSING_IMAGE`;
- `SOURCE_STALE`;
- `SOURCE_DISABLED`.

Admin должен показывать эти коды, а не собирать свою эвристику.

### 5. Landing blocks и filter engine

Legacy `product/landings.md` уже описывает нужную модель:

- `Landing` / `LandingPage`;
- `LandingTheme`;
- `LandingContentBlock`;
- `CITY` и `MULTI_CITY`;
- filter-first selection;
- related links;
- SEO audit issues.

Наша схема уже содержит `Landing`, `LandingTheme`, `LandingContentBlock`, `LandingRelatedLink`. Это удачное решение, его сохраняем. Нужно улучшать не схему, а:

- админский редактор блоков;
- public renderer;
- source preview/resolved events;
- manual include/exclude/pin;
- фильтры дат/слотов на лендинге.

### 6. External orders без checkout stack

Legacy большой, но его актуальный product contract прямо говорит: imported sales - это внешняя покупка через provider, а не checkout Daibilet.

У нас текущие `ExternalOrder` и `ExternalTicket` легкие и правильные для MVP. Не переносить сейчас:

- `CheckoutSession`;
- `PaymentIntent`;
- `RefundRequest` с YooKassa;
- supplier ledger/payout;
- EDO;
- reconciliation-heavy контур.

Можно добавить позже только операционные поля:

- `internalStatus`;
- `operatorNote`;
- `assignedTo`;
- `manualRefundStatus`, если появится ручной процесс.

## Что не переносить сейчас

Не брать из legacy до первых стабильных продаж:

- Supplier self-service и supplier finance;
- YooKassa/payment intents/internal checkout;
- settlements, payout requests, ledgers;
- EDO/documents;
- reviews/review requests;
- support chat/tickets;
- promo blocks как сложный DSL;
- trip planner;
- full SEO module как отдельный монстр;
- media assets pipeline, если хватает URL-полей для MVP.

Это хорошие later-фичи, но они снова раздуют проект.

## Решение по Prisma/DTO

Идем по Next.js + Prisma, но поэтапно:

1. Prisma становится официальным typed DB layer в `packages/db`.
2. Backend DTO постепенно режется на модули, но поведение API не ломается.
3. Первым переносим сложные read-models, где Prisma реально помогает:
   - `public-catalog.dto.ts`;
   - `admin-events.dto.ts`;
   - `sources.dto.ts`;
   - `landings.dto.ts`.
4. Next.js сначала использовать для public/SEO, где SSR/metadata/canonical/ISR дают прямую пользу.
5. Admin можно оставить Vite до стабилизации продаж и перенести позже, используя тот же backend API.
6. Sync/webhooks/операционные jobs остаются в backend service, не в Next API routes.

## Ближайший инженерный маршрут

### Шаг 1. Prisma bridge без рефакторинга DTO

- Добавить маленький `packages/db/src/client.ts`.
- Подключить generated Prisma client.
- Сделать smoke: counts по `Event`, `EventSession`, `EventOffer`, `ExternalOrder`.
- Не переписывать SQL-монолит сразу.

### Шаг 2. Source identity для session/offer

Минимальная additive миграция:

- либо `ProviderLink`;
- либо временно `SessionSourceLink` + `OfferSourceLink`.

Предпочтение: `ProviderLink`, потому что он повторяет удачную foundation-идею и не привязан к одному провайдеру.

Статус 2026-06-25: выбран и реализован `ProviderLink` как additive слой поверх текущей схемы. Он уже поддерживает `EVENT`, `SESSION`, `OFFER`, `VENUE`, а существующие данные backfill'нуты из `EventSourceLink`, `EventSession.externalId`, `EventOffer.payload` и `VenueAlias`.

### Шаг 3. TC import materializer

Переделать TC импорт так, чтобы:

- одна повторяющаяся экскурсия становилась одной `Event`;
- каждый TC slot становился `EventSession`;
- ticket category/price становились `EventOffer`;
- external ids лежали в provider/source links;
- `priceFromRub` события пересчитывался из offers/sessions с порогом `>= 100`.

DTO после этого станет проще: группировка останется как safety fallback, а не основная бизнес-логика.

### Шаг 4. DTO decomposition

Разрезать `dto.js` не по страницам фронта, а по read-model boundaries:

- `sources.dto.ts`;
- `admin-events.dto.ts`;
- `orders.dto.ts`;
- `landings.dto.ts`;
- `public-catalog.dto.ts`;
- `public-pages.dto.ts`;
- `readiness.ts`.

Статус 2026-06-30: первый slice создан в `public-catalog.dto.ts`. Prisma read-model использует `ProviderLink` для EVENT identity с fallback на `EventSourceLink`; parity с legacy DTO закреплен отдельным npm-script. Полное удаление legacy catalog path пока не выполнялось.

### Шаг 5. Next.js public

После стабилизации public DTO:

- перенос public в Next.js;
- SSR/metadata для событий, городов, площадок, лендингов;
- ISR/revalidate после sync/manual publish;
- public API оставить компактным.

## Менторский вердикт

Старый SPBBOATS не надо копировать как кодовую базу: он слишком тяжелый для нашего запуска. Но его поздние документы и `catalog-foundation` дают правильную доменную форму для сложных DTO.

Самый важный перенос: перестать лечить слоты Ticketscloud на уровне UI/DTO и закрепить модель `Event -> Sessions -> Offers -> ProviderLinks` на уровне Prisma/import. Это снимет большую часть текущих сложностей public catalog, event detail, landings, admin events и widget purchase.
