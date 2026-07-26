# Master-шаблон лендингов (CRO) - Night Bridges как эталон

Дата: 2026-07-26  
Ветка: `feat/next-monorepo`  
Статус: план + Phase L1 (thin)

## Цель

Унифицировать CHPU-лендинги вокруг паттернов **Night Bridges** (`bridges-night` / `LandingProfile = 'bridges'`): продающий hero, клиентские фильтры без full reload, расписание с CTA, контекстные блоки.  
**Не** изобретать параллельный роутинг `app/[city]/[category]` и **не** подменять CHPU landings.

## Политика доверия (owner lock)

- Запрещены fake ★ / «N отзывов» / sold-count без реального агрегата (см. HC.3, CV.11).
- Разрешены: реальные `Review` (approved), бейджи из **тегов / subcategory / title / landing rules**, «Хит» / «Выбор Дайбилет» только из реальных сигналов (`sessionCount`, `landingSlugs`, editors-pick).
- `Event.rating` / `reviewsCount` в Prisma **нет** - миграция **не** делается в MVP. AggregateRating на event page уже строится из `Review` при пороге - это отдельный путь, не карточка лендинга.

## Карта папок / компонентов (as-is)

| Слой | Путь | Роль |
|------|------|------|
| Route SSR | `apps/web/src/server/landing-route-page.tsx` | shell + `LandingPageView` |
| View | `apps/web/src/components/LandingPageView.client.tsx` | профили bus/dinner/river/seasonal/bridges/default |
| Bridges selling | `apps/web/src/components/landing/BridgesLandingSelling.client.tsx` | hero countdown, tips, strip |
| Bridges schedule | `apps/web/src/components/landing/BridgesScheduleSection.client.tsx` | route chips + cruise cards |
| Bridges utils | `apps/web/src/lib/bridges-session-utils.ts` | route kind, feature tags, badges |
| Bridges copy | `apps/web/src/data/bridges-landing.ts` | FAQ / meta / (legacy reviews - долг) |
| Purchase CTA | `apps/web/src/components/landing/LandingPurchaseButton.client.tsx` | widget open |
| Content CMS | `apps/web/src/components/landing/LandingContentBlocks.tsx` | TRUST_BADGES / VALUE_PROPS / … |
| Rules | `apps/backend/src/landing-rules.ts` (+ sync `dto.js` до F5) | match sessions → landing |
| Card (catalog/landing) | `apps/web/src/components/EventCard.tsx` | `landingActions` buy CTA |
| DTO | `packages/contracts/src/public.ts` → `PublicSessionDto` | `category`, `subcategories?`, `tags[]` |

**Факт:** основной список на лендингах - `LandingScheduleList` / `LandingDinnerScheduleList` / `BridgesScheduleSection`, а не grid `EventCard`. `LandingEventsGrid` почти мёртвый код - не переписывать каталог через UnifiedEventCard.

## Что уже есть (не дублировать)

- Hero trust strip (email / возврат организатора / e-вход) - HC.3.
- Клиентские date chips + sort на большинстве профилей (`LandingFilters` / dinner filters).
- Bridges: route chips (Нева / каналы), feature tags, comparison table.
- Dinner: menu + sunset/night chips.
- Empty-state partial: dinner reset; river/seasonal free alternatives при малом числе групп.
- Hit / recommend на image badges каталога из real signals.

## Бейджи без миграции (источники)

Из `PublicSessionDto` + title:

| Badge | Сигнал |
|-------|--------|
| Пешеходная | title/tags/subcategories: пешеход, пешком, walking |
| Автобусная | автобус, hop-on, city tour, обзорн |
| Групповая | групп, сборн |
| Индивидуальная | индивидуальн, private, 1-4 чел |
| Ужин / сет / фуршет | ужин, сет, фуршет |
| VIP / живая музыка / гид / открытая палуба | соответствующие keywords |
| Хит | `sessionCount >= 4` или `landingSlugs.length > 0` (как `isHitEvent`) |

Не выводить псевдо-рейтинг `resolvePseudoRating` / `estimateRating` на лендинг-карточках.

---

## Фазы CV.L1–L6

### CV.L1 - Micro-badges на карточках расписания (Критический)

- Shared helper `apps/web/src/lib/landing-card-badges.ts`.
- Показ на `LandingScheduleRow`, `LandingDinnerScheduleRow`, `EventCard` при `landingActions`.
- Убрать/скрыть fake ★ на этих поверхностях (замена на бейджи).
- Optional: горизонтальные badge-chips на **одном** лендинге (dinner) - client filter.
- TrustBlock: **не** добавлять (уже в hero).
- **Не** трогать весь каталог / UnifiedEventCard.

### CV.L2 - Date chips concert/standup (Высокий)

- У default-профиля chips уже есть; довести UX до bridges-уровня (sticky horizontal scroller, «все даты» из upcomingSlots без reload).
- Не дублировать full-page navigation.

### CV.L3 - River section tabs day/night/dinner (Высокий)

- Вынести bridges-like tabs в shared hook (`useLandingSectionTabs`) для `river` (+ link на dinner landing).
- Контент из config, не хардкод в page branch навсегда.

### CV.L4 - ContextWidget per landing type (Средний)

- Config-driven виджеты: yards / dinner / standup / museums.
- Данные в `data/landing-context/*.ts` или CMS blocks; страница только монтирует по `landing.slug` / profile.

### CV.L5 - Empty-state cross-sell (Средний)

- Общий `LandingEmptyCrossSell`: соседние CHPU + city hub + «сбросить фильтры».
- Переиспользовать thin-related / see-also.

### CV.L6 - Map start points Yandex (Низкий, later)

- После стабилизации venue logistics (CV.9).
- Yards / bridges pier map; coords из Venue, без fake pins.

---

## Явные запреты

1. **NO** rewrite всего каталога через UnifiedEventCard - только extend `EventCard` / schedule rows.
2. **NO** prisma migration для `rating`/`reviewsCount` пока нет стабильного Review aggregate на лендинг-DTO.
3. **NO** параллельный `app/[city]/[category]` вместо CHPU.
4. **NO** fake social proof в новых блоках; legacy hardcoded reviews в `LandingReviews` / bridges meta - отдельный cleanup sprint (пометить долгом).

## Порядок внедрения

1. L1 helper + schedule/EventCard badges (+ optional dinner chips) ← этот PR  
2. L2 polish date chips на standup/concerts  
3. L3 river tabs (extract from bridges)  
4. L4 context widgets config  
5. L5 empty cross-sell  
6. L6 maps  

Master template = **инкрементально** вытаскивать паттерны bridges в shared hooks/components, а не один большой rewrite.
