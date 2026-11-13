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

## Площадки: «Развлечения» как display-группа (без нового kind)

Цирк, планетарий, зоопарк, аквапарк, парк аттракционов - не отдельные `VenueKind`.
Новый enum не добавляем. Вместо этого в `apps/web/src/lib/venue-kind-mapping.ts` ввести
**display-группу «Развлечения»**, собирающую: `CLUB_BAR_RESTAURANT` + `ATTRACTION`
(цирк/планетарий/зоопарк - title-эвристикой, как уже сделано для `art_space`/`temple`) +
`SPORT_ACTIVITY_SPACE` (активные развлечения).

Плюс разовый reclassify: строки «цирк/планетарий/зоопарк/аквапарк» из `OTHER` ->
ближайший kind (например `ATTRACTION`), чтобы не висели в «Другое». Web (`/places2`)
берёт ярлык группы из маппинга; отдельная правка фронта не требуется.

- Рельсы Афиши - плоский набор: типы по `catalogSubcategory.title`, списки по
  `catalogLists` (со ссылкой в каталог с пресетом фильтра).
- Бейдж карточки - `catalogSubcategory.title` (фолбэк `collectCatalogLabels` до backfill).
- «Смотреть всё / Вся афиша» ведёт в полный каталог, отфильтрованный по теме/списку.