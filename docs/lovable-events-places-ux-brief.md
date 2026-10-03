# Lovable brief: UX refresh for /events and /places listings only

**Product:** Daibilet (дайбилет) - tickets + city guides for Russian cities.
**Goal:** Visual/UX refresh of **two listing pages only**: `/events` and `/places`.  
**Do not redesign IA, routes, data model, or any detail/PDP pages.**

## Scope (strict)

### IN (только это)
- `/events` - страница выдачи (сетка/список + фильтры + empty/loading).
- `/places` - страница выдачи (сетка/список + фильтры + empty/loading).
- Shared FilterRail / chips для этих двух страниц.
- Карточки в выдаче: EventCard, PlaceCard (как элементы списка).

### OUT (не рисовать, не трогать)
- Внутренние страницы: `/venues/{slug}`, `/locations/{slug}`, event PDP, любые detail screens.
- City hubs `/cities/{slug}`, blog, My Day, checkout modal internals, admin, finance.
- Новые разделы навигации, новые sitemap facets, переименование families.

Карточки в выдаче могут **вести** на существующие `/venues/...` или `/locations/...` - но макеты этих страниц **не входят** в задачу.

## Hard constraints (non-negotiable)

1. **Same catalog, same listing URLs**
   - Keep `/events` and `/places` with query filters (`?city=`, `?family=`, `?category=`, dates, tags).
   - No new primary nav items, no renaming families.

2. **Backend stays as-is**
   - Cards still consume existing public DTOs (title, imageUrl, price/from, city, dates, venue).
   - If a buy CTA appears on a listing card, keep **two checkout paths**: TicketsCloud (native widget) and Teplohod/TEP (iframe embed). Do not collapse into one generic "Купить".
   - Empty states, pagination/cursor, and "no offers" behavior stay product-owned; propose UI only.

3. **Listing photos**
   - Covers already use sidecar preference (`-card.jpg` / `-thumb.jpg` → original). Design for **card aspect ratios** (~4:3 or 3:2), not full-bleed hero crops.
   - Do **not** invent a new media CDN or require new image fields.

4. **Sitewide minimalism (LOCKED)**
   - One filter row on mobile (horizontal swipe rail), not stacked selects + chip stacks.
   - No system junk: no "Найдено N", no "стр. 1 из 10", no instructional fluff.
   - Clean covers: price / seats / dates **under** the image, not 4-5 colored pills on the photo.
   - One thin monochrome line-icon pack; no emoji chrome.

## What to deliver

- High-fidelity layouts (desktop + mobile) for **events listing** and **places listing** only.
- Component notes: EventCard, PlaceCard, FilterRail, optional sticky filter bar on those pages.
- Interaction notes only (hover, focus, filter chip active) - no new API contracts.
- Optional: Auto.ru-inspired density (compact cards, strong photo, clear price) **without** car-marketplace chrome (no "VIN", no dealer blocks).
- **No** venue/location/event detail mockups.

## Copy language

- Russian UI. Prefer hyphen `-`, never em/en dash in user-facing copy.

## Paste-ready prompt for Lovable

```
Ты рисуешь UX-обновление Daibilet (дайбилет) ТОЛЬКО для двух страниц выдачи: /events и /places.

НЕ РИСУЙ внутренние страницы: /venues/{slug}, /locations/{slug}, event PDP, хабы городов, блог, My Day, checkout, admin.

ПРОБЛЕМА:
Сейчас /events и /places выглядят устаревшими и «системными»: плотные фильтры, мусор вроде «Найдено N» / пагинация-шум, цветные пиллы поверх обложек, слабая иерархия карточки. Нужен свежий UI в духе плотного marketplace (сильная фотокарточка, цена/даты под кадром, одна filter-rail), но это НЕ новый каталог и НЕ новая бизнес-логика.

ЖЁСТКИЕ ОГРАНИЧЕНИЯ:
1) Только листинги /events и /places + query-фильтры (?city, ?family, ?category, даты, теги). Не добавляй разделы навигации и не переименовывай family.
2) Backend/DTO без изменений. Карточки едят текущие поля (title, imageUrl, price/from, city, dates, venue).
3) Если на карточке выдачи есть купить - сохрани ДВА пути: TicketsCloud (native widget) и Teplohod/TEP (iframe). Не своди к одному «Купить».
4) Картинки: sidecar -card/-thumb. Дизайн под card aspect ~4:3 или 3:2, не full-bleed hero. Новых image-полей не требуй.
5) Locked minimalism: на mobile одна горизонтальная filter-rail; без instructional fluff; цена/места/даты ПОД фото, не 4-5 пиллов на обложке; тонкие монохромные line-icons, без emoji.
6) Клик по карточке может вести на существующий /venues/... или /locations/... - но эти страницы НЕ макетировать.

SCOPE:
IN: сетка событий, сетка мест, shared FilterRail, empty/loading skeletons, desktop+mobile.
OUT: любые detail/PDP, /cities хабы, блог, checkout internals, admin, finance, My Day.

DELIVERABLE:
High-fidelity layouts только для /events и /places + заметки EventCard / PlaceCard / FilterRail. Только interaction notes. Без новых API-контрактов. Без макетов внутренних страниц.

Язык UI: русский. В копирайте только обычный дефис "-", без длинного тире.
Acceptance: новый skin двух листингов Daibilet; инженер внедряет в существующие Next-компоненты без смены routes/DTO.
```

## Acceptance

- Looks like a refreshed skin on the **current** Daibilet `/events` and `/places` listings only.
- Engineer can implement in existing Next React listing components without changing backend routes, DTOs, or detail pages.
