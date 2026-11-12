# Codex handoff: DTO-поля для V2-превью (рейтинг, метро, программа, площадки)

Дата: 2026-11-11. Автор: Cline (frontend).

## Зачем

Превью нового дизайна (`/home2`, `/afisha2`, `/places2`, `/event2/[slug]`, `/perm2`)
уже рендерятся на живом публичном API (`/api/public/*`), но несколько блоков мокапов
нельзя закрыть, потому что нужных полей нет в публичных DTO. Ниже - точечный список,
что протянуть в контракты и builder'ы, чтобы макеты закрылись на 100%.

## Владение

- `packages/db` (Prisma), `packages/contracts` (Zod/TS DTO), `apps/backend/src` - Codex.
- `apps/web` - Cline.
- Изменение контрактов готовится отдельным коммитом и показывается владельцу, а не
  кладётся в общий фронт-diff.

## A. Карточки событий: `PublicCatalogListItemDto`

Файл: `packages/contracts/src/public.ts` (интерфейс ~L115).
Builder: `apps/backend/src/public-catalog.dto.ts`.
Закрывает `.event-card` / `.featured-card` на `/home2` и `/afisha2`.

| # | Поле | Тип | Источник | Приоритет |
|---|---|---|---|---|
| A1 | `venueMetroStation` | `string \| null` | `Venue.metroStation` (в `PublicVenueDto` уже проброшено, в каталог - нет) | Высокий |
| A2 | `rating` | `{ value: number; count: number } \| null` | Агрегат по `Review` (status=APPROVED); логика уже есть в вебе `apps/web/src/server/cached-event-data.ts` -> `getCachedEventAggregateRating` | Высокий |

Примечание к A2: тянуть денормализованно в список, иначе один запрос на карточку
умножит нагрузку каталога. Отдельные отзывы в список не нужны.

## B. PDP события: `PublicEventPageDto`

Файл: `packages/contracts/src/public.ts` (интерфейс ~L367).
Builder: `apps/backend/src/public-event.dto.ts`.
Закрывает `/event2/[slug]`.

| # | Поле | Тип | Источник | Приоритет |
|---|---|---|---|---|
| B1 | `rating` | `{ value: number; count: number } \| null` | тот же агрегат, что A2 | Высокий |
| B2 | `reviews` | `Array<{ id; authorName; rating; text; createdAt; authorRole? }>` | `Review` (APPROVED), первые ~5-10. `authorRole` - если есть подпись роли, в схеме может отсутствовать | Средний |
| B3 | `program` | `Array<{ timeLabel: string; title: string; description? }>` | Блок «Программа вечера». Отдельной модели нет; предложение - формализовать конвенцию через `pdp.content.sections[]` c `kind: 'program'`, где `item.meta` = время, либо добавить `timeLabel` в items | Средний |
| B4 | `faq` | `Array<{ q: string; a: string }>` | Блок «Частые вопросы» события. Конвенция уже есть - `PublicRegionInfoDto.faq` | Средний |

## C. Площадки: `PublicVenueDto` / venue catalog feed

Файл: `packages/contracts/src/public.ts` (интерфейс ~L176, `PublicVenuesDto` ~L533).
Builder: `apps/backend/src/public-venue.dto.ts` (+ legacy `apps/backend/src/dto.js`).
Закрывает `/places2` (гибридные карточки и «справочник»).

| # | Поле | Тип | Источник | Приоритет |
|---|---|---|---|---|
| C1 | `district` | `string \| null` | Район для фейсета «Район: любой», строки `yp-row` и сортировки «по району». В `Venue` поля района нет - нужен источник (редакционное поле или форвард из гео) | Низкий (дорогой: нет источника в БД) |
| C2 | `nextEvent` | `{ title: string; dateLabel: string } \| null` | Ближайшая будущая сессия площадки (считается рядом с `futureSessionCount`) | Высокий (дёшево) |
| C3 | `capacity` | `number \| null` | Вместимость (featured / yp в макете). Редакционное поле | Низкий |

Примечание к C: бейдж «N событий» и сортировка «по количеству событий» должны брать
`futureSessionCount` (уже есть в `PublicVenueDto`), а не `events` (all-time) - иначе
визуально вводят в заблуждение. Это не правка DTO, а правило использования в web.

## D. Уже есть в DTO - до реализации просто использовать

- Галерея PDP: `pdp.content.gallery` - уже используется в `/event2`.
- Метро: `PublicVenueDto.metroStation`, `PublicEventDto.venueMetroStation` - есть;
  не хватает только в каталоге (см. A1).
- Контакты/проезд: `PublicVenueDto.phone / wayToFind / parkingInfo` - есть.
- Возраст: `PublicEventDto.ageLimit` - есть.
- Related / кросс-город: `PublicEventPageDto.related / peerEvents` - есть;
  sessions/offers для booking-виджета - есть.
- Факты/секции: `pdp.content.facts / sections` - есть.

## E. Вне зоны Codex (web-слой, берёт Cline)

- Погода на `/perm2` (`.w-weather__params` «Ощущается/Ветер/Влажность»):
  `apps/web/src/lib/city-weather.ts` `buildOpenMeteoForecastUrl` не запрашивает
  `apparent_temperature / wind_speed_10m / relative_humidity_2m`, а `CityWeatherDay`
  их не хранит. Правка веб-клиента, не контрактов.

## Порядок выполнения

1. A1 + A2 (карточки главной и афиши - самый частый UI).
2. B1 + B2 (PDP события).
3. C2 (ближайшее событие - дёшево, рядом с futureSessionCount).
4. B3, B4, C1, C3 по готовности (B4/C2 дешёвые, C1 требует решения по источнику района).

## Приёмка

- Контракты: `packages/contracts` типы без ошибок.
- Backend: соответствующие builder-тесты (каталог, event PDP, venue) без регрессий.
- Web: `pnpm --filter @daibilet/web typecheck` на 0 после поднятия версии контрактов.