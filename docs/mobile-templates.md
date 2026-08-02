# Mobile page templates (канон)

**Дата:** 2026-08-02  
**Ветка:** `feat/next-monorepo`  
**Статус:** канон IA/layout + first structural ship (LOC1/LOC2/LOC4 + detail sticky)  
**Связано:** [ux-locations-mobile-catalog-brief.md](./ux-locations-mobile-catalog-brief.md), [Project.md](./Project.md)

Один composition system для публичного web на узком экране. Не полный visual redesign - структурные правила, которые команда и Codex обязаны соблюдать при новых экранах и правках.

---

## Sticky chrome (всегда)

Порядок в fixed header (`SiteHeader`):

1. Menu (бургер)
2. Brand (`Дайбилет` logo)
3. **City chip** (`CityPicker` variant `header`) - всегда виден на mobile
4. Day-route badge (`DayRouteBadge` → `/my-day`)
5. (Desktop only) search / auth / help / favorites

Правила:

- Город **нельзя** прятать за `lg:block` в sticky chrome.
- В `MobileNavSheet` блок «Город» - **сразу после поиска**, до пунктов навигации.
- Safe-area: `pt-[env(safe-area-inset-top)]` на header; sticky bottom bars - `pb-[env(safe-area-inset-bottom)]`.
- Skeleton (`SiteChromeSkeleton`) должен визуально совпадать с chrome (включая slot города).

---

## Hero budget (first screen)

Первый viewport под header = **одна композиция**, не dashboard.

| Разрешено | Запрещено в first screen |
|-----------|--------------------------|
| H1 + 1 короткая supporting строка | Карта РФ / тяжёлый map panel |
| Один primary CTA (или пара: primary + day-route) | Stats strip, schedule snippets, promo chips-cloud |
| Горизонтальные type/date chips (один ряд) | Два city-control подряд (header + hero select) |
| Search field (catalog) | Full-bleed hero на всю высоту экрана без CTA |

Каталоги (`/events`, `/venues`, `/locations`, `/cities`): предпочитать `HeroLayout` `variant="minimal"` + `dense` на mobile. Карты - **ниже fold** или `lg+` only.

Детали события: mobile hero ≈ `min(42vh, 20rem)`, не `100vh`. Buy CTA в hero на mobile обязателен (уже есть).

---

## Primary CTA

| Поверхность | Primary | Secondary |
|-------------|---------|-----------|
| Event detail | Купить / к виджету | В мой день (если уместно) |
| Venue (institution) | К афише (`#venue-program`) | В мой день |
| Location | Экскурсии / Маршруты | В мой день |
| `/my-day` | Из каталога (локации/площадки/события) | Своё место (accordion) / Карты |
| Catalog card | Открыть сущность | В мой день (hit-target) |

Mobile sticky bottom: общий `MobileStickyActionBar` (`lg:hidden` + safe-area). Страница даёт `pb-24` (или `pb-28`), чтобы контент не прятался под бар.

---

## Порядок секций (one job per section)

### Catalog list

1. Sticky chrome  
2. Dense hero (H1 + context)  
3. Type / category chips (гориз. scroll)  
4. Search (+ filters sheet entry)  
5. Results list  
6. Cross-links / map (desktop) / footer  

### Detail (event / venue / location)

1. Sticky chrome  
2. Hero: media + title + 1 meta row + primary CTA  
3. Sticky subnav (опционально, institution)  
4. Primary content (афиша / маршруты / экскурсии)  
5. About / logistics / map  
6. Related  
7. Mobile sticky action bar  

### `/my-day` (owner IA 2026-08-02)

1. Sticky chrome (city chip)  
2. Title + count (`Точки · N/8`) + short help  
3. **Primary:** «Добавить из каталога» - city-scoped CTAs Локации / Площадки / События + link на хаб города («Главные места» / «Собрать за минуту»)  
4. Stops list (+ Yandex / optimize when coords allow)  
5. Matches excursions (`#day-route-matches`)  
6. **Secondary accordion** (collapsed): «Добавить своё место» - text planner (`#day-plan-form`)  
7. Sticky: Из каталога / Своё / Карты / Экскурсии  

Foundation заполнения - каталожные сущности. Ручной текст опционален, не first-screen. `DAY_ROUTE_MAX=8`.

---

## Filters / chips

- Город - в header (источник правды: `SelectedCityProvider`).
- Active filter chips: город первым, если показан в toolbar.
- На mobile не дублировать native date `<select>` + `<input type=date>` в одном ряду (follow-up LOC7).
- Type chips: один горизонтальный scroll-ряд, не wrap-облако на first screen.

---

## Shared building blocks

| Компонент | Роль |
|-----------|------|
| `SiteHeader` / `MobileNavSheet` | Sticky chrome + city |
| `CityPicker` | header / compact / hero |
| `HeroLayout` | catalog first viewport |
| `CatalogShell` / `CatalogToolbar` | `/events` sticky filters |
| `MobileStickyActionBar` | bottom CTA bar |
| `DayRouteBadge` / `AddToDayRouteButton` | day-route entry |

Новые экраны: переиспользовать эти блоки, не плодить per-page sticky/hero one-offs.

---

## Audit snapshot (2026-08-02)

| URL | First screen (mobile) | Статус после ship |
|-----|----------------------|-------------------|
| `/` | Brand hero + city in home search | OK; city теперь и в header |
| `/events` | Catalog toolbar sticky | City chip в header ✅; context line / date UX - backlog |
| `/cities`, `/cities/[slug]` | Hub night hero | OK structurally |
| `/venues` | Catalog hero | OK |
| `/venues/[slug]` | Institution hero + sticky CTA | Safe-area ✅ |
| `/locations` | Dense minimal + chips; map lg+ | ✅ LOC4 |
| `/locations/[slug]` | Location hero + sticky CTA | ✅ aligned |
| `/my-day` | Catalog CTAs first; text form accordion collapsed | ✅ catalog-first IA |
| Header / menu | City chip + city near top in sheet | ✅ LOC1/LOC2 |

---

## Backlog (ordered)

1. **LOC5** - `/events` context line «События в {город}» + soft banner if city=all  
2. **LOC6** - bottom-sheet CityPicker (search + popular)  
3. **LOC7** - catalog date UX: один entry (chips/sheet)  
4. **LOC3** - rename «Локации» → job-label (после owner)  
5. **LOC8/R1** - demote `/locations` из primary nav / city-hub section  
6. Filters+auto-pick+top-up для «Мой день» (product next) - поверх этого канона  

Не включать wide catalog CTA без запроса owner.
