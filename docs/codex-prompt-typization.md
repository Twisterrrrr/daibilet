# Промпт Codex: единая типизация каталога (события + места)

Цель: убрать «серую» классификацию и сделать категории/типы одним источником правды в
backend, чтобы Афиша (рельсы) и каталог делились по одним и тем же полям, а не эвристиками
в web. Фронт (`apps/web`, `/afisha2`, `/places2`) уже готов к строгим полям.

## Владение и границы
- `packages/db` (Prisma), `packages/contracts`, `apps/backend` - ты.
- `apps/web` - Cline, ждёт готовых DTO-полей.
- Редакционное наполнение (RU-метки, дескрипторы) - DeepSeek.
- Контракт-изменения - отдельным коммитом на показ владельцу.

## Часть 1. СОБЫТИЯ: категория + подкатегория + списки

### Текущее состояние
- Двухуровневая таксономия есть: `Category` -> `Subcategory`, `Event.categoryId` (nullable).
  Seed: `scripts/db-seed-taxonomy.js` (cat_events, cat_museums_art, cat_excursions, cat_active,
  cat_entertainment; подкатегории: Концерты, Театр, Шоу, Фестивали, Музеи, Выставки,
  Экскурсии, Спорт, Стендап и юмор, Детям...).
- Матчинг темы размазан: `apps/backend/src/landing-rules.ts` (matchingLandingSlugs),
  `public-catalog.mapper.ts` (pickCatalogSubcategories), разовые скрипты
  (`scripts/reclassify-disco-events.js`), web `catalog-labels.ts` (collectCatalogLabels).
- У Ticketscloud-событий `categoryId` часто пуст, наружу отдаётся сырой `category = "Мероприятия"`.

### Что нужно
1. **Канонический набор рельс Афиши (типы, уровень Subcategory):**
   Концерты, Спектакли, Шоу, Фестивали, Выставки, Музеи, Экскурсии, Развлечения, Активный отдых.
   «Мероприятия» из показа уходит - её составляющие и есть рельсы.
   Рельса события называется «Спектакли». «Театры» — тип мест; сам факт проведения в театре не классифицирует событие как спектакль.

2. **Списки-подборки - отдельная ось, НЕ подтипы** (неэксклюзивные флаги, событие может входить
   в несколько): `family_kids` «Для детей», `family_all` «Для всей семьи», `free` «Бесплатно»,
   `weekend` «На выходных». Хранить как теги/коллекцию.
   Предикаты (осознанно, не буквально):
   - `free` - ТОЛЬКО подтверждённая нулевая цена (`priceFrom === 0`). `priceFrom = null/отсутствует`
     = «цена неизвестна», НЕ бесплатно.
   - `family_kids` / `family_all` - явные сигналы из тематической подкатегории, тега, названия
     или типа места. Возраст 0+/3+/6+ только подтверждает сигнал; сам ничего не включает.
     12+/16+/18+ и явные взрослые темы исключают оба списка. Учитывать границы слов и негативные
     формулировки («не для детей», «детский сад»). Время дневных сеансов — только слабое подтверждение.
     Если аудитория явно обозначена, но возраст неизвестен или противоречив, отправлять на ревью.
   - `weekend` - есть ближайшая доступная сессия в сб/вс по часовому поясу города.

3. **Единый резолвер** `resolveEventTaxonomy(event) -> { subcategoryId, tagIds, confidence }`,
   приоритетом:
   a) явная редакционная связка (не затирать);
   b) `subcategories`/`tags` источника -> нормализация по slug-мапе в `Subcategory`;
   c) `landing-rules` keyword-матч -> тема (на выходе категория, не лендинг);
   d) эвристики title/venue (`pickCatalogSubcategories`, `isDiscoOrPartyEvent`);
   e) fallback `confidence=low` -> не присваивать публичную рельсу; оставить без автоклассификации. Постоянная MappingInbox и отчётная очередь ревью в текущей схеме ещё не реализованы.

4. **Backfill** повторяемым прогоном по всем событиям; `low` -> на ручную проверку.
   Образец - `scripts/reclassify-disco-events.js`. Тесты на резолвер (позитив/негатив/confidence).

5. **Facets каталога** (`/api/public/events` `facets.categories`) строить от таксономии +
   списков, а не от сырого `category`.

## Часть 2. МЕСТА: placeType / placeSubtype + реклассификация развлечений
### Текущее состояние
- `Venue.kind` (VenueKind) - грубое семейство + спецтипы (ATTRACTION, PARK, MONUMENT, GASTRO,
  TEMPLE, PIER, BUS...).
- `Venue.placeType` (enum PlaceType) - THEATRE, MUSEUM, ENTERTAINMENT, FOOD, ARCHITECTURE,
  MONUMENT, NATURE, RELIGION, URBAN, TRANSPORT, VENUE, OTHER.
- `Venue.placeSubtype` (String) - контролируемые подтипы в `packages/contracts/src/place-pdp.ts`
  (PLACE_TYPE_OPTIONS / PLACE_SUBTYPE_OPTIONS) + `variant` (PlacePdpVariant).
- RU-ярлыки берутся из place-pdp.ts (web также использует `venue-kind-mapping.ts`).

### Реклассификация (решение владельца)
1. **Цирк, Кинотеатр** сейчас под `THEATRE`, **Планетарий, Океанариум** под `MUSEUM` - неверно.
   Перенести в развлекательный сегмент: `placeType = ENTERTAINMENT`, `variant = 'attraction'`.
   **Зоопарк, Аквапарк, Квест, Смотровая** уже в ENTERTAINMENT (attraction) - оставить.
   **Планетарий - шоу, не музей**; в MUSEUM не оставлять.
2. Поправить `PLACE_SUBTYPE_OPTIONS` в place-pdp.ts, обновить/добавить тесты
   (`placeSubtypeIssue`, `suggestedPlacePdpVariant`) под новый состав.
3. **Reclassify существующих площадок**: сначала title-эвристика (цирк/планетарий/зоопарк/
   океанариум/аквапарк/квест/смотровая) ТОЛЬКО в dry-run и отчёт кандидатов для проверки -
   НЕ делать слепого массового апдейта. Сначала предложить точные правила и согласовать, затем
   точечный backfill: `placeType=ENTERTAINMENT`, `placeSubtype` по словарю, при необходимости
   `kind=ATTRACTION`. Образцы: `scripts/reclassify-disco-events.js`,
   `scripts/lib/event-taxonomy.js`, `venue-kind-mapping.ts` (isTempleLikeVenueName/isBusLikeVenueName).
4. **«Достопримечательности»** = только особенные места города: `MONUMENT`, `ARCHITECTURE`,
   `NATURE`. Цирка/зоопарка там НЕ должно быть.
   «Развлечения» для МЕСТ и «Развлечения» для СОБЫТИЙ - разные источники
   (PlaceType.ENTERTAINMENT vs Category cat_entertainment), в web не смешивать.

## Часть 3. Контракты (DTO)
- `PublicCatalogListItemDto` / `PublicEventDto`: `catalogCategory {slug,title}`,
  `catalogSubcategory {slug,title}`,
  `catalogLists [{key:'family_kids'|'family_all'|'free'|'weekend', title}]`, `tagLabels string[]`.
  Facets каталога строить от этих полей.
- Места: `PublicVenueDto.placeType`/`placeSubtype` уже есть; при надобности добавить
  `placeTypeLabel`/`placeSubtypeLabel` (или web сам мапит через place-pdp).
- Отдельный контур (рейтинг/отзывы/программа/faq/nextEvent) - `docs/codex-dto-handoff-v2-preview.md`.

## Критерии готовности
- `apps/backend` typecheck и тесты зелёные (резолвер, place-pdp, каталог-facets).
- `/api/public/events` отдаёт заполненные `catalogSubcategory`/`catalogLists` по контрольным
  городам (СПб, Пермь).
- `/api/public/venues` отдаёт цирк/зоопарк/планетарий/аквапарк с `placeType=ENTERTAINMENT`,
  `variant=attraction`; памятники/архитектура/природа - отдельно.
- `pnpm --filter @daibilet/web typecheck` = 0 после поднятия версии контрактов.

## Ссылки
- Дизайн-контекст: `docs/event-catalog-taxonomy.md`.
- DTO-handoff: `docs/codex-dto-handoff-v2-preview.md`.
