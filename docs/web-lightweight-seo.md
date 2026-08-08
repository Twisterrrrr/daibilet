# Web: lightweight HTML + robots (architecture plan)

**Статус:** канон для Cursor/Codex после UI/bug batch (owner 2026-08-08)  
**Ветка:** `feat/next-monorepo`  
**Эпик Tasktracker:** `WEB.LIGHT.*`  
**Связанные:** `PERF.WM*`, `SEO.SOFT404`, `INC.CITY404`, `INC.504.*`, `UX.VENUES-MORE.*`, `PERF.V1` / `PERF.E*`

Цель: сайт **максимально легковесный для человека** и **предсказуемый для роботов** (Yandex/Google): быстрый first HTML, стабильные HTTP-коды, crawlable links, без soft-404 и без тяжёлого JS в critical path.

---

## 0. Уже сделано (не дублировать)

| Что | Evidence / commit | Эффект |
|-----|-------------------|--------|
| Home `/` ISR снова HIT | `5b15d6a1` PERF.WM1; smoke TTFB ~0.16с, total ~0.33с (было ~2-3с при `no-store`) | TTFB/cache для робота и nginx |
| Blog `[slug]` cached fetch | `5b15d6a1` PERF.WM2 (код; live follow-up если ещё `no-store`) | убрать dynamic из статьи |
| Soft-404 → HTTP 404 | `df694617` / `61bb52dd` SEO.SOFT404; root/detail `loading.tsx` сняты | роботы видят настоящий 404 |
| City hub STALE 404 poison | `afadaa2e` INC.CITY404; `noStore()` только перед `notFound()`; nginx purge на swap | Pack C hubs 200 |
| Venue DTO miss не кэшируется как 404 | `b0d3e290` / `36105314` | нет year-long STALE 404 на PDP |
| Venue hub forever soft-SWR + lean SQL | `b7c39325`; cold API ~21с → warm ~0.18с | sitewide hang после cold miss |
| Progressive `/venues` shell → event counts | `19443909`, `18afa783`, `d6336346` | SSR не ждёт distinct counts; enrich client |
| `/locations` catalog без карты | `8a3c02c5` | меньше Leaflet на листинге |
| Suburbs: chips вместо snap-carousel | `54c22b33` | меньше client scroll/JS на city hub / my-day |
| Catalog sessions disk snapshot + child rebuild | INC.504.4; `public-catalog-dto.json` | rebuild не на Next request loop |
| Event PDP `hydrateSlots:false` + ISR 7200 | PERF.E3 / `78358860` destinations 86400 | cold event TTFB ~0.12-0.17с |
| API miss city/venue/event → 404 JSON | `fdef70e4` INC.LINK | web miss → 404, не 500 |

**Правило:** новые задачи `WEB.LIGHT.*` начинаются **поверх** этого слоя. Не переписывать SWR/shell без измерения регрессии.

---

## 1. Что тянет длинный хвост сегодня (ranked)

Ранг = влияние на «ощущение открытия страницы» + на Webmaster / crawl budget. Цифры - из Diary/live curl 2026-08-07…08.

### R1. Cold API hub rebuild (venue/location/destinations)

- **Симптом:** после API restart / cache empty первый запрос ~**8-21с** (`/api/public/venues?family=location&limit=24` ~21с; destinations cold ~8с; warm ~0.18с). Owner: «всё висит».
- **Механика:** distinct product counts + chunked SQL; до SWR rebuild блокировал request path.
- **Хвост после SWR:** cold first miss всё ещё дорогой; disk snapshot для **venue hub** ещё follow-up (есть только у sessions catalog).
- **Страницы:** `/venues`, `/locations`, косвенно city hub / home destinations.

### R2. Огромный HTML payload (особенно `/`)

- **Симптом:** `/` HTML ~**730KB** uncompressed (2026-08-07). При `no-store` total download ~1.8-3.1с при TTFB ~0.2с. После ISR HIT total ~0.33с, **размер HTML не ушёл** (PERF.WM4 ⏳).
- **Механика:** home SSR тянет destinations + catalog sessions + landings + blog + hero frames в один RSC tree; много client islands сериализуют props в HTML/RSC flight.
- **Хвост для роботов:** даже при HIT gzip помогает, но parse/index cost и «долгий ответ» при cold/MISS остаются.

### R3. Client JS на critical path (maps, carousels, catalog views)

| Поверхность | Тяжёлое | Примечание |
|-------------|---------|------------|
| `/` | `HomeHero`, stories, city-aware, category stack, scroll rails | много `'use client'` на first viewport |
| `/cities/[slug]` | почти весь hub = `CityPageView*.client` | HTML есть, но hydrate heavy |
| `/venues`, `/locations` | `*CatalogView.client` | shell+enrich OK; infinite/loadMore + filters = JS |
| `/my-day` | `DayRoutePanel` + **Leaflet** (`DayRouteOsmMap`) | карта не нужна для SEO first HTML |
| Venue/Event PDP | `OsmMapEmbed` / expand map | ok ниже fold, но не в LCP path |
| `/cities` catalog | `RussiaMap` → Leaflet | карта РФ - deferred candidate |
| Было: suburbs snap-carousel | снято `54c22b33` | не возвращать |

Исторический CSR bailout (`BAILOUT_TO_CLIENT_SIDE_RENDERING` из `useSearchParams` в layout) - уже чинили (PERF.FCP1); регресс запрещён.

### R4. Шрифты + изображения

- **Fonts:** 3 семейства (`Inter` 4 веса, `Manrope` 3, `Source Serif 4` 3) через `next/font` + cyrillic - self-host OK, но **суммарный CSS/woff critical** на каждой странице.
- **Images:** hero rotator, city night hero, blog covers, venue thumbs. `priority` сейчас на hero frames; риск LCP contention если несколько `priority` + большой srcset.
- **CDN fingerprints** на home: soft-timeout 800ms (не блокирует навечно, но добавляет work в RSC).

### R5. Blocking data waterfalls / soft-timeout storms

- Паттерн: `withSoftTimeout` + retry. Полезен против hang, но при cold API даёт **4с+2.5с** пустого ожидания до empty shell (`/locations` total ~9с при TTFB ~0.2с - Diary 2026-08-08).
- Venue PDP: finance admission parallel с soft 2.5с - правильно; не поднимать timeout.
- City hub: secondary articles 3с timeout - OK; primary DTO miss → `noStore`+404.
- Home: hero banners Prisma **в web-процессе** (INC.504.15) - latent event-loop risk.

### R6. Cache poison / soft-404 / ISR STALE

- Класс бага: transient miss → Full Route Cache / nginx `proxy_cache` держит **404 STALE ~1y** (`stale-while-revalidate`) при живом API (Samara / Pack C, venue DTO).
- Soft-404 HTTP 200 (loading.tsx streaming) - закрыт; **не возвращать** root/detail `loading.tsx` над `notFound()`.
- `noStore()` **до** успешного retry на catalog → `private, no-store` навсегда (фиксили в `b7c39325` / VenueListPage).

### R7. Прочее (ниже приоритет, но копит хвост)

- Dual catalog SWR (`dto.js` + `public-catalog.dto.ts`) INC.504.5.
- Blog list/article ещё могут тянуть лишний related/DTO.
- Sitemap chunks `force-dynamic` + revalidate 3600 - ок, но freshness vs IndexNow при массовых seed.
- Widget iframes (TC / Teplohod) - только по клику / ниже fold; **никогда** auto-load в SSR critical.

---

## 2. Target architecture: lightweight + crawlers

### 2.1 Рендер-модель

```
Robots / first paint
  └─ HTML-first SSR/ISR (Full Route Cache + Data Cache + nginx HIT)
       ├─ stable HTTP 200 для реальных страниц
       ├─ real HTTP 404 для missing (noStore перед notFound; не кэшировать miss)
       └─ canonical + robots meta + JsonLd в первом HTML

Humans (progressive enhancement)
  └─ Shell HTML (cards, titles, links, prices-if-cheap)
       ├─ hydrate minimal islands (nav, city picker, filters)
       ├─ defer: maps, event-counts enrich, widgets, carousels
       └─ never block TTFB on enrich / finance / fingerprints
```

**Канон статусов:**

| Случай | HTTP | Cache |
|--------|------|-------|
| Сущность есть | 200 | ISR `s-maxage` + tags; nginx HIT OK |
| Сущности нет (уверенно) | 404 | `noStore()`; **не** Full Route Cache |
| Transient API fail при известной сущности | 200 soft-empty / retry / STALE предыдущего 200 | **не** писать 404 |
| Thin listing (&lt;6) | 200 + `noindex,follow` | как сейчас |

### 2.2 Progressive enhancement по типам страниц

| Page type | SSR shell (must) | Defer / client |
|-----------|------------------|----------------|
| Home `/` | H1/brand, top cities links, key landings, 1 hero frame | rotator, stories, city-aware refetch, fingerprints |
| City hub | title, FAQ/seo text, must-see **links**, category links | editorial chrome, suburbs detail, maps |
| `/venues` `/locations` | first N cards + pagination links/button | event counts enrich, type facets refresh, map |
| Event/Venue PDP | title, price-from, schedule summary, internal links | Leaflet map, widget iframe, reviews widget |
| Blog | title, body HTML, cover, in-article links | share widgets, related carousels |
| My Day | text shell + stop list links | Leaflet, commercial enrich, progressive catalog |

### 2.3 Payload budgets (uncompressed HTML / first-load JS)

Цели для **warm HIT** (gzip отдельно; измерять `curl` size + Lighthouse/WebPageTest).

| Page type | HTML budget | First-load JS (route+shared) | LCP |
|-----------|-------------|------------------------------|-----|
| Home `/` | **≤350 KB** (сейчас ~730 → −50%+) | ≤180 KB gzip JS critical | ≤2.5с mobile 4G |
| City hub | ≤250 KB | ≤150 KB | ≤2.5с |
| Venues/Locations list | ≤180 KB (24 cards lean) | ≤120 KB (без Leaflet) | ≤2.5с |
| Event/Venue PDP | ≤200 KB | ≤150 KB до expand-map | ≤2.5с |
| Blog article | ≤220 KB (+images separate) | ≤100 KB | ≤2.5с |
| Landing category×city | ≤200 KB | ≤120 KB | ≤2.5с |

**Lean card DTO (list):** id, slug, title, city, type, thumb URL, priceFrom?, eventsCount? (nullable/pending). Без widget URL, full description, slots[], raw sessions.

### 2.4 Image policy

1. **Один** `priority` / `fetchPriority=high` на страницу = LCP candidate (hero). Остальное `loading=lazy`.
2. Явные `width`/`height` или fixed aspect - CLS=0.
3. Thumbs list: max edge **≤480** (srcset), WebP/AVIF where pipeline allows.
4. Blog: cover + 1-2 inline уже обязательны; не дублировать cover в body (`filterDuplicateImageBlocks`).
5. Не тянуть CDN HEAD fingerprints в critical path (home: уже soft-timeout; цель - cache fingerprint map offline / build).

### 2.5 Robots checklist

- [ ] Все деньги SEO (hubs, landings, PDP, blog PUBLISHED) отдают **полный HTML со ссылками** `<a href>` - не только client router after JS.
- [ ] `sitemap.xml` chunks обновляются ≤1ч после publish; IndexNow на важных URL (revalidate path живой).
- [ ] Нет soft-404; нет STALE 404 poison (purge nginx на swap; never cache null DTO).
- [ ] `canonical` + `robots` согласованы с `evaluate*Indexability`.
- [ ] Thin / HIDDEN / DRAFT: `noindex` или 404 по политике CMS (не 200 «не найдена» без статуса).
- [ ] Internal links из footer/hubs только на живые slug (INC.LINK.5 data cleanup).

### 2.6 NEVER в critical path (SSR await до first byte)

1. Full catalog rebuild / distinct counts на весь hub.
2. Leaflet / Yandex Maps / RussiaMap.
3. Vendor widgets (TC, Teplohod Fancybox).
4. Finance admission beyond soft budget (уже 2.5с → empty).
5. Unbounded retry loops; `noStore()` до финального empty.
6. Prisma hero / heavy DB в web request без cache (вынести в API + `unstable_cache`).
7. `connection()` / live `Date` / `searchParams` без изоляции (ломает ISR).
8. Root `loading.tsx` над сегментами с `notFound()`.
9. Wide catalog CTA / autoplay media / multi-priority images.
10. Force-dynamic на публичных SEO URL без причины.

---

## 3. Phased checklist (Cursor / Codex)

### Phase A - Quick wins (1-3 дня кода + batch deploy)

| ID | Задача | Owner acceptance |
|----|--------|------------------|
| WEB.LIGHT.A1 | Lean home DTO: обрезать sessions/landings/blog props до list-card; цель HTML `/` **≤350KB** raw | `curl` size + View Source: города/линки на месте; TTFB warm ≤0.25с HIT |
| WEB.LIGHT.A2 | Home: один hero frame в SSR, rotator только client after idle | LCP image = 1; residual frames не в RSC payload |
| WEB.LIGHT.A3 | Font subset: убрать неиспользуемые weights или отложить Source Serif только на city editorial | `-` ≥1 woff с critical chain; CLS без FOIT (display=swap уже есть) |
| WEB.LIGHT.A4 | Audit `priority=` / `fetchPriority` - ровно один LCP | Lighthouse: один high-priority image |
| WEB.LIGHT.A5 | Confirm live blog `[slug]` `s-maxage` HIT (PERF.WM2 follow-up) | curl headers HIT; не `private, no-store` |
| WEB.LIGHT.A6 | Guardrail test: запрет root/detail `loading.tsx` + запрет cache null DTO | CI test зелёный (расширить `seo-http-404-loading.test.ts`) |
| WEB.LIGHT.A7 | Post-deploy: nginx purge + warm hubs уже в swap; добавить `/venues` `/locations` shell warm | cold after deploy не 9-20с для бота |

### Phase B - Medium (неделя)

| ID | Задача | Owner acceptance |
|----|--------|------------------|
| WEB.LIGHT.B1 | **Disk snapshot / forever-SWR для venue hub** (как catalog sessions) | API restart: first `/venues` shell ≤2с serve stale-or-snapshot; rebuild background |
| WEB.LIGHT.B2 | City hub: SSR editorial text + link grids; тяжёлый `CityPageView` split / dynamic import below fold | HTML содержит must-see `<a>`; JS chunk map/carousel deferred |
| WEB.LIGHT.B3 | Dynamic `import()` Leaflet только по клику «Показать карту» (PDP, my-day, RussiaMap) | Network: leaflet*.js отсутствует до gesture |
| WEB.LIGHT.B4 | Home hero banners: только через cached API, не Prisma в web process | INC.504.15 progress; no Prisma in `getActiveHeroBanners` request path |
| WEB.LIGHT.B5 | Payload telemetry: log `content-length` + `x-nextjs-cache` в health/smoke | Dashboard/smoke diff в PR |
| WEB.LIGHT.B6 | Dead hub cards → 404 data cleanup (INC.LINK.5) | crawl sample 0× hub→404 на must-see |

### Phase C - Later (после стабилизации TTFB/HTML)

| ID | Задача | Owner acceptance |
|----|--------|------------------|
| WEB.LIGHT.C1 | RSC flight slim: меньше client boundaries на home/city (server components для static grids) | JS first-load budget table §2.3 |
| WEB.LIGHT.C2 | Merge dual catalog SWR (INC.504.5) | один SoT; меньше RAM/CPU |
| WEB.LIGHT.C3 | Partial Prerender / streaming без soft-404 регресса | TTFB↓ без HTTP 200 на missing |
| WEB.LIGHT.C4 | Image CDN pipeline: AVIF/WebP + size presets для thumbs | LCP −20% на mobile |
| WEB.LIGHT.C5 | Crawl budget report: sitemap vs indexable vs soft-404 weekly | Yandex Webmaster: время ответа + исключения ↓ |

---

## 4. Measurement canon (как доказывать)

```bash
# TTFB + cache (MSK / public)
curl -sI -o NUL -w "ttfb=%{time_starttransfer} total=%{time_total} size=%{size_download}\n" \
  https://daibilet.ru/
# Смотреть: Cache-Control s-maxage, x-nextjs-cache HIT|STALE, X-Cache-Status

# HTML weight (raw)
curl -sL https://daibilet.ru/ | wc -c

# Robots status
curl -sI https://daibilet.ru/cities/no-such-slug-zzz   # expect 404
curl -sI https://daibilet.ru/cities/moscow             # expect 200
```

Критерии «готово к batch deploy»: budgets §2.3 на 2-3 URL каждого типа; нет `private, no-store` на SEO URL при успешном payload; нет STALE 404 на Pack C hubs.

---

## 5. Mapping to existing epics

| Existing | Relation |
|----------|----------|
| PERF.WM4 lean home HTML | = WEB.LIGHT.A1/A2 |
| PERF.WM2 blog ISR live | = WEB.LIGHT.A5 |
| INC.504.4/5 catalog SWR | foundation; B1 venue hub snapshot; C2 merge |
| SEO.SOFT404 / INC.CITY404 | foundation; A6 guardrails |
| UX.VENUES-MORE / progressive shell | foundation; не ломать shell+enrich |
| INC.LINK.5 dead cards | = WEB.LIGHT.B6 |
| INC.504.15 Prisma in web | = WEB.LIGHT.B4 |

---

## 6. Out of scope (явно)

- Finance `.159`, YooKassa secrets, supplier LC.
- Wide catalog CTA.
- VM upsizing как «решение» HTML 730KB (owner: не срочно при load &lt;1).
- Force-push / secrets в git.
- Web deploy после **docs-only**; runtime - batch / по запросу owner.
