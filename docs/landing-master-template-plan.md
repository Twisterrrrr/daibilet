# Master-шаблон лендингов (CRO) - Night Bridges как эталон

Дата: 2026-07-26  
Ветка: `feat/next-monorepo`  
Статус: план + L1 ✅ + L4 ContextWidget thin + **owner block order lock** + фаза **CV.L-Hero** (первая)

## Цель

Унифицировать CHPU-лендинги вокруг паттернов **Night Bridges** (`bridges-night` / `LandingProfile = 'bridges'`): продающий hero, клиентские фильтры без full reload, расписание с CTA, контекстные блоки.  
**Не** изобретать параллельный роутинг `app/[city]/[category]` и **не** подменять CHPU landings.  
**Не** добавлять Prisma `Category.widgetData` / новую модель Category ради виджета - только config по landing slug.

## Owner-locked порядок блоков (канон)

Единый порядок секций на всех CHPU-лендингах (после полной унификации):

| # | Блок | Назначение |
|---|------|------------|
| 1 | **Hero** | H1, lead, trust strip, category-adapted atmosphere; для dated/seasonal - countdown **в днях** |
| 2 | **Советы** | Короткие практические tips (не SEO-простыня) |
| 3 | **Расписание** | Listings / schedule + фильтры |
| 4 | **Как выбрать событие** | How-to steps без fake рейтинга |
| 5 | **Частые вопросы** | FAQ |
| 6 | **На что обратить внимание** | Checklist / attention |
| 7 | **Отзывы** | Только **реальные** `Review` (approved). Иначе **скрыть** секцию |

Доп. блоки (сравнение мостов, see-also, SEO bottom, cities grid) - после канона или в profile-specific хвосте, не ломая порядок 1-7.

### H1 и «сегодня, дата»

- **Night-bridges** (`profile=bridges`): H1 с «сегодня, 26 июля» **осознанно** - страница про расписание на текущую ночь; дату оставляем.
- **Новый год / сезонные dated** (`new-year`, salute и т.п.): «сегодня, DD месяца» **запрещено** (уже SEO.NY1). Праздник ≠ календарный today.
- Countdown: у bridges - часы до разводки Дворцового (domain-specific). У NY/seasonal - **дни** до окна праздника, **не** клон palace-bridge hours.

### Hero visual reference (не full clone)

Night-bridges = референс **типографики** (`font-semibold tracking-tight`) и **атмосферы** (тёмный gradient + soft glow), не копировать:

- countdown часов до моста на все лендинги;
- fake «18 500+ билетов» / «★4.7»;
- strip графика разводки мостов.

Адаптация фона/акцента **по категории** (зима/НГ, салют, крыши, дети и т.д.).

## Политика доверия (owner lock)

- Запрещены fake ★ / «N отзывов» / sold-count / hardcoded 4.5 без реального агрегата (см. HC.3, CV.11).
- Разрешены: реальные `Review` (approved), бейджи из **тегов / subcategory / title / landing rules**, «Хит» / «Выбор Дайбилет» только из реальных сигналов (`sessionCount`, `landingSlugs`, editors-pick).
- `Event.rating` / `reviewsCount` в Prisma **нет** - миграция **не** делается в MVP. AggregateRating на event page уже строится из `Review` при пороге - это отдельный путь, не карточка лендинга.
- Секция «Отзывы» на лендинге: показывать только при наличии реальных approved reviews по лендингу/событиям; hardcoded `defaultLandingReviews` / `BRIDGES_LANDING.reviews` / `seasonal.reviews` - **debt (CV.L-debt)**, до фикса лучше hide.

## Карта папок / компонентов (as-is)

| Слой | Путь | Роль |
|------|------|------|
| Route SSR | `apps/web/src/server/landing-route-page.tsx` | shell + `LandingPageView` |
| View | `apps/web/src/components/LandingPageView.client.tsx` | профили bus/dinner/river/seasonal/bridges/default |
| Bridges selling | `apps/web/src/components/landing/BridgesLandingSelling.client.tsx` | hero countdown, tips, strip |
| Bridges schedule | `apps/web/src/components/landing/BridgesScheduleSection.client.tsx` | route chips + cruise cards |
| Bridges utils | `apps/web/src/lib/bridges-session-utils.ts` | route kind, feature tags, badges |
| Bridges copy | `apps/web/src/data/bridges-landing.ts` | FAQ / meta / (legacy reviews - долг) |
| Seasonal countdown | `apps/web/src/lib/seasonal-hero-countdown.ts` + `SeasonalHeroCountdown.client.tsx` | days countdown (NY / dated) |
| ContextWidget | `apps/web/src/data/landing-context-widgets.ts` + `LandingContextWidget.client.tsx` | config по slug, text-first chips |
| Micro-badges | `apps/web/src/lib/landing-card-badges.ts` | tags/subcategories → badges |
| Purchase CTA | `apps/web/src/components/landing/LandingPurchaseButton.client.tsx` | widget open |
| Content CMS | `apps/web/src/components/landing/LandingContentBlocks.tsx` | TRUST_BADGES / VALUE_PROPS / … |
| Rules | `apps/backend/src/landing-rules.ts` (+ sync `dto.js` до F5) | match sessions → landing |
| Card (catalog/landing) | `apps/web/src/components/EventCard.tsx` | `landingActions` buy CTA |
| DTO | `packages/contracts/src/public.ts` → `PublicSessionDto` | `category`, `subcategories?`, `tags[]` |
| CHPU paths | `apps/web/src/lib/landing-routes.ts` | path ↔ canonical slug |
| GPT briefs | `docs/landing-content-gpt-briefs.md` | готовые промпты на контент-дыры |

**Факт:** основной список на лендингах - `LandingScheduleList` / `LandingDinnerScheduleList` / `BridgesScheduleSection`, а не grid `EventCard`. `LandingEventsGrid` почти мёртвый код - не переписывать каталог через UnifiedEventCard.

## Gap: профили vs канон 1-7

| Профиль | Типичные slug | 1 Hero | 2 Советы | 3 Расписание | 4 Как выбрать | 5 FAQ | 6 Attention | 7 Отзывы |
|---------|---------------|--------|----------|--------------|---------------|-------|-------------|----------|
| **bridges** | `bridges-night` | ✅ atmosphere + **часы** countdown | ⚠️ после strip разводки (порядок нарушен) | ✅ | ✅ | ✅ | ✅ `BridgesShipChecklist` | ⚠️ **fake** hardcoded |
| **seasonal** | `new-year`, salute | ⚠️ / ✅ NY: atmosphere + **дни**; salute: свой gradient | ⚠️ city tips / intro, не единый блок | ✅ | ❌ нет `LandingHowToChoose` | ✅ | ❌ | ⚠️ **fake** из `seasonal-landings` |
| **default** | planetarium, rooftops, country-tours, river-party, family-kids, … | ⚠️ flat `gradient-hero-lovable` | ⚠️ tips внутри ContextWidget (после schedule) | ✅ | ✅ | ✅ generic/partial | ❌ | ⚠️ **fake** generic |
| **dinner** | moscow-dinner-boat | ⚠️ lovable | ⚠️ intro, не tips-блок | ✅ | ❌ | ✅ | ❌ | ⚠️ **fake** |
| **bus** | bus-tours + city | ⚠️ lovable | ⚠️ city guide tips | ✅ | ❌ | ✅ | ❌ | ⚠️ **fake** |
| **river** | river-cruises + city | ⚠️ lovable | ⚠️ city guide tips | ✅ | ❌ | ✅ | ❌ | ⚠️ **fake** |

Легенда: ✅ ок · ⚠️ частично / не тот порядок / fake · ❌ отсутствует.

### Ключевые slug (owner matrix) - краткий gap контента

| Slug | Tips | How-to | FAQ | Checklist | Reviews real | Hero atmosphere |
|------|------|--------|-----|-----------|--------------|-----------------|
| bridges-night (ref) | ✅ | ✅ river-ish | ✅ | ✅ | ❌ fake | ✅ эталон |
| new-year | ⚠️ ContextWidget tips | ❌ | ✅ thin | ❌ | ❌ fake | ✅ CV.L-Hero thin (дни) |
| planetarium | ⚠️ CW tips | ❌ dedicated | ⚠️ generic default | ❌ | ❌ | ❌ |
| rooftops | ⚠️ CW tips | ❌ | ⚠️ generic | ❌ | ❌ | ❌ |
| country-tours | ⚠️ CW tips | ❌ | ⚠️ generic | ❌ | ❌ | ❌ |
| river-party | ⚠️ CW tips | ✅ default how-to | ⚠️ party FAQ partial | ❌ | ❌ | ❌ |
| family-kids | ⚠️ CW tips | ✅ | ✅ kids FAQ | ❌ | ❌ | ❌ |

Промпты на закрытие дыр: [`docs/landing-content-gpt-briefs.md`](./landing-content-gpt-briefs.md).

## Что уже есть (не дублировать)

- Hero trust strip (email / возврат организатора / e-вход) - HC.3.
- Клиентские date chips + sort на большинстве профилей (`LandingFilters` / dinner filters).
- Bridges: route chips (Нева / каналы), feature tags, comparison table.
- Dinner: menu + sunset/night chips + L1 badge chips.
- Empty-state partial: dinner reset; river/seasonal free alternatives при малом числе групп.
- Hit / recommend на image badges каталога из real signals.
- NY H1: без «сегодня, DD месяца» (`resolveLandingSeo` static seasonal) - SEO.NY1 ✅.
- Bridges hero price min-max: parallel/agent `BR.PR1` (`ae3c86c`) - **не пересекаться** в CV.L-Hero с правками stats bridges.

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
Монтаж (as-is): после `#variants`. **Цель канона:** tips/советы **до** расписания; ContextWidget chips можно оставить у schedule как фильтр-помощник.

---

## Фазы (порядок после owner lock)

### CV.L-Hero - Hero-first unification (Критический) 🔄 thin

1. Shared typography + atmosphere tokens (inspired by night-bridges, per-category variants).
2. Seasonal / New Year: countdown **в днях** до праздничного окна (не hours-to-bridge).
3. Не трогать bridges price-range / soldEstimate stats, пока `BR.PR1` / parallel agent открыт или только что смержен.
4. Follow-up: atmosphere для default matrix (planetarium, rooftops, …) без клона countdown.

### CV.L-Order - Reorder sections to owner 1-7 (Высокий) ⏳

- Tips before schedule; How-to на seasonal/bus/river/dinner; Checklist shared; Reviews hide-until-real.

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

### CV.L-debt - Fake reviews / social proof (Средний)

- ✅ UI hide: `LandingReviews` → null; bridges hero без sold/4.7 (только рейсы + диапазон цен).
- ⏳ Wire real approved `Review` rows when data exists; delete dead `BRIDGES_LANDING.reviews` / seasonal hardcoded copy later.

---

## Явные запреты

1. **NO** rewrite всего каталога через UnifiedEventCard - только extend `EventCard` / schedule rows.
2. **NO** prisma migration для `rating`/`reviewsCount` / `Category.widgetData` в этом треке.
3. **NO** параллельный `app/[city]/[category]` вместо CHPU.
4. **NO** fake social proof в новых блоках; legacy `LandingReviews` - CV.L-debt.
5. **NO** клон palace-bridge hour-countdown на NY/seasonal/прочие категории.

## Порядок внедрения (owner)

1. **CV.L-Hero** (typography/atmosphere + days countdown seasonal) ✅ all profiles  
2. CV.L-Order (reorder 1-7)  
3. Content briefs → paste (`landing-content-gpt-briefs.md`)  
4. L2 date chips polish  
5. L3 river tabs  
6. L4 follow-up  
7. L5 empty (частично ✅)  
8. L6 maps  
9. CV.L-debt reviews hide/real - hide ✅; real Review wire ⏳  

Master template = **инкрементально** вытаскивать паттерны bridges в shared hooks/components, а не один большой rewrite.
