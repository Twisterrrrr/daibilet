# Типизация каталога событий

Дата: 2026-11-12. Автор: Cline (frontend), согласовано с владельцем.
Реализация: Codex (schema/контракт/резолвер/backfill), DeepSeek (корректность RU-меток), Cline (web).

## Цель

Убрать «серую» типизацию каталога: сейчас наружу отдаётся сырой `category`
(у Ticketscloud - generic «Мероприятия») + шумные `tags`/`subcategories`, а
человекочитаемый тип выводится эвристиками, размазанными по `landing-rules.ts`,
`catalog-labels.ts` и разовым reclassify-скриптам. Нужен один источник правды в
backend - тогда рельсы Афиши («Концерты», «Театр», «Экскурсии»...) будут точными.

## Две оси (главное, не смешивать)

1. **Тип** - эксклюзивная классификация (одно событие = одна тема). Хранится в
   `Subcategory` (`Event -> Subcategory`), выводится в рельсы и в бейдж карточки.
2. **Списки-подборки** - не эксклюзивные флаги, пересекаются с типом (детский
   спектакль = и «Театр», и «Для детей»). Это фильтры/теги, а НЕ Subcategory.

## Канонический набор рельс Афиши (финальный, согласован)

**Типы** (Subcategory, одна на событие):

| Рельса | Текущий Subcategory |
|---|---|
| Концерты | `sub_events_concerts` |
| Театр | `sub_events_theater` |
| Шоу | `sub_events_show` |
| Фестивали | `sub_events_festivals` |
| Выставки | `sub_museums_exhibitions` |
| Музеи | `sub_museums_museums` |
| Экскурсии | `sub_excursions_water` / `_bus` / `_walking` (одной рельсой) |
| Развлечения | `sub_entertainment_*` |
| Активный отдых | `sub_active_*` |

«Мероприятия» как супер-категория из показа уходит: её составляющие уже являются
этими рельсами.

**Списки** (флаги, N на событие, вычисляются предикатами):
- `family_kids` - «Для детей»
- `family_all` - «Для всей семьи»
- `free` - «Бесплатно»
- `weekend` - «На выходных»

## Текущее состояние (уже есть)

- `Category` + `Subcategory` (двухуровневая): `cat_events`, `cat_museums_art`,
  `cat_excursions`, `cat_active`, `cat_entertainment`; seed в
  `scripts/db-seed-taxonomy.js`.
- `Event.categoryId` (nullable FK) + `Tag`/`EventTag` + ручная таксономия в админке
  (`AdminEventTaxonomyForm`, `classification.categoryId`).
- Примеры реклассификации: `scripts/reclassify-disco-events.js`,
  `scripts/lib/event-taxonomy.js`.
- Матчинг темы: `landing-rules.ts` (`matchingLandingSlugs`) + `pickCatalogSubcategories`
  (`public-catalog.mapper.ts`); web `collectCatalogLabels` / `displayCatalogLabel`.

Пробел: у Ticketscloud-событий `categoryId` пуст, наружу тема не отдаётся, и матчинг
не сведён в единый резолвер.

## План (backend, Codex)

1. **Канон Subcategory** как enum (slug + RU title + position). При необходимости
   переименовать/добавить (решить: «Театр» или «Спектакли»).
2. **Списки как флаги**: `family_kids`, `family_all`, `free`, `weekend` - теги/коллекция,
   НЕ Subcategory. Предикаты: `ageLimit` (детский/семейный), `priceFrom` = 0/null
   (бесплатно), наличие сессий в сб+вс (выходные).
3. **Единый резолвер** `resolveEventTaxonomy(event) -> { subcategoryId, tagIds, confidence }`,
   приоритетом: явная редакционная связка -> `subcategories`/`tags` источника по slug-мапе
   -> `landing-rules` -> эвристики `title`/`venue`. `confidence=low` -> в MappingInbox на
   ревью, а не молча в «Прочее».
4. **Backfill** одним прогоном по событиям (реализовать как повторяемый скрипт, образцовый
   уже есть `reclassify-disco-events.js`).
5. **DTO** (см. ниже).
6. **Facets каталога** строить от таксономии + списков, а не от сырого `category`.

## DTO (packages/contracts/src/public.ts)

В `PublicCatalogListItemDto` и `PublicEventDto`:
- `catalogCategory?: { slug: string; title: string }`
- `catalogSubcategory?: { slug: string; title: string }`
- `catalogLists?: Array<{ key: 'family_kids' | 'family_all' | 'free' | 'weekend'; title: string }>`
- `tagLabels?: string[]` (человекочитаемые жанры)

## Площадки: тип/подтип из PlaceType/PlaceSubtype (не «Развлечения»)

«Развлечения» - это раздел СОБЫТИЙ (`cat_entertainment`). У площадок своя таксономия:
- `Venue.kind` (VenueKind) - грубое семейство (institution / location);
- `Venue.placeType` (enum PlaceType) - тип: THEATRE, MUSEUM, ENTERTAINMENT, FOOD,
  ARCHITECTURE, MONUMENT, NATURE, RELIGION, URBAN, TRANSPORT, VENUE, OTHER;
- `Venue.placeSubtype` (String) - подтип: circus (Цирк), zoo (Зоопарк),
  planetarium (Планетарий), aquarium (Океанариум), museum (Музей), gallery (Галерея),
  restaurant (Ресторан), park (Парк) и т.д. Контролируемый список - в
  `packages/contracts/src/place-pdp.ts` (PLACE_TYPE_OPTIONS / PLACE_SUBTYPE_OPTIONS).

Цирк, Зоопарк, Планетарий обособляются через `placeSubtype` (web показывает отдельные
группы по ярлыку подтипа). RU-ярлыки берутся из place-pdp.ts. Новый enum не нужен - он
уже есть; при необходимости строки в БД проставляются через `placeType`/`placeSubtype`,
а не через `kind`.

Внимание: «Развлечения» для МЕСТ = display-группа из развлекательных подтипов
(цирк/зоопарк/планетарий/аквапарк…), а «Развлечения» для СОБЫТИЙ = `cat_entertainment`
(Category/Subcategory). Два разных источника; в web не смешивать: места группируются по
placeType/placeSubtype + display-группам, события - только по Category/Subcategory.

Display-группировка Афиши (финальная): «Развлечения» (цирк/зоопарк/планетарий/аквапарк/квест/
смотровая/кинотеатр) + «Достопримечательности» (особенные места: памятники/архитектура/природа,
БЕЗ цирка/зоопарка).

Задача Codex (реклассификация): Цирк, Зоопарк, Планетарий, Океанариум, Кинотеатр, Аквапарк -
развлекательный сегмент, НЕ театр/музей/достопримечательности. В `place-pdp.ts` сейчас Цирк и
Кинотеатр под `THEATRE`, Планетарий и Океанариум под `MUSEUM` - поправить `PLACE_SUBTYPE_OPTIONS`
(перенести в `ENTERTAINMENT`, `variant: 'attraction'`) и прогнать reclassify по площадкам
(`placeType`/`kind`). Планетарий - шоу, не музей: в `MUSEUM` его не оставлять.

- Рельсы Афиши - плоский набор: типы по `catalogSubcategory.title`, списки по
  `catalogLists` (со ссылкой в каталог с пресетом фильтра).
- Бейдж карточки - `catalogSubcategory.title` (фолбэк `collectCatalogLabels` до backfill).
- «Смотреть всё / Вся афиша» ведёт в полный каталог, отфильтрованный по теме/списку.