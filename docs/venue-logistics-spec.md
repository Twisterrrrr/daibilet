# Venue logistics («как найти») — CV.9

**Обновлено:** 2026-07-25  
**Статус:** implemented (CV.9a-d)  
**Эпик:** **CV.9** (не путать с **CV.5** - sort «скидки», deferred)

Owner sprint label «Спринт CV.5» в разговоре = logistics; в Tasktracker канон остаётся **CV.9**. **CV.5 discounts не трогаем.**

Связанные: [Tasktracker.md](./Tasktracker.md) (CV.9a-d), [qa.md](./qa.md), [Diary.md](./Diary.md).

---

## Цель

Дать посетителю понятную логистику площадки (метро / как найти / парковка) и не уводить с `/events/[slug]` при клике на venue: модалка с тем же блоком + карта.

Ограничения (owner lock):

- Только **manual CMS** (админ заполняет).
- **Geocode-шаблон из адреса запрещён.**
- В UI-копирайте только обычный дефис `-` (без длинного/среднего тире).

---

## Locked decisions (owner 2026-07-25)

1. **Yandex в event modal:** iframe `yandex.ru/map-widget/v1/` **без** JS API key. Маркер через `pt={lng},{lat}`. Если нет lat/lng - **без iframe**, кнопка «Открыть адрес на Яндекс.Картах» (external link, `text=` address). Text search **внутри** iframe не использовать (captcha).
2. **OSM vs Yandex:** на venue pages **оставляем** `OsmMapEmbed` (OSM) для MVP. Унификация на Yandex - **deferred backlog**. `OsmMapEmbed` не удалять.
3. **Admin CV.9b:** `address` остаётся **sync-only** (readonly display, не editable в Next admin). Редактируются только `metroStation` / `wayToFind` / `parkingInfo`.
4. **Event DTO:** slim logistics fields в SSR payload event page (0ms modal). **Нет** fetch при клике.

---

## 1. Data model

### Prisma `Venue` (новые поля)

| Prisma field | DB / owner name | Type | Notes |
|--------------|-----------------|------|--------|
| `metroStation` | `metro_station` | `String?` | Станция метро; короткий текст |
| `wayToFind` | `way_to_find` | `String?` `@db.Text` | Human landmark / «как найти» |
| `parkingInfo` | `parking_info` | `String?` | Парковка (короткий текст; при необходимости позже Text) |

Уже есть и **не меняем схемой** в CV.9:

- `address String?`
- `latitude Float?` / `longitude Float?` (см. HC.11: на части catalog cards lat/lng нет - отдельный долг)

### Migration

1. Правка `packages/db/prisma/schema.prisma` → `model Venue`.
2. Migration `20260725120000_venue_logistics` + `pnpm db:deploy` в deploy path.
3. Backfill **не** автоматический: поля nullable, контент руками в admin.

Индексы не нужны (не фильтруем каталог по этим полям в MVP).

### Admin CMS

**Канон UI:** Next admin `apps/web/app/(admin)/admin/venues/[id]/page.tsx` (форма save → `saveAdminVenueAction` → `PATCH /api/admin/venues/:id`).

**CV.9b секция «Логистика»:**

| Label (RU) | `name` | control |
|------------|--------|---------|
| Адрес | - | **readonly** sync-only (не в PATCH) |
| Метро | `metroStation` | input |
| Как найти | `wayToFind` | textarea (3-5 rows) |
| Парковка | `parkingInfo` | textarea 2 rows |

Цепочка: `normalizeVenuePayload` / `updateAdminVenue` / `buildAdminVenueDetail` / contracts / `saveAdminVenueAction` / form.

### Public DTO

`PublicVenueDto`:

```ts
metroStation?: string | null;
wayToFind?: string | null;
parkingInfo?: string | null;
```

`PublicEventDto` (slim для modal, SSR):

```ts
venueLatitude?: number | null;
venueLongitude?: number | null;
venueMetroStation?: string | null;
venueWayToFind?: string | null;
venueParkingInfo?: string | null;
```

Прокинуть в:

- `buildPublicVenuePage` / `resolvePublicVenueRow` (`dto.js`) - SELECT + response `venue`.
- `buildPublicEventDto` (`public-event.dto.ts`) - из `requestedEvent.venue`.
- Lean list - **не** обязательно для catalog tiles.

### Empty state

Показывать блок логистики, если есть **хотя бы одно** из:

- non-empty `address`
- `metroStation` / `wayToFind` / `parkingInfo`

Если все три logistics null **и** нет address - **скрыть весь блок**.

Карта в modal: iframe только при lat/lng; иначе external button при наличии address.

---

## 2. Venue page UI

`VenueLogisticsBlock` в `apps/web/src/components/`:

1. **Название** площадки (опционально)
2. **Адрес** (`formatStreetAddress`)
3. **Метро** - если `metroStation`
4. **Как найти** - `wayToFind`
5. **Парковка** - `parkingInfo`

Карта на venue page: существующий **`OsmMapEmbed`** + внешние ссылки Яндекс/Google. Унификация OSM→Yandex - backlog.

---

## 3. Event ↔ Venue UX

Клик по названию площадки в hero открывает **modal** (`EventVenueModal`), не navigate.

| Элемент | Поведение |
|---------|-----------|
| Modal shell | Паттерн как `CheckoutModal` (portal, Escape, body scroll lock, overlay) |
| Content | `VenueLogisticsBlock` + Yandex iframe **или** кнопка external |
| Footer | «Страница площадки» → `/venues/...` или `/locations/...` |
| Data | slim fields из event SSR payload (0ms) |

### Карта в modal

| Данные | Embed |
|--------|--------|
| Есть `latitude` + `longitude` | `https://yandex.ru/map-widget/v1/?ll={lng},{lat}&z=16&pt={lng},{lat}` (без JS API key) |
| Нет coords, есть address | кнопка «Открыть адрес на Яндекс.Картах» (`text=` address) - **без** iframe |
| Нет coords и нет address | карту не показывать |

Компонент: `YandexMapEmbed`. `OsmMapEmbed` на venue pages не трогаем.

---

## 4. Подзадачи

| ID | Scope | Приоритет | Статус |
|----|--------|-----------|--------|
| **CV.9a** | Prisma schema + migrate | Высокий | ✅ |
| **CV.9b** | Admin CMS + PATCH | Высокий | ✅ |
| **CV.9c** | Public DTO + `VenueLogisticsBlock` | Высокий | ✅ |
| **CV.9d** | Event modal + Yandex iframe | Средний | ✅ |

---

## Out of scope / backlog

- Auto-geocode / sync из TC address templates
- CV.5 discounts
- Массовый backfill logistics
- **Унификация OSM → Yandex на полных venue pages** (deferred)
- Vite `apps/public` parity (deprecated после F3)
