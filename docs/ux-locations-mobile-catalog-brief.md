# UX brief: Локации + мобильный каталог

**Дата:** 2026-08-01  
**Ветка:** `feat/next-monorepo`  
**Статус:** research + redesign brief (без UI rewrite в этом проходе)  
**Live smoke:** `/locations` `/events` `/cities` → HTTP 200 (MSK)

---

## Вердикт (для owner)

1. **`/locations` нужен rebuild IA, не косметика.** Сейчас это второй venue-каталог (причалы / парки / точки сбора) с лейблом «Локации», который пользователь читает как «куда поехать / города». Primary job страницы неочевидна: нет city-first сценария, hero+карта жрут мобильный viewport, CTA размыты («искать адрес» vs «купить билет»).
2. **Мобильный каталог (`/events`) неудобен в первую очередь из-за скрытого города.** `CityPicker` в шапке `hidden lg:block`; на mobile город только внутри бургер-меню, **внизу** после всех пунктов. Выбор города не виден в sticky chrome → легко потеряться в выдаче «Все города».
3. **Quick wins дешёвые и дадут 70% ощущения «стало понятно».** Полный merge venues+locations / новый hub - позже.

---

## 1. Аудит текущего продукта

### IA и маршруты

| Поверхность | URL | Роль сегодня | Primary CTA |
|-------------|-----|--------------|-------------|
| Города | `/cities`, `/cities/[slug]` | Хабы направлений (понятно) | Карточка города → hub |
| События | `/events`, `/events/[slug]` | Афиша + фильтры | Карточка → event |
| Площадки | `/venues` | Музеи / театры / залы (`institution`) | Карточка venue |
| Локации | `/locations`, `/locations/[slug]` | Причалы / парки / точки сбора (`location` template) | Карточка места |
| Подборки | `/podborki` | Landing-каталог | Карточка подборки |

**Три «места» в nav:** Города / Площадки / Локации. Для новичка это одна сущность («где что происходит»), разрезанная на три без объяснения.

### Как выбирается город сегодня

- **Источник правды:** `SelectedCityProvider` + `localStorage` ключ `daibilet:selected-city`.
- **URL:** на `/events` `/venues` `/locations` `/podborki` синхронизируется `?city=Имя` (inject из storage, если query пустой).
- **Desktop header:** `CityPicker` variant `header` рядом с логотипом.
- **Mobile:** город **не** в sticky header; только `MobileNavSheet` → секция «Город» **после** навигации, избранного и FAQ.
- **Дополнительно на `/locations`:** нативный `<select>` городов в hero (дубль header-логики, на mobile хоть виден, но слабый affordance).

### `/locations` (разметка)

- SSR shell: `app/locations/page.tsx` → `VenueListPage({ family: 'location' })`.
- UI: `LocationsCatalogView.client.tsx`.
- Hero `withMap` + `RussiaMap` (на mobile карта уезжает под фильтры, съедает first screen).
- H1: «Локации и точки сбора» (+ city в предложном, если фильтр).
- Блок: search + city `<select>` + type chips (Причал, Парк, Точка сбора…).
- Сетка карточек `LocationCard`; cross-links на площадки / города / афишу.
- Meta/copy: каталог мест встречи, не tourist «куда сходить».

### `/events` mobile (pain в markup/CSS)

- Sticky toolbar: `CatalogShell` → `top-[var(--site-header-height)]` (хорошо).
- В toolbar **нет** city control - только search / date select / date input / «Фильтры» / «Найти».
- На узком экране date select + calendar input + filters + submit в одном ряду → визуальный шум, город не участвует.
- Category chips горизонтальный scroll; active filter chips отдельно.
- Nav на mobile: полный список из 6 пунктов без иерархии (События / Города / Площадки / Локации / Подборки / Блог).

### Ключевые файлы

```
apps/web/src/components/SiteHeader.client.tsx          # nav + mobile sheet; city lg-only
apps/web/src/components/CityPicker.client.tsx          # header/hero/compact picker
apps/web/src/components/SelectedCityProvider.client.tsx
apps/web/src/lib/selected-city.ts                      # storage + CITY_FILTER_PATHS
apps/web/src/components/CatalogShell.client.tsx
apps/web/src/components/CatalogToolbar.client.tsx
apps/web/src/components/CatalogActiveFilters.tsx
apps/web/src/components/LocationsCatalogView.client.tsx
apps/web/src/components/VenuesCatalogView.client.tsx
apps/web/src/components/CitiesCatalogView.client.tsx
apps/web/app/cities/page.tsx
apps/web/app/locations/page.tsx
apps/web/app/events/page.tsx
apps/web/src/lib/venue-meta.ts                         # institution vs location split
apps/web/src/components/HeroLayout.tsx
```

---

## 2. Конкурентные паттерны

### City selection (mobile)

| Сервис | Паттерн | Скрин / UI-описание |
|--------|---------|---------------------|
| **Яндекс Афиша** | Город в URL (`/moscow`) + явный switcher вверху; гео как fallback | Шапка: город кликабелен; календарная лента дат; фильтры «Тип события» / «Все фильтры»; browse по категориям, не по «локациям» |
| **Kassir.ru** | City-gate: «ВЫБРАТЬ СВОЙ ГОРОД» как главный CTA до афиши | Hero-first город; без города лента бессмысленна |
| **Afisha.ru** | Город в path (`/msk/`); гид по городам с counts | «Гид выходного дня»: Москва N событий - город = контейнер контента |
| **Eventbrite** | Location в поисковой строке / заголовке выдачи; «Popular in {City}» | Browse + search; город всегда в контексте списка |
| **Aviasales / Ostrovok** (city-picker UX) | Город - **первое** поле формы; fullscreen sheet: поиск + недавние + популярные | Pin/город нельзя «не заметить» |

### Locations / places hub

Крупные афиши **не** держат отдельный пункт «Локации» рядом с «Городами». Места (venues) - атрибут события или drill-down из города / карты. Отдельные «точки сбора» - нишевой Daibilet-контент (речные/пешие), не общий mental model.

### Catalog entry + sticky filters

- **Steal:** city always visible; sticky date/category; chips «активные фильтры»; empty → сброс + соседние города.
- **Avoid:** desktop density на mobile (много equal controls); параллельные каталоги мест без пояснения; карта в first viewport без задачи «найти на карте».

### Что брать / не брать Daibilet

**Брать**
1. Город в sticky header на mobile (chip с MapPin + имя).
2. Fullscreen / bottom-sheet picker: поиск, топ городов, «Все города».
3. City-first: афиша по умолчанию в выбранном городе (уже почти так через storage - но UI это не показывает).
4. Kassir-style first-visit hint: «Выберите город» если storage пуст.
5. На `/locations`: job-to-be-done copy («Места встречи и точки старта») + city chip выше fold без карты.

**Не брать**
1. Ещё один равноправный nav-пункт без подписи.
2. Гео-автовыбор без явного подтверждения (боль Яндекса: «не тот город»).
3. Перегрузку фильтров в одну строку.

---

## 3. Proposed redesign

### A. `/locations` - новая IA (mobile-first)

**Job:** «Где встречаемся / откуда стартует экскурсия» - вторичный browse **после** города, не замена `/cities`.

**Wireframe (mobile, сверху вниз)**

1. Sticky header: logo | **City chip** | search icon | menu  
2. H1 короткий: «Точки сбора и причалы» (или «Места встречи») + 1 строка: «Фильтр по городу уже в шапке»  
3. Type chips (гориз. scroll): Все · Причалы · Парки · Точки сбора · …  
4. Search field (опционально collapse)  
5. Список карточек: фото / имя / тип / N событий → CTA «События здесь»  
6. Footer strip: ссылки «Площадки (музеи)» · «Афиша» · «Города»  
7. Карта РФ - **не** в first screen; либо tab «На карте», либо ниже fold / desktop aside only  

**Primary CTA карточки:** события у места (не «красивое место без билета», пока нет admission product).  
**Secondary:** открыть карточку места.

**Nav recommendation (выбрать один вариант с owner):**
- **V1 (предпочтительно):** в mobile menu переименовать «Локации» → «Точки сбора» / «Места встречи»; desktop xl-link оставить с новым label.  
- **V2:** убрать из primary nav; вход с city hub + footer + `/events` cross-link.  
- **V3 (большой rebuild):** единый `/places` = venues+locations с type tabs.

### B. Catalog mobile - city + filters

**City affordance**
- Chip в header (всегда): `📍 Санкт-Петербург ▾` → sheet picker.  
- Дубль chip в sticky catalog toolbar (опционально, если header crowded).  
- В `MobileNavSheet`: блок «Город» **первым** после поиска, не последним.

**Filters**
- Row 1: search  
- Row 2: [Сегодня|Завтра|Выходные|Дата] chips + кнопка «Ещё фильтры»  
- Убрать одновременный native date `<select>` + `<input type=date>` на mobile (один entry point в sheet).  
- Active chips: город всегда первым; clear all.

**Reduce confusion**
- Под H1/афишей одна строка контекста: «События в {город} · N» или «Все города».  
- Если city=all - мягкий banner: «Выберите город - афиша станет короче».

### C. Quick wins vs larger rebuild

| # | Работа | Effort | Impact |
|---|--------|--------|--------|
| Q1 | Mobile header city chip (`lg:hidden` sibling) | S | Критический |
| Q2 | City block наверх в `MobileNavSheet` | XS | Высокий |
| Q3 | Catalog mobile: context line + city в active chips заметнее | S | Высокий |
| Q4 | Locations: dense hero, map below fold / desktop-only | S | Высокий |
| Q5 | Rename nav/H1 «Локации» → job-based label | XS | Высокий |
| Q6 | Bottom-sheet CityPicker (search + popular) | M | Высокий |
| Q7 | Catalog mobile date UX simplify | M | Средний |
| R1 | IA: Locations как секция city hub + demote nav | M | Высокий |
| R2 | Unified places catalog | L | Средний (после R1) |
| R3 | First-visit city gate modal (Kassir-like) | M | Средний |

**Рекомендуемый порядок сборки:** Q1 → Q2 → Q5 → Q4 → Q3 → Q6 → Q7 → R1 → (R3?) → R2.

### D. Open questions for owner

1. **Лейбл:** «Точки сбора» / «Места встречи» / оставить «Локации»?  
2. **Nav:** оставить пункт, переименовать, или убрать в secondary?  
3. **Default city:** оставлять «Все города» или форсить выбор (gate) на первом визите?  
4. **Гео:** нужен ли IP/GPS suggest с явным confirm (не silent)?  
5. **Scope `/locations`:** только meeting/pier/park с событиями, или SEO-контентные места без афиши тоже в списке (VK.8)?  
6. **Единый `/places`:** интересен в 2026 Q3 или рано?

---

## 4. Связь с трекером

Задачи: `UX.LOC1`… в [Tasktracker.md](./Tasktracker.md). Вопросы: [qa.md](./qa.md) § UX locations + mobile catalog.
