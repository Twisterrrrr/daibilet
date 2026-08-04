# Project — Daibilet (Next full-stack migration)

**Обновлено:** 2026-08-04  
**Ветка migration / prod:** `feat/next-monorepo`  
**Prod catalog:** Next `apps/web` `:3001` + legacy API `:4000` на МСК `201.24.125.184`  
**Web deploy canon:** **MSK-only** - build + swap/restart на `daibilet-msk` (`201.24.125.184`). SPB `.16` (Intelligent Hoopoe) **retired** из pipeline (owner удаляет VM в панели).

---

## Цель

Миграция public-сайта на **Next.js 15 App Router** в monorepo (`apps/web`) для **SEO через SSR/ISR**. Public cutover (F3) выполнен. **F4.6:** `admin.daibilet.ru` → Next only; Vite `/legacy` hard-retired.

---

## Продуктовые приоритеты (2026-07-22)

Решение владельца: **не рекламировать «пустышку»** — сначала собрать витрину, потом paid acquisition.

| Приоритет | Фокус | Статус |
|-----------|--------|--------|
| 1 | **F4 admin → Next** — перенос admin SPA в Next route group | ✅ F4.6; `/legacy` retired |
| 2 | **Landing matching quality** — правила, аудит выдачи и актуальность событий всех посадок | активный |
| 3 | **AI / статьи и city hubs** — редакционный контент и SEO-якоря | поддерживающий поток |
| — | **Finance contour / ЛК поставщиков** | ⚠️ продукт deferred; **host roles locked** → `.159` battle finance ([spb-finance-host.md](./spb-finance-host.md)) |
| — | **Реклама / paid** | ⚠️ отложена до готовности витрины (хабы + контент + базовый финконтур) |

**Allowlist городов (geo-политика 2026-07-19):**

| Правило | Действие |
|---------|----------|
| Адм. центр субъекта + saleable | `standaloneCities` + city hub (thin listing ok; приоритет ≥2–3 saleable) |
| Город области/края/республики (не центр) | `cityToRegion` → субъект; **не** считать «дырой» allowlist |
| Зарубежье (non-RF) | `foreignCities` — не standalone, не public catalog |
| Мелкие посёлки (Сортавала, Лебяжье и т.п.) | только region, не standalone |
| Набережные Челны | Татарстан → карточка Казани / блок «события области», не отдельный public city |

Источник: `data/geo/city-routing.ru.json`. Сводка исключений: [geo-excluded-cities.md](./geo-excluded-cities.md).

См. [Diary.md](./Diary.md) (2026-07-19), задачи P.* / G.* в [Tasktracker.md](./Tasktracker.md).

---

## Must-see count tiers (канон 2026-08-04, corr. capitals)

Редакционный объём `cityInfo.mustSee` / «Главные места» на city hub и в каталоге «Мой день». **Не** путать с лимитом точек в одном плане дня (ниже).

| Тир | Объём must-see | Где применять |
|-----|----------------|---------------|
| **Floor** | **6** | Все standalone hubs (минимум после batch1-7) |
| **Typical hub** | **6-8** | Обычный областной центр / региональный хаб |
| **Large tourist** | **~12-18** + filter tabs (Главные / Гастро / Музеи / Парки / Храмы - пустые скрыты) | Крупные **нестоличные** туристические города (default tier) |
| **Capitals (MSK + SPB)** | **Широкий каталог** - ориентир **30-50+**, **без жёсткого потолка 18**; качество важнее числа (slug, coords, hook, filter-классификация) | Москва и Санкт-Петербург - богатство столичного хаба |
| **NN deep pack (reference)** | Deep pack landmarks + gastro-пакет + именованные `dayRoutePresets` | Нижний Новгород - **референс** глубины и пресетов, не единственная модель и не потолок для столиц |

**Продуктовое правило: hub breadth ≠ day length.**
- Hub / фильтры могут показывать **много** must-see точек.
- Один день в `/my-day` - soft ~10 / hard ~15; остальное - несколько дней, пресеты или выборочный набор. Пользователь **не** обязан добавлять всё из хаба.

**Связь с «Мой день» (код, не путать с тирами must-see):**
- Soft guideline: `DAY_ROUTE_SOFT = 10` (warn «день уже плотный», add ещё можно)
- Hard safety: `DAY_ROUTE_MAX = 15` (localStorage / share URL / matches API)
- Min ready hint: `DAY_ROUTE_MIN = 2`

Источник констант: `apps/web/src/lib/day-route.ts`. Фильтр-табы: `apps/web/src/lib/must-see-filters.ts` (уже на hub / my-day).

### Москва и Санкт-Петербург - широкий must-see (не потолок 18)

**Факт сейчас:** оба на floor **6** (как typical), без `dayRoutePresets`. Готовых широких списков (30-50+) в repo / briefs / `.deploy-tmp` нет - seed/invent десятки venues **не** делаем до списка / OK от owner.

**Цель:** тир **Capitals** - широкий curated set (ориентир 30-50+, без жёсткого потолка 18). Filter tabs обязательны. **Не** ограничивать столицы тиром Large tourist 12-18. NN - референс deep pack + gastro + named presets, не единственная модель клонирования.

**Структура контента:**
1. Первые **6** оставить как ядро вкладки «Главные».
2. Наращивать тематическими слотами (музеи, виды/смотровые, прогулки/набережные, классические landmarks и др.), чтобы filter tabs имели смысл (не одна куча в «Главные»).
3. Гастро - **опционально отдельно** от must-see landmarks (как у NN), не обязательный Phase B; если добавлять - через gastro-классификацию фильтров, не раздувая «Главные» ресторанами.
4. `dayRoutePresets` (именованные «готовые дни» / multi-day) - **Phase 2**, после стабильного широкого списка; помогают разнести богатство хаба по дням при лимите плана 10/15.

**Prerequisites (уже есть / проверить перед content batch):**
- UX filter tabs на hub + my-day - shipped (`must-see-filters`).
- Entity slug + coords + hookFact / shortDescription для каждой новой точки (seed Venue/Location + enrich).
- Не публиковать без disk/entity; не дублировать TC twin без alias.

**Rollout:**
| Фаза | Что | Статус |
|------|-----|--------|
| **A** | Зафиксировать канон тиров + этот план в docs (corr. capitals wide) | ✅ этот документ |
| **B** | Content batch **одного** города → широкий must-see (30-50+ quality-guided) + seed/enrich | ⏳ ждём список / OK draft / confirm города |
| **C** | Второй город тем же шаблоном | ⏳ после B |

**Рекомендация порядка Phase B → C: сначала Санкт-Петербург, потом Москва.**
- У СПб уже сильнее day-route поверхность (boat wizard `isSpbDayRouteCity`, зрелые editorial slugs Эрмитаж/крепость/…).
- Шаблон фильтров + качество точек проще отладить на СПб, затем масштабировать на Москву.
- Москва - выше трафик и шире сетка; лучше копировать проверенный процесс СПб, не ужимать до 18.

Owner: подтвердить город-first и прислать/утвердить широкий список (или OK на draft wide SPB/MSK lists). Без списка / OK - только docs, без seed.

Gaps/сводка hubs: [city-hub-content-gaps.md](./city-hub-content-gaps.md).

---

## Архитектура (Path B)

```
apps/web          — Next 15: public SSR/ISR, Route Handlers, client widgets
apps/backend      — legacy API + dto.js (sync/writes, admin API)
apps/admin        — Vite SPA source (F4.6: not served; Next is admin runtime)
apps/web/app/(admin)/admin — Next admin (канон на admin.daibilet.ru + /admin)
apps/public       — Vite SPA (deprecated после F3)
packages/db       — Prisma schema + client
packages/contracts — Zod/types, catalog constants
packages/config   — shared tsconfig/eslint
```

**Read path:** `@daibilet/backend/public-read` → `public-*.dto.ts` (+ lean catalog list-item). Landing page DTO использует legacy `dto.js` как источник данных и правил. `apps/backend/src/landing-rules.ts` должен оставаться синхронен с `dto.js` до F5.

**Write/sync path:** legacy `server.js` / sync scripts; после sync — `invalidatePublicCaches({ warm: true })` + Next revalidate.

### Host roles (lock 2026-07-30 · SPB builder retired 2026-08-01)

| Server | IP | Role |
|--------|-----|------|
| Friendly Pheasant | `201.24.125.184` | **battle catalog** - public, admin, import, SEO, TC/Teplohod catalog; **единственный web build host** |
| Diligent Polydeuces | `85.193.80.159` | **battle finance** - checkout, supplier LK, orders/purchases, YooKassa |
| ~~Intelligent Hoopoe~~ | ~~`213.171.7.16`~~ | **retired** из deploy/build pipeline (owner: удалить VM в Timeweb). Не builder, не apex DNS |

### Web deploy (канон 2026-08-01)

```bash
# На MSK (ssh daibilet-msk / 201.24.125.184), в /opt/daibilet:
BRANCH=feat/next-monorepo ./deploy/scripts/deploy-prod-next.sh
```

- Скрипт сам: `git pull` → **stop** `daibilet-web` → save healthy `.next`→`.next.prev` → `pnpm web:build` (heap 5120Mi, default `EVENT_SSG_TOP_N=40`) → on fail restore `.next.prev`+start web; on ok restart api/web → nginx static/cache hygiene.
- Event SSG: build-phase public-api retries + soft TimeoutError on `/events/[slug]` (не валит весь build). Override: `EVENT_SSG_TOP_N=100` или `0` (skip event SSG). Runtime: ISR `revalidate=7200` + `unstable_cache` (tags `event-page` / `event-page:{slug}`); on-demand via `POST /api/internal/revalidate` `{ slug }` + Bearer `DAIBILET_NEXT_REVALIDATE_SECRET`.
- Destinations chrome (`getCachedDestinations`): TTL **86400** + tags `destinations` / `public-surfaces` (не капит event ISR). Bust: admin city update → `revalidateNextDestinations`, или вручную `POST /api/internal/revalidate` `{ "tags": ["destinations"] }`.
- **Не** билдить на SPB `.16` и не тащить `.next` tar с другого хоста.
- Docs-only / handoff = commit+push **без** web deploy; runtime/UI = commit+push+MSK deploy.
- SSH: `daibilet-msk` / `daibilet_msk80_key`. Finance `.159` не трогать из catalog deploy.

- Catalog ↔ finance: **только API / read projection**, без shared money/catalog DB и без ad-hoc writes finance→catalog.
- Checkout primary hostname: **`pay.daibilet.ru`** (optional alias `checkout.daibilet.ru` - см. qa.md); также `supplier.daibilet.ru`, `finance-api.daibilet.ru`.
- `.184` не переезжает на СПб; ops на catalog - perf/DTO/SSR/DNS only.
- TC/Teplohod widgets + secrets остаются на catalog; finance владеет INTERNAL_SALES / AdmissionProduct / CheckoutOrder.
- **Канон границы и gap:** [catalog-finance-projection.md](./catalog-finance-projection.md) · host roles: [spb-finance-host.md](./spb-finance-host.md) · migrate: [spb-migrate-4gb-to-8gb.md](./spb-migrate-4gb-to-8gb.md).
- P0 blocker wide internal sales: единый `PurchaseProjection` (admin + buyer + supplier LC). До него - только finance sandbox/STUB.

---

## Admin API contract (2026-07-14)

| Endpoint | Контракт |
|----------|----------|
| `GET /api/admin/dashboard` | Только `generatedAt` + `metrics` (SQL group aggregates, `launch.source=admin_event_groups_sql`) |
| `GET /api/admin/{events,venues,cities,buyers,orders,landings}` | `page/limit/q` → `{ page, pages, limit, total, rows }` |
| `GET /api/admin/events` | **SQL read-model:** group+filter+page в Postgres; hydrate только siblings текущей страницы (`metrics.readModel=sql_group_page`) |
| `GET /api/admin/landings/:slug` | Пагинация событий: `page/limit/q` + `events[]` текущей страницы |
| `GET/PATCH /api/admin/cities/:id` | Карточка `City`: title, slug (unique), SEO/intro/hero, `isDestination` |
| `POST/PATCH /api/admin/articles` | Upsert статьи; `publishedAt` задаётся оператором или `now` при publish |
| `/admin/articles/[id]/preview` | Admin-only SSR превью (тот же markdown pipeline что `/blog/[slug]`); `noindex`; Basic Auth; баннер статуса / `publishedAt` |

**Perf debt:** landings match / public catalog list всё ещё full (or cached) grouped set → filter → slice. Events list — ✅ SQL (0.5.8).

---

## Public catalog (perf rules)

- List DTO lean: без widget URL / полного `upcomingSlots`; slot preview: узкая карточка ≤4 (2×2), широкая ≤3 в ряд, формат `30 июл, 13:20`.
- Slot hydrate только для запрошенной страницы `limit`, не для всего кэша.
- **INC.504.4:** full catalog rebuild (~2.6k sessions) **не** на Next request event-loop. Web: `DAIBILET_CATALOG_REBUILD_MODE=child` + disk snapshot `var/cache/public-catalog-dto.json` (cron `*/4` flock / post-TC-sync). Request path: forever soft-SWR (есть sessions → serve stale, background only).
- Карточки `/events`: без TC/Teplohod widget markup — виджет только на странице события / landing CTA.
- City/landing SSR: ≤48 lean cards.
- Redirects: `www` → apex; `/river-cruises` → `/rechnye-progulki`.

### Location vs Venue (антидубли, 2026-08-02)

**Канон:** [catalog-location-venue-canon.md](./catalog-location-venue-canon.md).

- **Локация** - парки / набережные / памятники / улицы (must-see без institution). **Площадка** - афиша + institution.
- **Музеи и арт-галереи** всегда **Площадки** (`MUSEUM_ART_SPACE` / institution), даже только-инфо и без договора - блок хаба города.
- Театры / залы / клубы → Площадки. Договор ≠ тип сущности.
- Одна физическая точка = одна публичная карточка; локация→venue = upgrade / hide+301, не twin `PUBLISHED`.

---

## Public routes (Next)

| Route | Рендер | Примечание |
|-------|--------|------------|
| `/` | SSR dynamic | home + top cities |
| `/events` | SSR dynamic | каталог, filters GET, pagination |
| `/events/[slug]` | SSR dynamic | event hero + sticky buy card (TC/Teplohod widgets) |
| `/cities`, `/cities/[slug]` | SSR dynamic | **city hub**; default = wireframe v1 + blog teasers (P.2o); `?hub=editorial` = visual experiment (P.2i) |
| `/venues`, `/venues/[slug]` | SSR dynamic | |
| `/locations`, `/locations/[slug]` | SSR dynamic | |
| `/podborki` | ISR 3600 | каталог подборок |
| `/rechnye-progulki/...`, `/{city}/night-bridges/` | ISR/SSG | landing SEO paths |
| `/api/public/*` | Route Handlers | parity с legacy API |

### URL / SEO policy (2026-07-19, доп. 2026-07-22)

- **Flat URL:** `/events/{slug}`, `/venues/{slug}`, `/cities/{slug}` — без city-prefix в path (`/{city}/venues/...` и т.п. **отклонено**).
- **SEO-фокус:** city hubs `/cities/{slug}` + **category×city landings** (`/rechnye-progulki/moscow`, `/stendap-i-yumor/kazan`, …) + intent `/podborki/{intent}`; sitemap + canonical.
- **Meta (city listing):** обычные города - `[Категория] в [Городе] [Год] - купить билеты…`; Казань/Екатеринбург - `[Категория] в {City_Пр} [Год]: купить билеты…` (`seo-listing-meta.ts`, падежи в `city-declension.ts`).
- **Meta (city hub Казань/Екб):** `Афиша {City_Род} [Год] - куда сходить…` (`city-hub-seo.ts`).
- **Meta (event Казань/Екб):** `Билеты на {Title} в {City_Пр} - расписание, цены от {N} руб.` (+ graceful без цены) (`seo-event-meta.ts`).
- **Thin listing:** &lt; 6 офферов → `noindex,follow`; при ровно 6–7 офферах - доп. карточки смежных категорий (`LandingThinRelatedCards`).
- **Launch set:** утверждён TOP-15 category×city и intent URL. Для узких направлений действуют ограничения городов: `/progulki-po-krysham/saint-petersburg` и `/zagorodnye-ekskursii/saint-petersburg` не получают московских вариантов (city-path allowlist). Национальный `/progulki-po-krysham` может показывать смотровые/выход на крышу из других городов, если SPB roof-туров в каталоге нет. Канонический weekend intent - `/podborki/na-vyhodnye`; старый `na-vyhodnyh` отдаёт permanent redirect.
- **Контакты:** до подключения номера 8-800 публикуются email, ИНН и ОГРНИП на `/contacts` (и полные реквизиты на `/requisites`); в футере только email. Юридический адрес - на `/requisites`, без отдельного блока на contacts.
- Обычный блог - вторичен относительно SEO-листингов до насыщения ядра посадок.

---

## Codex integration (post-F3)

Cherry-pick из **`codex/phase2-foundation`**: schema, event change requests, admin contracts.  
**Не мержить** Codex Next/proxy — canonical **`apps/web`**.

См. [codex-phase2-next-handoff.md](./codex-phase2-next-handoff.md), [codex-cherry-pick-plan.md](./codex-cherry-pick-plan.md).

---

## Этапы F

| Этап | Статус | Exit criteria |
|------|--------|---------------|
| F1 Monorepo shell | ✅ | `pnpm web:build`, health route |
| F2 Public SSR | ✅ | View Source без JS, parity scripts |
| F3 Cutover | ✅ | nginx → Next prod (`:3001`) |
| F4 Admin + worker | ✅ | Next admin ops; Vite `/legacy` hard-retired |
| F5 Retire dto.js | ⏳ | parity 100%, server.js removed |

Детали: [phases/phase-f-next-fullstack.md](./phases/phase-f-next-fullstack.md), F3: [phases/phase-f3-cutover-checklist.md](./phases/phase-f3-cutover-checklist.md).

---

## Технологии и стандарты

- **Node** ≥22.13, **pnpm** 11.7 workspaces
- **Next 15**, React 19, Tailwind 3
- **Images:** `next/image` + `sharp` (WebP/AVIF), `SafeImage` wrapper, `remotePatterns` для TC/TEP/S3 CDN
- **Catalog covers:** после TC/TEP import - `scripts/ensure-catalog-covers.js`: сначала CDN/event image на Venue, иначе unique generate (`/images/{events|venues}/generated/*`). City-placeholder не считается cover. Lean venue fallback принимает https и `/images/events|venues/*`.
- **Venue logistics (CV.9):** ✅ shipped - manual CMS `metroStation` / `wayToFind` / `parkingInfo`; блок на venue page; event modal + Yandex iframe (coords) / external button; address sync-only; OSM keep на venue pages (unify deferred). Geocode auto-fill 🚫. Спека: [venue-logistics-spec.md](./venue-logistics-spec.md). Не путать с **CV.5** (скидки).
- **VenueKind location types:** `PARK` / `MONUMENT` (public `park` / `monument`) для каталога локаций / «Важные места». Park admission (платный вход, Монрепо) - **не** в MVP catalog/finance mix (см. qa.md).
- **Location↔Excursion (MVP):** явные `EventVenueRouteItem` (`RouteItemRole`, таблица `event_venue_route_items`) role=`STOP` (остановки маршрута). `Event.venueId` = только старт. На странице локации: `stopEvents`; если пусто и есть coords - geo fallback `nearbyEvents` (~300м, UI «Рядом», без merge). `Venue.hookFact` для карточек. Пермь must-see slugs: `permskaya-galereya`, `permsky-solenye-ushi`, `naberezhnaya-kamy`, `muzej-hohlovka`, `teatr-teatr`, `permskaya-esplanada`. Admin: «Подобрать рядом» (`GET …/venue-link-suggestions`) + merge apply (`POST …/venue-links:apply`). «Собери свой день» / **Мой день**: localStorage planner + commercial checklist (readiness %, status chips, ticket handoff, recommend carousel, free-window) - канон [myday-commercial-canon.md](./myday-commercial-canon.md); `/my-day` noindex + short share `/d/{code}` (`day_route_shares` → redirect `/my-day?city=&items=`; legacy `?day=`) + match API (STOP>start>nearby). Не swipe/Tinder UX.
- **City hub «Главные места»:** editorial `cityInfo.mustSee` / `sights` могут иметь `href` | `venueSlug` | `locationSlug`; title линкуется на `/venues/{slug}` или `/locations/{slug}` (без битых ссылок если entity нет). Content places (park/monument/outdoor/attraction/museum/theater) с PUBLISHED|CANDIDATE и minimal profile попадают в каталоги `/venues` и `/locations` даже без events. **Объём must-see** - канон тиров выше (floor 6 / typical 6-8 / large tourist ~12-18 non-capital / capitals MSK+SPB wide 30-50+ без потолка 18 / NN deep pack reference); hub breadth ≠ day length (soft 10 / hard 15). Москва и СПб сейчас floor 6, цель capitals wide.
- **Prisma 7** — schema/migrations; runtime read через dto port
- **Консистентность:** parity scripts; константы каталога в `@daibilet/contracts`
- **SEO:** title template `%s | Дайбилет` без дублей; `og:url` route-specific (`seo-meta.ts`); flat entity URLs + city hubs (см. URL / SEO policy выше)
- **Sitemap:** `/sitemap.xml` — index; chunks `/sitemaps/{static,events,cities,venues,landings,blog}.xml` (`lib/sitemap-data.ts`); `robots.txt` → index, Allow `/` для `*` / Googlebot / Yandex
- **IndexNow (SEO.IN1):** `INDEXNOW_KEY` (server-only) → `/indexnow-key.txt` + `/{key}.txt` (public); notify Yandex (`yandex.com/indexnow`) + `api.indexnow.org` on revalidate / article publish / deploy-warm (TOP paths only, не весь каталог)
- **Веб-аналитика:** Яндекс.Метрика только в `apps/web` (`YandexMetrika` + `next/script`, ID `NEXT_PUBLIC_YANDEX_METRIKA_ID` / default `106786540`); admin не подключаем
- **Метрики событий:** единый источник — public grouped catalog (`groupKey`), не raw imported rows

---

## Команды

```bash
pnpm install
pnpm web:dev              # :3000
pnpm web:build
pnpm typecheck
pnpm backend:test:ts
BRANCH=feat/next-monorepo ./deploy/scripts/deploy-prod-next.sh
```

Env для widgets / analytics: `NEXT_PUBLIC_TC_WIDGET_TOKEN`, `NEXT_PUBLIC_TEP_WIDGET_ID`, `NEXT_PUBLIC_YANDEX_METRIKA_ID`.
IndexNow: `INDEXNOW_KEY` (без `NEXT_PUBLIC_`).

### Orders sync (2026-07-19)

| Источник | Команда | Cron | Статус |
|----------|---------|------|--------|
| Ticketscloud | `npm run tc:orders` | `*/10` `deploy/cron/tc-orders-sync.sh` | работает (IP/token TC) |
| Teplohod | `npm run tep:orders` (заготовка) | — (cron снят с prod) | ⏸ **отложено**: у партнёра нет API заказов; не prod-path |

Модели: `ExternalOrder` / `ExternalTicket` (source `src_ticketscloud` / `src_teplohod`). Каталог TEP auto-sync **не** тянет заказы. Активный orders-sync на prod — только TC. TEP orders отложены (у партнёра нет API). См. `docs/qa.md`.

---

## Reviews (2026-07-19)

Модуль отзывов покупателей (адаптация SPBBOATS под агрегатор; **без disputes**).

### Правила

- Комбо: рейтинг 1–5 + текст; привязка к покупке (дата / событие / № заказа·билета / ФИО).
- **Верификация:** email и/или номер заказа/билета ↔ `ExternalOrder` (status done/confirmed), match события (вкл. meta-siblings / merge group). Capability **разрешает TC** (обратно SPBBOATS).
- TEP без email/orders: форма ок, бейдж «Покупка подтверждена» — нет.
- Публично: displayName `Иван К.`; полный номер билета / ФИО не светятся.
- Модерация в админке обязательна.
- Псевдорейтинг **4.5–5.0** до 10 голосов — **только UI**. JSON-LD `AggregateRating` — только при ≥10 реальных APPROVED.

### URL / API

| Что | Путь |
|-----|------|
| Форма (deep-link email) | `/reviews/write?token=…` |
| Форма из ЛК | `/reviews/write?eventSlug=…&orderRef=…&email=…` |
| Admin очередь | admin SPA `/reviews` |
| Public list | `GET /api/reviews/events/:slug` |
| Create | `POST /api/reviews` |
| Admin moderate | `POST /api/admin/reviews/:id/{approve\|reject\|hide}` |

### Email follow-up

Cron: `deploy/cron/review-requests.sh` (ежедневно 10:00; вс — `--reminders`). Команда: `npm run reviews:requests`.

SMTP (без env — graceful skip + лог URL): `SMTP_HOST`, `SMTP_FROM`, опционально `SMTP_USER`/`SMTP_PASS`/`SMTP_PORT`. Для отправки нужен `nodemailer` в `apps/backend`.

### Listing garbage audit (SEO.20)

Daily scan saleable public catalog texts (`title`/`description` + override) на CTA offsite / HTML-паразиты / CAPS / mojibake → Telegram.

- Команда: `pnpm audit:listings` (`scripts/audit-listings.js`; `--dry-run`).
- Cron: `deploy/cron/audit-listings.sh` → `0 4 * * *` (см. `deploy/cron/README.md`). Без `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` — warn + skip.
- Словарь: `apps/backend/src/listing-garbage-config.ts` (`скидк*` нет; CAPS soft ≥70% upper в title; HTML-теги только в title).

---

## Блог / контент-ops

- Карточки: `apps/web/src/data/blog-posts.ts` (+ зеркало в `apps/public`).
- Тексты: `content/blog/*.md` → `npm run blog:sync-bodies` → `blog-article-bodies.ts` (SSR fallback); прод-источник — `Article` через `npm run blog:upsert`.
- ### CPU/RAM (prod MSK ~8Gi)
- Deploy: один controlled restart на MSK (`deploy/scripts/deploy-prod-next.sh`) - не пачкой; не билдить на retired SPB.
- TEP **каталог**: предпочтительно out-of-process deploy/cron/tep-catalog-sync.sh / daibilet-tep-catalog-sync.timer; in-process TEP_AUTO_SYNC_ENABLED=0 на prod.
- TC **каталог**: nightly out-of-process `deploy/cron/tc-catalog-sync.sh` / `daibilet-tc-catalog-sync.timer` (03:20); daytime — только `tc:sync --ids`; post-sync light warm (full warm opt-in `TC_CATALOG_SYNC_FULL_WARM=1`).
- Public warm: DAIBILET_PUBLIC_STARTUP_WARM=0, warm после sync с delay.
- OOM watch: deploy/scripts/oom-watch.sh каждые 5 мин + oom-watch-alerts.log.
- Postgres prod остаётся в Docker (:5437); миграция на host — optional later, только по явному запросу.

Еженедельный дайджест новых событий: `npm run blog:weekly-digest` → `Article` status=`REVIEW` (cron вс 07:00, см. `deploy/cron/README.md`). Без auto-publish.
- План и антидубли: [content-blog-plan.md](./content-blog-plan.md).

### ИИ-колонки блога (2026-07-19)

Пять вымышленных авторов **колонок-статей** (стиль письма / register, не «голос»/подкаст) по публичным style-прототипам (не impersonation):

| authorId | Автор | Колонка |
|----------|-------|---------|
| `max` | Макс | «Изнанка маршрута» |
| `anna` | Анна | «Город крупным планом» |
| `elena` | Елена | «Спокойный маршрут» |
| `igor` | Игорь | «Место силы» |
| `artur` | Артур | «На вкус» |

Документы: [ai-journalists/README.md](./ai-journalists/README.md), реестр [ai-journalists/personas.json](./ai-journalists/personas.json).

**CMS:** у `Article` есть `authorId` / `authorName` / `articleType` (миграция `20260719140000_article_author_type`). Публичный `/blog` фильтрует по **городу** и **автору** (`?city=&author=`). Тип статьи хранится в БД для контент-плана, в UI не дублируется отдельным фильтром.

Канон приветствия Макса: **«Эй, кто на маршруте!»** (не «Касатики»).

Код CMS не обязателен до первого материала; генерация опирается на docs + JSON.

---

## Связанные документы

- [catalog-location-venue-canon.md](./catalog-location-venue-canon.md) - канон Локация vs Площадка / антидубли
- [myday-commercial-canon.md](./myday-commercial-canon.md) - канон «Мой день» (planner + commercial checklist)
- [mobile-templates.md](./mobile-templates.md) - канон мобильных шаблонов (sticky chrome, hero budget, CTA, секции)
- [ux-locations-mobile-catalog-brief.md](./ux-locations-mobile-catalog-brief.md) - research brief `/locations` + mobile city UX

- [Tasktracker.md](./Tasktracker.md) — прогресс задач
- [Diary.md](./Diary.md) — технический дневник
- [content-blog-plan.md](./content-blog-plan.md) — контент-план блога
- [ai-journalists/README.md](./ai-journalists/README.md) — ИИ-колонки / персоны
- [decision-log.md](./decision-log.md) — архитектурные решения
- [current-state.md](./current-state.md) — оперативный статус
