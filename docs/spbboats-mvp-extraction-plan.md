# SPBBOATS -> Tours MVP extraction plan

Дата: 2026-05-30

## Что изучено

Старый проект в `D:\coding\SPBBOATS` уже содержит почти все доменные решения, но они смешаны с большим production-контуром:

- apps/packages: `backend`, `frontend`, `frontend-admin`, `frontend-admin-v2`, `frontend-admin-v3`, `frontend-admin-v4`, `frontend-supplier`, `frontend-supplier-v2`, `shared`, `shared-ui`;
- инфраструктура: Dockerfile для нескольких приложений, `infra`, `deploy`, `nginx`, `ops`, очереди, Redis/BullMQ, Sentry, Cloudinary, mailer, PDF, ЭДО, supplier finance;
- Prisma schema на 4000+ строк: каталог, заказы, checkout, поставщики, финансы, документы, поддержка, отзывы, промо, статьи, SEO, лендосы, виджеты, внешние провайдеры;
- docs хорошо фиксируют правильные границы: импорт как внешний read-only слой, локальные override поверх импорта, public read-model отдельно от admin write-path, внешние заказы без внутреннего checkout.

Главный вывод: переносить старый проект нельзя. Нужно переносить только доменные решения и несколько маленьких утилит.

## Что оставить как основу

1. Архитектурные инварианты из `docs/core/*`:
   - imported fields и local overrides не смешиваются;
   - внешние ID/статусы живут отдельно от внутреннего жизненного цикла;
   - публичная витрина читает подготовленный read-model;
   - расписание Ticketscloud/Teplohod остается read-only.

2. Каталог:
   - `Event`, `EventSession`, `EventOffer`, `EventOverride`;
   - `Venue` с `venueType`, `venuePageMode`, `lifecycleStatus`, `needsReview`, merge/dedupe;
   - `City`, `Region`, `RegionCity`;
   - `Subcategory`, `EventSubcategoryLink`, `VenueSubcategoryLink`;
   - `Tag` как enrichment, а не publish blocker.

3. Лендинги:
   - `LandingPage` с `CITY` / `MULTI_CITY`;
   - filters-first выборка событий;
   - `LandingContentBlock` как управляемая композиция;
   - `templateType = COMPARISON_TABLE` для быстрых покупок.

4. Внешняя покупка:
   - `EventOffer.purchaseType = WIDGET | REDIRECT`;
   - `widgetPayload` для TC/Teplohod;
   - `ExternalOrderLink` / `ExternalTicket` как зеркало факта покупки и статусов.

5. Малые утилиты из `packages/shared/src`:
   - `price-normalizer.ts`;
   - `normalize-title.ts`;
   - `widget-payload.ts`;
   - `seo-utils.ts`;
   - `session-ux.ts`;
   - `city-declension.ts`.

6. Admin V4 как продуктовый ориентир, но не как обязательный код:
   - Dashboard;
   - Events;
   - External Orders;
   - Venues;
   - Cities;
   - Landings;
   - Sources / Sync health / Mapping inbox;
   - Taxonomy read-only.

## Что не тащить в MVP

- внутренний checkout, корзина, YooKassa, holds, refunds через нашу платежку;
- supplier cabinet;
- supplier ledger, payouts, reports, settlements, closing documents, EDO;
- user accounts, favorites, notifications;
- reviews, articles, blog, promo blocks, promo placement;
- несколько версий админки;
- тяжелый Nest/BullMQ/Sentry/Cloudinary/mail/PDF стек на старте;
- deploy/nginx/ops/staging-prod конфиги;
- сложный RBAC и auth до момента, когда понадобится реальный доступ.

## Предлагаемый новый MVP-монорепо

Оставить идею раздельных зон, но собрать намного тоньше:

```text
apps/
  public/        # Next.js public storefront
  admin/         # Next.js или Vite admin, пока без auth
  backend/       # Fastify/Nest-lite API + sync jobs

packages/
  db/            # Prisma schema/client/migrations
  core/          # domain types, mapping, extraction, readiness
  ticketscloud/  # TC grpc/rest adapter
  teplohod/      # Teplohod rest adapter, включить после доступа
  ui/            # общие UI-примитивы позже
```

Для MVP я бы выбрал `pnpm workspace + Prisma + Postgres + Next.js public/admin + Fastify backend`. Nest можно взять, если хотим сразу привычный enterprise-каркас, но сейчас он добавит веса раньше пользы.

## MVP Prisma, укороченный состав

Минимальный набор:

- `Source`, `SourceSyncRun`, `RawImportRecord`;
- `Event`, `EventSession`, `EventOffer`, `EventOverride`, `EventSourceLink`, `EventSessionSourceLink`;
- `Category`, `Subcategory`, `EventSubcategory`, `Tag`, `EventTag`;
- `City`, `Region`, `RegionCity`, `DestinationCard`;
- `Venue`, `VenueAlias`, `VenueMergeCandidate`;
- `Landing`, `LandingBlock`, `LandingMatchSnapshot`;
- `ExternalOrder`, `ExternalTicket`, `BuyerSnapshot`;
- `MappingRule`, `UnknownSourceCategory`;
- `ModerationTask`, `AuditLog`.

От старой схемы берем смысл, но не копируем все поля. Цены храним в копейках в БД, в public/admin отдаем `priceRub` без копеек.

## Приоритеты доработки новой версии

### P0. База и импорт TC

1. Создать новый workspace и Prisma schema.
2. Перенести текущие TC-скрипты из `D:\coding\tours\scripts` в нормальный adapter.
3. Сохранить raw payload для каждого события.
4. Делать upsert событий, сеансов, офферов, площадок, городов.
5. Считать sync summary: created/updated/hidden/errors/unknown mappings.

### P1. Каталог и типизация

1. Закрепить пять основных категорий.
2. Сделать жесткие primary subcategories внутри категории.
3. Разрешить до двух secondary subcategories из общего справочника.
4. Теги генерировать авто-правилами из title/description/venue/source category.
5. Показать mapping inbox: source category -> category/subcategory/tag.

### P2. Города и регионы

1. `City` хранит фактический город из импорта.
2. `Region` группирует малые города.
3. Public показывает destination cards:
   - крупный город как отдельный вход;
   - область как отдельный вход с суммой событий и площадок.
4. Порог: город видим отдельно, если он крупный/райцентр или явно whitelisted; иначе уходит в регион.

### P3. Площадки

1. Типы на MVP:
   - `VENUE`;
   - `MUSEUM_ART_SPACE`;
   - `THEATER`;
   - `CONCERT_HALL`;
   - `CLUB_RESTAURANT`;
   - `PIER`;
   - `MEETING_POINT`;
   - `OUTDOOR_LOCATION`;
   - `SPORT_ACTIVITY_SPACE`;
   - `ATTRACTION`;
   - `OTHER`.
2. `pageMode`: `NONE | BASIC | HUB`.
3. Автоправило: `MEETING_POINT` по умолчанию без страницы, `PIER` и реальные площадки становятся `BASIC/HUB` при достаточном числе событий или ручном whitelist.
4. Dedupe: normal name + address + city + type; подозрительные склейки идут в moderation task.

### P4. Public

1. Каталог с фильтрами: направление, город/регион, категория, подкатегория, дата, цена, tags.
2. Event page с внешней покупкой через TC widget / Teplohod redirect/widget.
3. City landing: краткое описание, активности, подборки, таблица ближайших событий.
4. Venue page только для `BASIC/HUB`.
5. Landing page с table-first блоком для быстрых покупок.

### P5. Admin

1. Dashboard sync health.
2. Events table + detail.
3. Mapping inbox.
4. Venues moderation/dedupe.
5. City/region routing.
6. Landing rules + preview matched events.
7. External orders mirror.

## Лендинги: что сделать правильно сразу

Выборка лендинга должна быть результатом `LandingRule`, а не ручным списком в UI.

Минимальный контракт:

```ts
type LandingRule = {
  slug: string;
  citySlug?: string;
  regionSlug?: string;
  categoryCodes?: string[];
  primarySubcategoryCodes?: string[];
  secondarySubcategoryCodes?: string[];
  tagCodes?: string[];
  includeTextPatterns?: string[];
  excludeTextPatterns?: string[];
  dateWindow?: { from?: string; to?: string; seasonalKey?: string };
  minConfidence: number;
};
```

Для каждого события хранить `extractedFeatures`:

- river / bus / walking / dinner / salute / new-year / kids / romantic / extreme;
- pier / vessel / route / duration / meal type;
- date mode: single / recurring / open date;
- source confidence и причины попадания.

Так лендинги вроде `Ужин на теплоходе в Москве`, `Салют 9 мая`, `Речные прогулки`, `Автобусные обзорные экскурсии` будут собираться не только по названию, а по нормализованным признакам.

## Ближайший рабочий план

1. Зафиксировать новый монорепо skeleton.
2. Перенести текущий статический public/admin в реальные apps, но сначала подключить backend API.
3. Поднять Postgres через Docker Compose.
4. Создать `packages/db` и короткую Prisma schema.
5. Реализовать TC full sync в БД.
6. Собрать `/api/catalog`, `/api/admin/events`, `/api/admin/sync-runs`.
7. Переделать public/admin с моков на API.
8. Добавить venue classification + city routing + landing match preview.
9. После доступа к Teplohod включить `packages/teplohod` по тому же adapter-контракту.

## Главное решение

Новая версия должна быть не "SPBBOATS light", а новый продуктовый слой:

- старый проект = справочник решений и антипример роста сложности;
- новый проект = импортированный каталог + внешняя покупка + управляемая типизация + быстрые лендинги;
- все, что связано с внутренними деньгами и supplier finance, остается вне MVP.
