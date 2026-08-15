# Project — Daibilet (Next full-stack migration)

**Обновлено:** 2026-08-14  
**Ветка migration / prod:** `feat/next-monorepo`  
**Feature branch (region hubs):** `feat/region-hubs`  
**Prod catalog:** Next `apps/web` `:3001` + legacy API `:4000` на МСК `201.24.125.184`  
**Web deploy canon:**  
1. **Предпочтительно (быстро):** GitHub Actions `Deploy MSK web` - CI `pnpm web:build` (SSH local-forward к MSK API `:4000`, `EVENT_SSG_TOP_N=0`) → artifact `.next` → atomic swap на `daibilet-msk` (`deploy/scripts/swap-web-next-artifact.sh`). Secrets: `MSK_SSH_HOST`, `MSK_SSH_USER`, `MSK_SSH_KEY`. Postgres наружу не открываем.  
2. **Fallback:** MSK in-place `BRANCH=feat/next-monorepo ./deploy/scripts/deploy-prod-next.sh` (stop → build на VPS → start).  
SPB `.16` **retired**.  

**Deploy cadence (owner 2026-08-05):** основная работа локально / preview; агенты делают **commit + push** после итерации; **web deploy на live - пачкой раз в сутки или по явному запросу owner** (не после каждого мелкого UI/контент-фикса). Исключения сразу: live 500, критичный хаб-редирект, security, launch-blocker без локальной проверки. Seed/apply в prod DB - по запросу или в том же batch. Docs-only = commit + push без deploy.

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
| 3 | **AI / статьи и city hubs** — редакционный контент и SEO-якоря; **Region Hub IA** для `type=region` ([region-hub-v1.md](./region-hub-v1.md), live tier [region-live-tier.md](./region-live-tier.md)) | поддерживающий поток |
| — | **Finance contour / ЛК поставщиков** | ⚠️ продукт staged: **Stage 0 open-date Path A** (музей/арт; launch-blocker) → **Stage 1** events/sessions → Stage 2 full LK; supplier ≠ museum-only; канон [museum-contract-readiness.md](./museum-contract-readiness.md); host roles → `.159` ([spb-finance-host.md](./spb-finance-host.md)) |
| — | **Реклама / paid** | ⚠️ отложена до готовности витрины (хабы + контент + базовый финконтур) |

### Conversion surfaces (фаза 2026-08-04)

Порядок owner: **не** параллельный redesign всего. Срезы:

0. Landing matching quality: `moscow-city-day` (День города Мск) + `salute-9-may` off-season - critical
1. `/podborki` practical hub polish
2. Tabular multilanding (river/bridges) rows + sticky filters + `?type=`
3. Blog conversion layer (chips + reading progress; schema/related уже были)
4. **Next phase (не в этом ship):** cities hub / venues monetization / `/locations` IA - см. [ux-locations-mobile-catalog-brief.md](./ux-locations-mobile-catalog-brief.md) и задачи `PH2.*` в Tasktracker

**Allowlist городов (geo-политика 2026-07-19):**

| Правило | Действие |
|---------|----------|
| Адм. центр субъекта + saleable | `standaloneCities` + city hub (thin listing ok; приоритет ≥2–3 saleable) |
| Город области/края/республики (не центр) | `cityToRegion` → субъект; **не** считать «дырой» allowlist |
| Зарубежье (non-RF) | `foreignCities` — не standalone, не public catalog |
| Мелкие посёлки (Сортавала, Лебяжье и т.п.) | только region, не standalone |
| Набережные Челны | Татарстан → карточка Казани / блок «события области», не отдельный public city |

Источник: `data/geo/city-routing.ru.json`. Центры субъектов: `data/geo/region-hubs.ru.json`. Live tier C/B/A по child-events (не ручной `tier` в JSON): [region-live-tier.md](./region-live-tier.md). Сводка исключений: [geo-excluded-cities.md](./geo-excluded-cities.md).

См. [Diary.md](./Diary.md) (2026-07-19), задачи P.* / G.* / P.2r* в [Tasktracker.md](./Tasktracker.md).

---

## Must-see count tiers (LOCKED 2026-08-07)

Редакционный объём curated `cityInfo.mustSee` / places layer на city hub («Главные места» + связанные слои) и в каталоге «Мой день». **Не** путать с лимитом точек в одном плане дня (ниже) и **не** путать с числом sync/`CANDIDATE` Venue в каталоге.

| Тир | Объём на хабе (curated) | Где применять |
|-----|-------------------------|---------------|
| **Floor** | **6** | Все standalone hubs (минимум после batch1-7) |
| **Typical hub** | **6-8** | Обычный областной центр / региональный хаб вне top-tier |
| **Other cities / top-8 start** | **~50** + filter tabs (Главные / Гастро / Музеи / Парки / Храмы - пустые скрыты) | Крупные **нестоличные** туристические города и top-8 на старте; **не** capitals-wide; дальше - посмотрим |
| **Capitals (MSK + SPB)** | **~200** точек в хабе (must-see / places layer) | Москва и Санкт-Петербург |
| **NN deep pack (reference)** | Deep pack landmarks + gastro-пакет + именованные `dayRoutePresets` | Нижний Новгород - **референс** глубины и пресетов, не модель объёма для столиц |

**LOCKED targets (owner 2026-08-07):**
- **MSK + SPB:** ~**200** точек в хабе (must-see / places layer).
- **Other cities:** ~**50** на старте (не capitals-wide); расширение позже по факту.
- **Hub count ≠ catalog sync:** число `CANDIDATE` / sync Venue в городе **не** равно объёму хаба. Хаб = curated `mustSee` (+ suburbs / nested places и т.п. по канону слоёв), не «все кандидаты из синка».

**Устаревший ориентир (снят):** large tourist **~12-18** и capitals **30-50+** - заменены lock выше.

**Продуктовое правило: hub breadth ≠ day length.**
- Hub / фильтры могут показывать **много** must-see точек.
- Один день в `/my-day` - soft ~10 / hard ~15; остальное - несколько дней, пресеты или выборочный набор. Пользователь **не** обязан добавлять всё из хаба.

**Связь с «Мой день» (код, не путать с тирами must-see):**
- Soft guideline: `DAY_ROUTE_SOFT = 10` (warn «день уже плотный», add ещё можно)
- Hard safety: `DAY_ROUTE_MAX = 35` (localStorage / share URL / matches API; named walking routes up to 35)
- Min ready hint: `DAY_ROUTE_MIN = 2`

Источник констант: `apps/web/src/lib/day-route.ts`. Фильтр-табы: `apps/web/src/lib/must-see-filters.ts` (уже на hub / my-day).

### Москва и Санкт-Петербург - capitals ~200

**Факт (2026-08-09):** Санкт-Петербург - near target (`mustSee` ~**184** + suburbs + 6 presets; gap к ~200 небольшой). Москва - deep pack: **144** mustSee (main/museum/park/science/views/street/temple/houses/mansions/secret/creative/gastro), **8** пригородов (Сергиев Посад / Истра / Коломна / Звенигород углублены: logistics + gastro + nested POI), **10** `dayRoutePresets` (`msk-1`…`msk-10`; `msk-1` → `moscow-2-dnya-…`). Новые `locationSlug` без seed/images - editorial на хабе; prod seed + `MOSCOW_IMAGES` - follow-up.

**Цель (LOCKED):** тир **Capitals** - curated hub ~**200** (must-see / places layer). Москва: gap **~142** (200−58) - наращивать curated pack, не путать с ростом `CANDIDATE` sync. Filter tabs обязательны. **Не** ограничивать столицы тиром other-cities ~50. NN - референс deep pack + gastro + named presets, не модель объёма.

**Структура контента:**
1. Первые **6** оставить как ядро вкладки «Главные» (**в городе**, без дальних загородных поездок).
2. **`significantSuburbs` - блок «Значимые пригороды {City_Род}»** на city hub **после** in-city mustSee (не в chips «Главные места»). Layout (2026-08-08): **chips имён + одна detail-панель** (без tall-card snap-carousel). My Day: **горизонтальный аккордеон** - тап по chip открывает детали. Copy: «Поездка на день рядом с городом - отдельные мини-локации и точки внутри них». Nested POI - нумерованный `<ol>`; bulk «В маршрут» на все точки активного пригорода. Для СПб: Петергоф, Царское Село, Кронштадт и др.; Калининград: коса / Зеленоградск / Светлогорск / Балтийск / Янтарный.
   - Для крупных хабов используем `places` у городской точки и пригорода: каждая вложенная точка получает отдельное действие «В маршрут». Пригороды группируются полями `travelVector` и `stationHub`, чтобы не смешивать направления поездки. `seasonLabel` отмечает только подтвержденные сезонные условия, `gastroHint` - локальную гастро-остановку.
   - **Объём nested POI (LOCKED 2026-08-09):** не жёсткие 5 на каждый пригород, а **по насыщенности** - то же правило для top cities suburbs (СПб, KGD, Perm, NN…), не только дворцы СПб. Дворец/ансамбль/насыщенный day-trip → **7–9**; компактные → **4–6**. При расширении обновлять `timingNote` у companion preset, если день стал длиннее.
3. Наращивать тематическими слотами (музеи, виды/смотровые, прогулки/набережные, классические landmarks и др.), чтобы filter tabs имели смысл (не одна куча в «Главные»).
4. Гастро - **опционально отдельно** от must-see landmarks (как у NN), не обязательный Phase B; если добавлять - через gastro-классификацию фильтров, не раздувая «Главные» ресторанами.
5. `dayRoutePresets` (именованные «готовые дни» / multi-day) - **Phase 2**, после стабильного широкого списка; помогают разнести богатство хаба по дням при лимите плана soft 10 / hard 20.

### Контент-путь: хаб → тематические гиды → билеты

Каталог saleable ещё узкий - закрывать «рассказ о городе» только афишей нельзя. Канон наращивания:

1. **City hub** - mustSee + significantSuburbs + фильтры (структура «куда сходить»). **Лайфхаки** (`#lifehacks`): карусель карточек как у «Чем уникальна» (стрелки, без табов категорий), **перед «Готовые сценарии»**. Заголовок **«Лайфхаки по {City_Дат}: как сберечь бюджет»**. Данные в `apps/web/src/lib/city-hub-lifehacks.ts` по slug. Tab «Лайфхаки» → `#lifehacks`. `#practice` / «Советы» - travel + FAQ, если есть. CTA: Яндекс/2ГИС, афиша хаба, `applyPlaceFocus` must-see. Не авиаагрегаторы и не wide catalog. **Chrome (2026-08-14):** tourist hub `bg-slate-50`; крупные H2 + серый подзаголовок; секции `py-16/20/24`; identity: lead + badge на фото (клик только scroll); must-see H2 «Что посмотреть в …», chip `visitMinutes` если есть; лайфхаки один `sky-50` + hover lift как city cards; фестивали desktop 50/50, прошедшие 2 колонки; блог: «Из блога о {предложный}» + «Все материалы».
2. **Тематические статьи-гиды** в блоге (`/blog/...`) под город/район/формат (один день в центре, дворцы, острова, с детьми…) с естественными ссылками на `/venues` `/locations` `/events` и CTA покупки, когда оффер есть.
3. **По мере роста каталога** - в тех же гидах добавлять/усиливать ссылки на билеты; без оффера гид всё равно даёт SEO и доверие.

Не ждать полного каталога, чтобы «в красках» описать город: гиды + хаб закрывают гэп раньше saleable-полноты.

**Prerequisites (уже есть / проверить перед content batch):**
- UX filter tabs на hub + my-day - shipped (`must-see-filters`).
- Блок significantSuburbs на hub - shipped (СПб seed: Петергоф / Царское / Кронштадт).
- Entity slug + coords + hookFact / shortDescription для каждой новой точки (seed Venue/Location + enrich).
- Не публиковать без disk/entity; не дублировать TC twin без alias.

**Rollout:**
| Фаза | Что | Статус |
|------|-----|--------|
| **A** | Зафиксировать канон тиров в docs | ✅ LOCKED 2026-08-07 (~200 capitals / ~50 other) |
| **B** | СПб → ~200 curated hub | 🔄 ~184 near target |
| **C** | Москва → ~200 curated hub (grow from 58) | 🔄 gap ~142 |
| **D** | Other / top-8 → ~50 на старте (не capitals-wide) | ⏳ после стабилизации MSK/SPB |

**Порядок:** СПб почти у цели; приоритет роста - **Москва → ~200**; затем top-8 / other cities → **~50** (не клонировать 200 и не оставаться на старом 12-18).
Seed / apply prod DB - по запросу owner или batch, не на каждый чих.

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

**Read path:** `@daibilet/backend/public-read` → `public-*.dto.ts` (+ lean catalog list-item). Landing match SoT: `landing-rules.ts` (dto.js только импортирует). Venue hub/page/catalog SoT: `public-venue-read.js` (dto.js re-export для legacy `server.js`).

**Write/sync path:** legacy `server.js` / sync scripts; после sync — `invalidatePublicCaches({ warm: true })` + Next revalidate.

### Host roles (lock 2026-07-30 · MSK-only catalog 2026-08-07)

| Server | IP | Role |
|--------|-----|------|
| Friendly Pheasant | `201.24.125.184` | **battle catalog** - public, admin, import, SEO, TC/Teplohod catalog; **единственный web build host** |
| Diligent Polydeuces | `85.193.80.159` | **battle finance** - checkout, supplier LK, orders/purchases, YooKassa |

~~Intelligent Hoopoe `213.171.7.16`~~ - **труп** (owner 2026-08-07): снят из deploy/docs/scripts inventory. Wipe VM в панели Timeweb = owner, если ещё биллится. Не SSH, не builder, не apex DNS.

### Web deploy (канон host 2026-08-01 · cadence 2026-08-05)

```bash
# На MSK (ssh daibilet-msk / 201.24.125.184), в /opt/daibilet:
BRANCH=feat/next-monorepo ./deploy/scripts/deploy-prod-next.sh
```

- Скрипт сам: `git pull` → **stop** `daibilet-web` → save healthy `.next`→`.next.prev` → `pnpm web:build` (heap 5120Mi, default `EVENT_SSG_TOP_N=40`) → on fail restore `.next.prev`+start web; on ok restart api/web → nginx static/cache hygiene.
- Event SSG: build-phase public-api retries + soft TimeoutError on `/events/[slug]` (не валит весь build). Override: `EVENT_SSG_TOP_N=100` или `0` (skip event SSG). Runtime: ISR `revalidate=7200` + `unstable_cache` (tags `event-page` / `event-page:{slug}`); on-demand via `POST /api/internal/revalidate` `{ slug }` + Bearer `DAIBILET_NEXT_REVALIDATE_SECRET`.
- Destinations chrome (`getCachedDestinations`): TTL **86400** + tags `destinations` / `public-surfaces` (не капит event ISR). Bust: admin city update → `revalidateNextDestinations`, или вручную `POST /api/internal/revalidate` `{ "tags": ["destinations"] }`.
- Build только на MSK (или CI → swap на MSK). Не тащить `.next` tar с чужого хоста.
- **Cadence:** основная работа локально / preview; после итерации - **commit + push**. Web deploy на live - **пачкой раз в сутки или по явному запросу owner** («выкатывай» / «деплой»). Не после каждого мелкого UI/контент-фикса (lock + 10–20 мин build на VPS). Исключения сразу: live 500, критичный хаб-редирект, security, launch-blocker без локальной проверки. Seed/apply prod DB - по запросу или в том же batch. Docs-only / handoff = commit+push **без** web deploy.
- SSH: `daibilet-msk` / `daibilet_msk80_key`. Finance `.159` не трогать из catalog deploy.

- Catalog ↔ finance: **только API / read projection**, без shared money/catalog DB и без ad-hoc writes finance→catalog.
- Checkout hostnames / paths (**LOCKED**; force-merge запрещён): **Path A** `daibilet.ru/checkout/admissions/{slug}` → result `https://daibilet.ru/checkout/result?order={publicCode}` → `…/account/purchases` (Cursor, NOW); **`publicCode`** = маскированный токен (example `KSD-8492-NX7`, crypto-safe random; не incremental DB id / UUID / ticketNumber); **Path B** scaffold `daibilet.ru/checkout/calc` (FUTURE, не museum CTA); **Codex parallel** thin buyer на `pay.daibilet.ru` (Supplier LC изолирован; draft nginx [pay.daibilet.ru.split.conf.example](../deploy/nginx/pay.daibilet.ru.split.conf.example)); hosts: `pay` / `supplier` / `finance-api` → `.159`; alias `checkout.daibilet.ru` **не** создаётся. Webhook всегда `finance-api…/yookassa/webhook`. E2e: [yookassa-e2e-sandbox.md](./checklists/yookassa-e2e-sandbox.md). CI Deploy MSK web secrets ✅ (owner 2026-08-09).
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
- **INC.504.5 / Catalog Worker:** dual Soft-SWR collapsed - canonical rebuild in `public-catalog.dto.ts`; `dto.js` adopts. **504.5c disk worker live** - канон `deploy/systemd/daibilet-catalog-dto-rebuild.*` + `deploy/cron/rebuild-public-catalog-dto.sh` (API `REBUILD_MODE=off`). **504.5d Redis deferred**; transport priority Redis > shared disk > streaming rejected; MSK Redis absent (2026-08-09) → new isolated when ready. Proposed alerts: P1 freshness 20–30m, P3 <50% last-good (until measured).
- Карточки `/events`: без TC/Teplohod widget markup — виджет только на странице события / landing CTA.
- City/landing SSR: ≤48 lean cards.
- Redirects: `www` → apex; `/river-cruises` → `/rechnye-progulki`.

### Location vs Venue (антидубли, 2026-08-02; option A LOCKED 2026-08-07)

**Канон:** [catalog-location-venue-canon.md](./catalog-location-venue-canon.md).

- **Локация** - парки / набережные / памятники / улицы / причалы / гастро-как-day-point (must-see без institution). **Площадка** - афиша + institution.
- **Музеи и арт-галереи** всегда **Площадки** (`MUSEUM_ART_SPACE` / institution), даже только-инфо и без договора - блок хаба города.
- Театры / цирки / залы / филармонии / ДК / клубы → Площадки **сразу при create/seed** (не ждать первой афиши). Договор ≠ тип сущности.
- **Дворец-музей с билетом на вход** (Юсуповский, Екатерининский, Исаакий) → Площадка, не локация. Фасад/ансамбль без входного продукта (Адмиралтейство, кремль) остаётся `ATTRACTION`.
- **URL-семейство от kind/role, не от билетов** (owner option A): museum/theater/hall без афиши → всё равно `/venues`, buy-chrome скрыт до offers/sessions. **Не** временно переносить «нет билетов» в `/locations`. Commerce = UI chrome only. Оси: `kind`→URL, `offers`→chrome, `pageStatus`→модерация.
- Редакционные гастро-точки / day-point без institution-афиши → **Локации** (`GASTRO`). Если legacy kind временно institution, при `upcomingEventsCount=0` и без admission запрещены билетные chrome, цена, CTA, афиша и FAQ (но URL family не менять из-за пустой афиши).
- Nav: **V1.1 (owner 2026-08-13, visual lock тот же день):** primary **Города • События • Места • Подборки • Блог**. «Места» = `/places` каталог в chrome площадок (eyebrow `N площадок • N локаций • N городов`, H1 фиксированный `Музеи, театры, локации, достопримечательности {City_Род}`, поиск + теги kind одной синей кнопкой, scope как текстовые ссылки у «Собрать день», сорт «По событиям»). Карточки локаций **тот же layout**, что площадки (сердечко top-right, CTA «В маршрут», без декора «Афиша»). Карточки **не** переезжают на `/places/[slug]`. Листинги `/venues` и `/locations` **301** на `/places?family=…`. Entity `/venues/[slug]` `/locations/[slug]` канон. **Поиск в разделе один** (`/places?q=`). **Мой день** - смешанный поиск (плюс события) в шапке подбора. `UX.LOC3` long rename superseded.
- Одна физическая точка = одна публичная карточка; локация→venue = upgrade / hide+301, не twin `PUBLISHED`.
- **Кластер** (Новая Голландия, Севкабель): одна родительская **локация** + дети (`parentId`). Не апгрейдить зонтик в `/venues` из-за афиши острова. Канон: [place-cluster-canon.md](./place-cluster-canon.md). Пилот schema/PDP = `CAT.PLACE-CLUSTER` (не билдить в этом проходе).

---

## Public routes (Next)

| Route | Рендер | Примечание |
|-------|--------|------------|
| `/` | SSR dynamic | home: ритм full-bleed ↔ boxed (cities gray, My Day graphite, blog magazine; editors/popular/podborki в `container-page`) |
| `/events` | SSR dynamic | каталог, filters GET, pagination |
| `/events/[slug]` | SSR/ISR | Event PDP: hero answers + badge chips + sticky mobile CTA «Выбрать билеты»; day strip; open-date stepper; price **от X**; accordion О событии / Маршрут / Как добраться; expand map; reviews |
| `/cities`, `/cities/[slug]` | SSR dynamic | **city hub**; default = wireframe v1 + blog teasers (P.2o); `?hub=editorial` = visual experiment (P.2i) |
| `/places` | ISR 300 | unified Places catalog (venues+locations); city meta; не entity URL |
| `/venues` | 301 → `/places?family=institution` | listing only |
| `/venues/[slug]` | SSR/ISR | institution PDP; канон карточек |
| `/locations` | 301 → `/places?family=location` | listing only |
| `/locations/[slug]` | SSR/ISR | location PDP; канон карточек |
| `/podborki` | ISR 3600 | каталог подборок |
| `/rechnye-progulki/...`, `/{city}/night-bridges/` | ISR/SSG | landing SEO paths |
| `/api/public/*` | Route Handlers | parity с legacy API |

### URL / SEO policy (2026-07-19, доп. 2026-07-22)

- **Header city change (2026-08-04, blog 2026-08-05):** смена города в шапке остаётся в текущей секции (`resolveCityChangeNav`): `/cities`→hub, catalogs/PDP→`?city=` той же секции, podborki intent→city segment, **blog→persist only** (лента кросс-городская; фильтр материалов на `/blog` через in-page `?city=`/`?author=`), my-day/home→persist (+confirm на my-day), multi-city landing→swap segment. **Не** дампить в `/events`, если пользователь не в каталоге событий.
- **Flat URL:** `/events/{slug}`, `/venues/{slug}`, `/cities/{slug}` — без city-prefix в path (`/{city}/venues/...` и т.п. **отклонено**).
- **SEO-фокус:** city hubs `/cities/{slug}` + **category×city landings** (`/rechnye-progulki/moscow`, `/stendap-i-yumor/kazan`, …) + intent `/podborki/{intent}`; sitemap + canonical.
- **Catalog hub canonical (owner 2026-08-14):** query на `/places` `/events` `/cities` **strip** → абсолютный хаб (`https://daibilet.ru/places` и т.д.). **Никогда** не канонизировать каталог на `/`. Sitemap listing = `/places` без `?city=`/`?family=`/`?category=` фасетов. `/podborki?city=saint-petersburg|kaliningrad` - self-canonical; moscow city query - noindex на `/podborki`.
- **Подборки city SEO (2026-08-11 финал):** active пилот **kaliningrad + saint-petersburg** (moscow Meta leftover harmless); unique Title/Desc/H1 + **self-canonical** на soft `/podborki?city={seoSlug}` (не корень сайта); Groups A/B не ломать; C MULTI + E - stable index (не мигать ≥6 при events>0); D `salute-9-may` - 200+index круглый год. `SeoOverride` + templates (2026-08-12). **Пилот-2 (план, не код):** `nizhny-novgorod` + `perm` после закрепления КГД+СПб в Вебмастере (`SEO.PODBORKI-PILOT-2`). Маркерный ЧПУ `/podborki/c/{city}` - следующий спринт. План: [seo-podborki-chpu-plan.md](./seo-podborki-chpu-plan.md).
- **Lightweight + robots (2026-08-08):** канон [web-lightweight-seo.md](./web-lightweight-seo.md) / эпик `WEB.LIGHT.*` - HTML-first ISR, progressive shell, payload budgets, no soft-404/STALE-404; поверх venue SWR + home ISR.
- **Meta (city listing):** обычные города - `[Категория] в [Городе] [Год] - купить билеты…`; Казань/Екатеринбург - `[Категория] в {City_Пр} [Год]: купить билеты…` (`seo-listing-meta.ts`, падежи в `city-declension.ts`).
- **Meta (city hub, канон P.2d):** `{City}: афиша, экскурсии и билеты на сегодня, {date}` + description «Афиша, экскурсии и билеты {City_Род}…» (`city-hub-seo.ts`). Единый шаблон для всех хабов (в т.ч. Казань/Екб).
- **Meta (event Казань/Екб):** `Билеты на {Title} в {City_Пр} - расписание, цены от {N} руб.` (+ graceful без цены) (`seo-event-meta.ts`).
- **Thin listing:** &lt; 6 офферов → `noindex,follow`, **кроме** (1) category×city с exact editorial в `seo-listing-texts` (≥1 оффер), (2) пилот KGD/SPB × MULTI/intent (`stablePilotIndex`), (3) SEO-skeleton (`salute-9-may`). При ровно 6–7 офферах - доп. карточки смежных категорий (`LandingThinRelatedCards`).
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
| F5 Retire dto.js | 🔄 | F5.3b ✅ venue-read TS path; full delete dto.js / server.js = F5.3c+ |

Детали: [phases/phase-f-next-fullstack.md](./phases/phase-f-next-fullstack.md), F3: [phases/phase-f3-cutover-checklist.md](./phases/phase-f3-cutover-checklist.md).

---

## Технологии и стандарты

- **Node** ≥22.13, **pnpm** 11.7 workspaces
- **Next 15**, React 19, Tailwind 3
- **Images:** `next/image` + `sharp` (WebP/AVIF), `SafeImage` wrapper, `remotePatterns` для TC/TEP/S3 CDN
- **Catalog covers:** после TC/TEP import - `scripts/ensure-catalog-covers.js`: сначала CDN/event image на Venue, иначе unique generate (`/images/{events|venues}/generated/*`). City-placeholder не считается cover. Lean venue fallback принимает https и `/images/events|venues/*`.
- **UI standards (sitewide minimalism; LOCKED 2026-08-10):**
  1. **One filter row on mobile** - категории / даты / теги = один горизонтальный swipe-rail (не стек selects + чипов).
  2. **No system junk** - без «Найдено N», «стр. 1 из 10», instructional copy, disabled-дублей кнопок.
  3. **Clean covers** - фото продаёт эмоцию; цена / места / даты / meta под картинкой, не 4-5 цветных pill поверх фото.
  4. **One icon pack** - тонкие монохромные line-иконки; без смеси цветных emoji в chrome UI.
- **Venue logistics (CV.9):** ✅ shipped - manual CMS `metroStation` / `wayToFind` / `parkingInfo`; блок на venue page; event modal + Yandex iframe (coords) / external button; address sync-only; OSM keep на venue pages (unify deferred). Geocode auto-fill 🚫. Спека: [venue-logistics-spec.md](./venue-logistics-spec.md). Не путать с **CV.5** (скидки).
- **VenueKind location types:** `PARK` / `MONUMENT` (public `park` / `monument`) для каталога локаций / «Важные места». Park admission (платный вход, Монрепо) - **не** в MVP catalog/finance mix (см. qa.md).
- **Location↔Excursion (MVP; LOCKED 2026-08-09):** явные `EventVenueRouteItem` role=`STOP`. `Event.venueId` = старт / primary. Логический START пресета = `index: 0` (без контент-флага). NEARBY_HUB - динамика geo «Рядом» + `family: transport`, не admin hardcode. Geo fallback только без STOP: UI «Рядом»; радиус default **300м**, city-specific в `cityInfo` (СПб **400м**, пригороды СПб **600м**). Превью карточки: один агрегат / вкладки; если одно число - `stopEventCount`. STOP fill: seed geo-match ≤**100м** на миграции → admin validate; новые экскурсии - вручную; partner `venueId` - validate без auto-match. `Venue.hookFact`. Пермь must-see: `permskaya-galereya`, `permsky-solenye-ushi`, `naberezhnaya-kamy`, `muzej-hohlovka`, `teatr-teatr`, `permskaya-esplanada`. Admin: «Подобрать рядом» + merge apply. **Мой день**: localStorage planner + commercial checklist - [myday-commercial-canon.md](./myday-commercial-canon.md); `/my-day` noindex + `/d/{code}`; match STOP>start>nearby.
- **City hub «Главные места» / editorial seed (LOCKED 2026-08-09):** публикуемая самостоятельная точка = **`catalogSlug` + `family/kind`** + Venue через **idempotent seed** (статья / preset stops / mustSee: сначала seed → UUID → link; сырой inline **запрещён**). До publish: canonical name, coords (кроме ограниченного CANDIDATE), address/локация, family/kind, lifecycle Active / Temporarily Closed / Permanently Closed. CANDIDATE без coords: черновик ok; на проде ограничен; если виден - авто-off «В маршрут» / навигации. Nested suburb POI (Петергоф/Пушкин/Кронштадт…): parent mini-destination Venue + nested Venue с `parent_venue_id`; мелочь без маршрутной ценности - текст в родителе. Editorial `mustSee`/`sights`: `href` | `venueSlug` | `locationSlug`. Content places PUBLISHED|CANDIDATE с minimal profile в `/venues`/`/locations` даже без events. **Объём хаба** - LOCKED тиры (floor 6 / typical 6-8 / other+top-8 ~**50** / capitals ~**200**); **CANDIDATE sync ≠ hub count**. СПб ~184; Москва 58 → grow ~200.
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

**CMS:** у `Article` есть `authorId` / `authorName` / `articleType` (миграция `20260719140000_article_author_type`). Публичный `/blog` фильтрует по **городу** и **автору** только через in-page `?city=&author=` (не через header CityPicker). Тип статьи хранится в БД для контент-плана, в UI не дублируется отдельным фильтром.

**Канон городов блога (2026-08-14):** статья привязывается к городам из текста, не к ярлыку «Регионы». Frontmatter: канонические slug (`moscow`, `saint-petersburg`, `ekaterinburg`, `nizhny-novgorod`, `ufa`, …). Мульти-город = `citySlug: multi` + список `citySlugs` и человекочитаемый `city:`. «Регионы» (`citySlug: regions`) только если материал genuinely без конкретных городов каталога. Фильтр и чип на `/blog` раскрывают города, не «Несколько городов» и не «Регионы» при городском контенте. Проверка: `npm run blog:check-city`.

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
