# Venue logistics («как найти») — CV.9

**Обновлено:** 2026-07-25  
**Статус:** design / backlog (без кода в этом проходе)  
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
2. `pnpm --filter @daibilet/db exec prisma migrate dev --name venue_logistics` (или принятый monorepo-скрипт migrate).
3. Prod: `prisma migrate deploy` в обычном deploy path.
4. Backfill **не** автоматический: поля nullable, контент руками в admin.

Индексы не нужны (не фильтруем каталог по этим полям в MVP).

### Admin CMS

**Канон UI:** Next admin `apps/web/app/(admin)/admin/venues/[id]/page.tsx` (форма save → `saveAdminVenueAction` → `PATCH /api/admin/venues/:id`).

Сейчас форма **не** пишет `address` / coords / logistics: `normalizeVenuePayload` + `updateAdminVenue` принимают только SEO/kind/pageStatus/descriptions.

**CV.9b добавить секцию «Логистика»** (после Description / перед SEO или сразу после Title grid):

| Label (RU) | `name` | control |
|------------|--------|---------|
| Метро | `metroStation` | input |
| Как найти | `wayToFind` | textarea (3-5 rows) |
| Парковка | `parkingInfo` | input или textarea 2 rows |

Опционально в той же секции (удобство редактора, не блокер MVP): readonly или editable `address` + lat/lng - сейчас address только в header detail, не в PATCH. **Рекомендация:** в CV.9b сделать **editable `address`** рядом с logistics (данные уже в БД); lat/lng оставить out-of-scope или readonly display + ссылка «открыть в Яндекс.Картах» - geocode auto-fill запрещён.

Цепочка правок:

1. `normalizeVenuePayload` / `updateAdminVenue` SQL SET - новые колонки.
2. `buildAdminVenueDetail` SELECT - вернуть поля.
3. `packages/contracts` `AdminVenueRowDto` (+ Vite `apps/admin` types/draft **если** ещё живёт parity; канон - Next).
4. `saveAdminVenueAction` + form fields + `AdminVenueDetailData`.

### Public DTO

Расширить `PublicVenueDto` (`packages/contracts/src/public.ts` + зеркало `apps/backend/src/types/public.ts`):

```ts
metroStation?: string | null;
wayToFind?: string | null;
parkingInfo?: string | null;
```

Прокинуть в:

- `buildPublicVenuePage` / `resolvePublicVenueRow` (`dto.js`) - SELECT + response `venue`.
- Lean list (`public-venue-lean.ts`) - **не обязательно** для catalog tiles (экономия); достаточно page DTO + modal fetch.
- Cache: `clearPublicVenueDtoCache` / `invalidatePublicCaches` уже на venue PATCH.

**Event page:** не раздувать list/catalog. Для модалки:

- **Предпочтительно:** клиентский `GET /api/public/venues/:slug` (или id) при открытии + short-circuit если уже есть slim payload.
- **Альтернатива:** slim `venueLogistics` на `PublicEventDto` / event page payload - только если latency modal fetch неприемлема.

Минимум на event для открытия модалки уже есть: `venueId`, `venueSlug`, `venue`, `venueAddress`.

### Empty state

Показывать блок логистики, если есть **хотя бы одно** из:

- non-empty `address`
- `metroStation` / `wayToFind` / `parkingInfo`

Если все три logistics null **и** нет address - **скрыть весь блок** (и на venue page, и в modal). Карту в modal показывать только при lat/lng **или** non-empty address (query fallback).

---

## 2. Venue page UI

Заменить «сухой» адрес в секциях **«Как добраться»**:

- `LocationVenueLayout.client.tsx` - секция ~«Как добраться»
- `InstitutionVenueLayout.client.tsx` - sidebar practical

Общий презентационный компонент (рекомендация): `VenueLogisticsBlock` в `apps/web/src/components/`.

Состав (Clean UI: `rounded-2xl` / `border-slate-200` / `text-graphite` / icons lucide как сейчас):

1. **Название** площадки (`venue.name` / title)
2. **Адрес** (`formatStreetAddress`)
3. **Метро** - если `metroStation`; опциональный walk hint только если явно в тексте `wayToFind` или отдельного поля нет - **не выдумывать** «N мин пешком» без данных
4. **Как найти** - `wayToFind`
5. **Парковка** - `parkingInfo`

Карта на venue page: оставить существующий **`OsmMapEmbed`** (OSM iframe по lat/lng) + внешние ссылки Яндекс/Google. CV.9 **не** обязан менять venue-page map provider (см. modal ниже).

Copy templates: без em dash; примеры: `Метро - Невский проспект`, `Адрес уточняется`.

---

## 3. Event ↔ Venue UX

### Сейчас

`EventPage.client.tsx` (`EventHero`): venue - это `<Link href={venueHref(...)}>` (уход со страницы).  
`EventQuickInfo`: только адрес/название текстом, без logistics.

### Целевое

Клик по названию площадки в hero (и при желании pin в QuickInfo) открывает **modal**, не navigate.

| Элемент | Поведение |
|---------|-----------|
| Modal shell | Паттерн как `CheckoutModal.client.tsx` (portal, Escape, body scroll lock, overlay) |
| Placement | Client island рядом с `EventHero` / внутри `EventPage.client.tsx`; SSR page `events/[slug]/page.tsx` без обязательного logistics |
| Content | `VenueLogisticsBlock` + карта |
| Footer | Ссылка «Страница площадки» → `/venues/...` или `/locations/...` **если** public page существует |
| Fallback navigate | Нет `venueSlug`/`venueId`; public venue API 404 / HIDDEN; no-JS → обычный `<a href>` |

### Карта в modal

Owner: **Yandex Maps iframe** с маркером.

| Данные | Embed |
|--------|--------|
| Есть `latitude` + `longitude` | `https://yandex.ru/map-widget/v1/?ll={lng},{lat}&z=16&pt={lng},{lat}` (базовый widget **без** JS API key) |
| Нет coords, есть address | iframe/query по `text=` / `ll` через address search URL widget; если iframe нестабилен - только deep-link «Открыть в Яндекс.Картах» |
| Нет coords и нет address | карту не показывать |

**Reuse:** новый тонкий `YandexMapEmbed` (не ломать `OsmMapEmbed` на venue pages в том же спринте). Общий `VenueMapPanel` может выбирать provider по prop.

HC.11 (catalog «Рядом со мной» без lat/lng на cards) - **вне CV.9**; modal использует page DTO coords, не catalog card.

---

## 4. Подзадачи (см. Tasktracker)

| ID | Scope | Приоритет |
|----|--------|-----------|
| **CV.9a** | Prisma schema + migrate | Высокий |
| **CV.9b** | Admin CMS + PATCH | Высокий |
| **CV.9c** | Public DTO + `VenueLogisticsBlock` на venue layouts | Высокий |
| **CV.9d** | Event modal + Yandex iframe | Средний |

Порядок: 9a → 9b → 9c → 9d.

---

## Out of scope

- Auto-geocode / sync из TC address templates
- CV.5 discounts
- Массовый backfill logistics
- Смена OSM → Yandex на полных venue pages (можно follow-up)
- Vite `apps/public` parity (deprecated после F3) - не блокирует
