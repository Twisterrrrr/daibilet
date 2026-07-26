# Master-шаблон лендингов (CRO) - Night Bridges как эталон

Дата: 2026-07-26  
Ветка: `feat/next-monorepo`  
Статус: план + L1 ✅ + L4 ContextWidget thin (owner matrix)

## Цель

Унифицировать CHPU-лендинги вокруг паттернов **Night Bridges** (`bridges-night` / `LandingProfile = 'bridges'`): продающий hero, клиентские фильтры без full reload, расписание с CTA, контекстные блоки.  
**Не** изобретать параллельный роутинг `app/[city]/[category]` и **не** подменять CHPU landings.  
**Не** добавлять Prisma `Category.widgetData` / новую модель Category ради виджета - только config по landing slug.

## Политика доверия (owner lock)

- Запрещены fake ★ / «N отзывов» / sold-count / hardcoded 4.5 без реального агрегата (см. HC.3, CV.11).
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
| ContextWidget | `apps/web/src/data/landing-context-widgets.ts` + `LandingContextWidget.client.tsx` | config по slug, text-first chips |
| Micro-badges | `apps/web/src/lib/landing-card-badges.ts` | tags/subcategories → badges |
| Purchase CTA | `apps/web/src/components/landing/LandingPurchaseButton.client.tsx` | widget open |
| Content CMS | `apps/web/src/components/landing/LandingContentBlocks.tsx` | TRUST_BADGES / VALUE_PROPS / … |
| Rules | `apps/backend/src/landing-rules.ts` (+ sync `dto.js` до F5) | match sessions → landing |
| Card (catalog/landing) | `apps/web/src/components/EventCard.tsx` | `landingActions` buy CTA |
| DTO | `packages/contracts/src/public.ts` → `PublicSessionDto` | `category`, `subcategories?`, `tags[]` |
| CHPU paths | `apps/web/src/lib/landing-routes.ts` | path ↔ canonical slug |

**Факт:** основной список на лендингах - `LandingScheduleList` / `LandingDinnerScheduleList` / `BridgesScheduleSection`, а не grid `EventCard`. `LandingEventsGrid` почти мёртвый код - не переписывать каталог через UnifiedEventCard.

## Что уже есть (не дублировать)

- Hero trust strip (email / возврат организатора / e-вход) - HC.3.
- Клиентские date chips + sort на большинстве профилей (`LandingFilters` / dinner filters).
- Bridges: route chips (Нева / каналы), feature tags, comparison table.
- Dinner: menu + sunset/night chips + L1 badge chips.
- Empty-state partial: dinner reset; river/seasonal free alternatives при малом числе групп.
- Hit / recommend на image badges каталога из real signals.
- NY H1: без «сегодня, DD месяца» (`resolveLandingSeo` static seasonal) - координация с parallel agent.

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

## ContextWidget: матрица owner + JSON shape

### Маппинг CHPU (owner label → canonical slug → path)

| Owner | Canonical slug | CHPU path |
|-------|----------------|-----------|
| planetarium | `planetarium` | `/cities/saint-petersburg/planetarium` (city landing) |
| rooftops | `rooftops` | `/progulki-po-krysham` |
| zagorodnye | `country-tours` | `/zagorodnye-ekskursii` |
| vecherinki | `river-party` | `/vecherinki-na-teplohode` |
| detyam | `family-kids` | `/detyam-i-semyam` |
| novyj-god | `new-year` | `/novyj-god` |

Следующая волна (из исходного L4, ещё не в thin slice): `spb-yards`, `moscow-dinner-boat`, `standup`, `moscow-museums`.

### JSON shape (TypeScript config, не Prisma)

```ts
type LandingContextChip = {
  label: string;   // UI text-first
  match?: string;  // soft filter vs title+tags+subcategories (optional)
};

type LandingContextWidgetConfig = {
  slug: string;           // canonical landing-rules slug
  title: string;          // H2
  lead: string;           // 1-2 предложения
  chips: LandingContextChip[];
  tips: Array<{ title: string; text: string }>;
  audience?: string[];    // plain «Кому подойдёт», через ·
  // ЗАПРЕЩЕНО: rating, reviewsCount, soldCount, fake stars
};
```

Файл: `apps/web/src/data/landing-context-widgets.ts`.  
UI: `LandingContextWidget.client.tsx` - chips Clean UI (border, text, без emoji/icon row).  
Монтаж: `LandingPageView` после `#variants`, до see-also / FAQ.

Lovable `Category.widgetData` + `app/[city]/[category]` - **отклонены**: виджет привязан к CHPU landing slug.

---

## Фазы CV.L1–L6

### CV.L1 - Micro-badges на карточках расписания (Критический) ✅

- Shared helper `landing-card-badges.ts`.
- Показ на `LandingScheduleRow`, `LandingDinnerScheduleRow`, `EventCard` при `landingActions`.
- Fake ★ скрыты на этих поверхностях.
- Dinner badge chips (client filter).
- TrustBlock не дублировали (hero HC.3).

### CV.L2 - Date chips concert/standup (Высокий)

- У default-профиля chips уже есть; довести UX до bridges-уровня (sticky horizontal scroller, «все даты» из upcomingSlots без reload).

### CV.L3 - River section tabs day/night/dinner (Высокий)

- Shared hook из bridges patterns для `river` (+ link на dinner).

### CV.L4 - ContextWidget per landing type (Средний) ✅ thin owner matrix

- Config-driven; owner matrix выше.
- Follow-up: yards / dinner / standup / museums + CMS override позже.

### CV.L5 - Empty-state cross-sell (Средний)

- Общий `LandingEmptyCrossSell`: соседние CHPU + city hub + «сбросить фильтры».

### CV.L6 - Map start points Yandex (Низкий, later)

- После venue logistics (CV.9). Yards / bridges pier map.

---

## Явные запреты

1. **NO** rewrite всего каталога через UnifiedEventCard - только extend `EventCard` / schedule rows.
2. **NO** prisma migration для `rating`/`reviewsCount` / `Category.widgetData` в этом треке.
3. **NO** параллельный `app/[city]/[category]` вместо CHPU.
4. **NO** fake social proof в новых блоках; legacy `LandingReviews` - CV.L-debt.

## Порядок внедрения

1. L1 badges ✅  
2. L4 ContextWidget owner matrix ✅ thin  
3. L2 polish date chips  
4. L3 river tabs  
5. L4 follow-up (yards/dinner/standup/museums)  
6. L5 empty cross-sell  
7. L6 maps  

Master template = **инкрементально** вытаскивать паттерны bridges в shared hooks/components, а не один большой rewrite.
