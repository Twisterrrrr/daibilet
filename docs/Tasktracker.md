# Tasktracker — Daibilet

**Обновлено:** 2026-07-24
**Источники:** [Project.md](./Project.md), [current-state.md](./current-state.md), [widget-etalon-slugs.md](./widget-etalon-slugs.md), [content-blog-plan.md](./content-blog-plan.md)

**Легенда:** ✅ done · 🔄 in progress · ⏳ todo · 🚫 blocked · ⚠️ deferred

---

## Hero UX (2026-07-24)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| H.1 | Shared `HeroLayout` + `HeroMedia` (LCP priority) | Критический | ✅ |
| H.2 | Home imageOverlay/rotator + Prisma `HeroBanner` + admin toggle | Критический | ✅ `72ea839` prod migrate+deploy |
| H.3 | `/cities` split + RF map hover + top tiles ISR 1h | Высокий | ✅ |
| H.3b | `/cities` top tiles + «Популярные города»: max-w-5xl + items-stretch (как podborki) | Критический | ✅ `d1ccd8a` prod |
| H.3c | `/cities`+/`podborki`: H1 и row на одной оси `HeroLayout` max-w-5xl; blog featured = container width | Критический | ✅ |
| H.3d | `/cities` imageOverlay photo hero + search (как venues); tiles/map ниже на max-w-5xl | Критический | ✅ `8ec241c` prod @`067763d` |
| H.3e | `/cities` hub mini-tags (top landings) + ISR 86400 | Критический | ✅ `44887fb` |
| H.4 | `/podborki` featured+trending equal-height, centered `max-w-5xl` | Высокий | ✅ `533d40a` prod @`d1ccd8a` |
| H.4b | `/podborki` tag soup → `LandingCategory` + carousels (by-type/for-whom/seasonal) | Критический | ✅ `30e87fe`+`44887fb` |
| H.5 | `/venues` dark imageOverlay + search | Средний | ✅ MVP |
| H.5b | `/events` imageOverlay photo hero + search/city/date (как venues) | Критический | ✅ `47430af` prod |
| H.6 | `/locations` photo hero (imageOverlay) как venues; map не в hero | Критический | ✅ `47430af` prod |
| H.7 | Video loop asset для home | Низкий | ⏳ нет ассета - rotator images |
| H.8 | Blog Featured Hero + interactive list H1 + «Свежее»×3 + min price | Высокий | ✅ `b45995c` prod @`c39d124` |
| H.8b | `/blog` featured+«Свежее»: max-w-5xl composition + square thumbs | Критический | ✅ `90f6151` prod @`d1ccd8a` |
| H.8c | `/blog` list hero → imageOverlay + search/chips внутри (уровень venues) | Критический | ✅ `8ec241c` prod @`067763d` |
| H.8d | `/blog` city rank (header) + cursor pagination + article canonical | Критический | ✅ `44887fb` |
| H.8e | `/blog` client: base64url Buffer crash → btoa/atob cursor | Критический | ✅ `c716a4e` prod |
| H.8f | `/blog` afisha promo: цена/события/chips по geo; full-width после 3 статей фида | Критический | 🔄 |
| H.8f-fix | Blog afisha promo: split server `resolveBlogSidebarPromoMap` (pg out of client) | Критический | ✅ `d47c300` prod |
| H.9 | Ultrawide heroes: min-h + face-safe object-position (home+catalog HeroMedia) | Критический | ✅ `2004e4b` prod @`d47c300` |

---

## Catalog perf (2026-07-24)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| P.V1 | `/venues`+`/locations`: lean Prisma `_count` вместо session hydrate для плиток | Высокий | ✅ `9af3910` |
| P.V1b | Regression: lean hub дропнул event-image cover fallbacks → пустые карточки `/venues` | Критический | 🔄 fix in flight |
| P.V2 | Suspense + pulse skeletons на фильтрах (city/type), без full-page loader | Высокий | ✅ `9af3910` |
| P.V3 | `Venue @@index([title])` + migrate `20260724030000_venue_title_search_index` | Средний | ✅ `9af3910` (migrate on deploy) |
| PERF.1 | Prisma singleton `globalThis` + shared pg Pool (`@daibilet/db`) | Критический | ✅ `6ce435a` |
| PERF.2 | Lean catalog DTOs + `unstable_cache` 600s для podborki/venues/locations (Redis follow-up) | Высокий | ✅ partial; landings rule-match sessions ещё в DTO |
| PERF.3 | Header search: pg_trgm + synonyms (Meilisearch P2) | Высокий | ✅ `125feab` |
| PERF.4 | Meilisearch / full-text service | Средний | ⚠️ P2 deferred |
| PERF.5 | Unify legacy `createDb` Pool with Prisma shared Pool | Средний | ⏳ |
| H.6b | `/locations` pin map: flat `{id,lat,lng}` + map-tip API | Высокий | ⚠️ API оставлен; UI → `RussiaMap` до реальной карты |

---

## Инциденты prod (2026-07-19)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| I.1 | Пустые главная + `/events`: stats 500 (`destination.name` on null) → empty home cascade | Критический | ✅ hotfix `dto.js` + restart API/web |
| I.2 | Web follow-up: SiteLayout Suspense fallback + CatalogShell SSR keep (rebuild) | Высокий | ⏳ в worktree `daibilet-push` |
| I.3 | Telegram OG: WebpageBot видит, чаты нет; площадки без title/desc | Критический | 🔄 nginx→social-preview + venue twitter ✅ `1c81cdf`; **блокер: AAAA всё ещё в DNS** |
| I.4 | Infinite full-page reload (`/blog`+): ChunkLoadRecovery матчил hydration #418 по chunk filename | Критический | ✅ `85b8cfe` + deploy-prod-next |
| I.5 | Chunk 400 / `cities/%5Bslug%5D`: mid-build overwrite `.next` + static via Node proxy | Критический | ✅ `ee8daad` + deploy-prod-next |
| UI.1 | Единый нейтральный strip шапок: `/events`, `/blog`, city hub, `/podborki` (+ intents) | Высокий | ✅ `fc5e309` prod @`db34d03` |

---

## Продуктовый фокус (2026-07-22) — SEO-листинги приоритетнее блога

**Сдвиг приоритета:** обычные статьи блога вторичны; фокус на **ЧПУ SEO-листингах** category×city (+ intent `/podborki/...`).

## Решение владельца (2026-07-23)

- Крупный поток **F4 admin → Next** - **in progress** (kickoff 2026-07-23).
- Текущий launch-фокус параллельно - качество landing matching и актуальность событий во всех посадках.
- Finance contour / ЛК поставщиков отложен: продукт ещё не готов. Изменения Codex finance не трогаем.

| # | Задача | Приоритет | Статус | Ownership |
|---|--------|-----------|--------|-----------|
| SEO.1 | Формулы Title/Description category×city (`seo-listing-meta.ts`) | Критический | ✅ | агент |
| SEO.2 | On-page SEO тексты TOP seed (~18 шт., 1000–1200) под сеткой | Критический | ✅ | агент (seed); владелец - утверждение/правки |
| SEO.3 | Thin pages: `noindex,follow` если &lt; 6 офферов; sitemap filter | Критический | ✅ | агент |
| SEO.4 | MULTI_CITY: standup / family-kids / concerts / active-sport + SPB/MSK/Kazan | Высокий | ✅ | агент |
| SEO.5 | Intent ЧПУ `/podborki/{intent}` (+ city) + preset links | Высокий | ✅ | агент |
| SEO.6 | `/contacts` + footer/sitemap trust | Высокий | ✅ | агент |
| SEO.7 | Event trust strip | Средний | ✅ | агент |
| SEO.8 | TOP-15 launch set: водные, стендап, экскурсии, культура, intent; «крыши» только СПб | Высокий | ✅ 2026-07-23 | владелец утвердил, агент внедрил |
| SEO.8a | Editorial polish текстов TOP-15, в первую очередь новые `walking-tours`, `country-tours`, `exhibitions`, `unusual-theatres`, `excursions`, `rooftops` | Высокий | 🔄 seed готов, нужна редакторская вычитка | владелец + агент |
| SEO.8b | `country-tours`: требовать экскурсионный и направленческий сигналы, исключить культурные события по топонимам | Высокий | ✅ 2026-07-23 | runtime `dto.js` синхронизирован, prod deploy + smoke: 3 экскурсии, без оперы и концертов |
| SEO.8c | Аудит всех landing rules: исключить мусорные попадания, сверить сэмплы и runtime `dto.js` | Критический | 🔄 2026-07-23 | rules audit в работе; `rooftops`, `new-year`, `bus-tours` требуют deploy/smoke |
| SEO.9 | Реальные отзывы / телефон 8-800 на контактах | Средний | ⏳ номер pending; ИНН/ОГРНИП только `/contacts` (+ `/requisites`), ОГРНИП с новой строки; адрес скрыт с contacts, полный на `/requisites`; футер без реквизитов; телефон не публикуем | **владелец** (номер) / агент (trust UI ✅) |
| SEO.11 | Порог индекса SEO-листингов | Критический | ✅ `MIN_LISTING_OFFERS_FOR_INDEX = 6` (не поднимать: Екб/Казань thin) | агент |
| SEO.12 | Внутренняя перелинковка: футер «Популярные направления», event breadcrumbs → CHPU, «Смотрите также» на листингах | Высокий | ✅ 2026-07-23 | агент |
| SEO.13 | SSR JSON-LD: BreadcrumbList (listing+event) + ItemList только на CHPU landings (non-empty) | Высокий | ✅ 2026-07-23 | агент |
| SEO.14 | `/podborki` tag cloud → CHPU landings/intent вместо `/events?q=` | Высокий | ✅ 2026-07-23 (топ-24: 23 CHPU / 1 fallback) | агент |
| SEO.15 | Казань/Екб: падежи + meta-шаблоны listing/hub/event + thin cards (6–7) | Критический | ✅ 2026-07-23 | агент |
| SEO.16 | Ручной переобход TOP-15 в Яндекс.Вебмастер / GSC | Высокий | ⏳ список URL готов; клики только владелец | **владелец** |
| SEO.17 | Sitemap: intents без thin (&lt; 6); smoke prod index + landings/static | Высокий | ✅ 2026-07-23 @`0fe5140`+prod | агент |
| SEO.18 | План 20-30 путеводителей → CHPU (`docs/seo-guide-articles-plan.md`) | Высокий | ✅ 2026-07-23 batch #1 = 10 Казань/Екб | агент |
| SEO.19 | Batch #1 генерация/размещение 10 гидов (GPT → MD → blog) | Высокий | ⏳ пачка A+МСК/СПб owner rewrite ✅; хаос-календарь ✅ 2026-07-23; B (2-7,9) ждёт тексты | владелец + агент |
| SEO.19a | Blog mid-article плашка `[NOTE]` (`BlogArticleNote`) | Высокий | ✅ 2026-07-23; hotfix nested `[link](url)` in text= | агент |
| SEO.19f | Blog markdown SEO: links/H2/NOTE harden + price accents + tests | Критический | ✅ `4f6cdb3` prod | агент |
| SEO.19b | Batch A: уникальные cover вместо city-placeholder (3 jpg) | Высокий | ✅ 2026-07-23 | агент |
| SEO.19b2 | МСК/СПб: уникальные cover ×6 + magazine `/blog` hero | Высокий | ✅ 2026-07-23 | агент |
| SEO.19b3 | Правило: cover обязателен до PUBLISHED; догенерация missing (bylinnyy ×2) | Критический | ✅ 2026-07-23 | агент |
| SEO.19c | Публикация гидов: хаос-график + микс городов; `publishedAt` schedule filter | Высокий | ✅ 2026-07-23; антиспам-пересбор вечер | агент |
| SEO.19d | Owner anti-AI rewrite 9 гидов + upsert по графику | Высокий | ✅ 2026-07-23 | владелец + агент |
| SEO.19e | Антиспам: пн-колонки + template_type long/top5/events + safety индекс | Высокий | ✅ 2026-07-23 вечер (календарь + docs + upsert) | агент |
| SEO.10 | Editorial polish SEO-текстов (убрать шаблонный хвост) | Средний | ⏳ | владелец + агент |
| P.1 | AI / статьи блога | Средний | ⚠️ deferred vs SEO.1–SEO.7 | — |

---

## Продуктовый фокус (2026-07-19)

Стратегия: не рекламировать «пустышку» — сначала витрина (хабы + контент + базовый финконтур).

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| P.1 | **AI / статьи** — контент, ИИ-колонки, blog ops | Критический | 🔄 |
| P.2 | **City hubs** — усиление `/cities/{slug}` (SEO + контент) | Критический | 🔄 |
| P.2a | Brief-описания 14 адмцентров в `CITY_INFO` (hero/SEO) | Высокий | ✅ 2026-07-19 |
| P.2b | Brief ещё 9 адмцентров (Чита…Хабаровск) в `CITY_INFO` | Высокий | ✅ 2026-07-19 |
| P.2c | Предложный падеж хабов: «в Мурманске», не «в городе Мурманск» | Высокий | ✅ 2026-07-19 |
| P.2d | SEO title city hubs: «{City}: афиша… на сегодня, {date}» (именительный) | Высокий | ✅ `2079e3a` prod proof SPB |
| P.2e | **Wireframe city hub v1** — IA/UX фазы 1 (sticky tabs, афиша выше, FAQ accordion) | Высокий | ✅ [city-hub-wireframe-v1.md](./city-hub-wireframe-v1.md) |
| P.2f | Реализация wireframe v1 в `apps/web` (`CityPageView`) | Высокий | ✅ `d877813` prod |
| P.2f1 | City hub chips: счётчики = выдача (не full-city); лёгкие чипы без «Популярных тегов» | Высокий | ✅ `721bf10` prod |
| P.2g | **Wireframe city hub v2** — IA фазы 2 (city-specific направления, конфиг) | Высокий | ✅ [city-hub-wireframe-v2.md](./city-hub-wireframe-v2.md) |
| P.2h | Реализация wireframe v2 в `apps/web` (плитки направлений, top-N venues, sights CTA) | Высокий | ⏳ после P.2g / внахлёст с P.2f |
| P.2i | **Editorial hub template** (Lovable moodboard) — параллельный visual `?hub=editorial` | Средний | ✅ `6efe0d8` prod |
| P.2j | City hub affiche: убрать «Популярные теги»; компактные date/category chips | Высокий | ✅ `5aa84d3` prod |
| P.2k | City hub affiche UX: скрыть подзаголовок счётчика; date+category в одну строку (desktop); убрать «Стоит внимания» (дубль афиши) | Высокий | ✅ `2808ed5` prod proof murmansk |
| P.2l | Адрес UI: «Проспект Кольский» → «Кольский проспект» (нормализатор прилагательных + hub venues) | Средний | ✅ `8d65740` prod + DB |
| P.2m | City hub chips: визуальный gap между группами date и category (`gap-x-4`) | Средний | ✅ `9a36f48` prod |
| P.2n | City hub `#directions`: не рендерить landings/categories с count=0 (без пустых «Мероприятия»/«Развлечения») | Высокий | ✅ `044e441` prod proof rostov-na-donu |
| P.2o | **City hub × blog phase 1** — editorial тизеры (about/affiche/sights/practice/more), sticky 5 tabs | Высокий | ✅ `bb65e4a`; picker harden `2d6bd7f` |
| P.2p | **City hub × blog phase 2** — mini-row до 3 сессий на тизере (keyword match по уже загруженным sessions) | Высокий | ✅ `824bafc` |
| P.2q | **City hub × blog phase 3** — CMS `Article.citySlug`, фильтр API по городу, picker CMS-first | Высокий | ✅ 2026-07-22 |
| L.1 | Catalog API: public Cache-Control + Next `getCachedCatalog`; favorites `?ids=`; landing skip no-store; page sizes 50/100 | Критический | ✅ `bb65e4a` prod; nginx proxy_cache+limit_req ✅ |
| L.2 | Images: `next/image` + WebP/AVIF (`SafeImage`), remotePatterns TC/TEP/S3, sharp, hot-path cards/heroes | Высокий | ✅ `9646968` prod proof AVIF `/_next/image` |
| L.3 | TC catalog sync load: nightly timer + flock/nice/ionice; `--ids` ProviderLink filter; RawImport payloadHash skip; light warm | Критический | ✅ `efc8459` prod; timer next 03:20 UTC |
| P.3 | **Finance contour / ЛК поставщиков** — базовый контур | Высокий | ⏳ |
| P.4 | **Реклама / paid acquisition** — до готовности витрины | — | ⚠️ deferred |
| P.5 | **Allowlist городов** — адмцентры с saleable → standalone; остальные → cityToRegion (не «дыра») | Высокий | ✅ 2026-07-19 geo policy |

---

## Geo / destinations (2026-07-19)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| G.1 | Fix `isPublicRegionName` для «Республика …» (префикс, без `\b`) | Критический | ✅ |
| G.2 | Челны → Республика Татарстан под карточкой Казани | Критический | ✅ |
| G.3 | Expand standaloneCities адмцентрами с saleable | Высокий | ✅ |
| G.4 | Expand cityToRegion для не-адмцентров (Тольятти, Сортавала, …) | Высокий | ✅ |
| G.5 | Docs + prod deploy geo | Критический | ✅ `6f0fcf7` prod |
| G.6 | Хвост allowlist 63 → cityToRegion; зарубежье (`foreignCities`: Батуми, Осака) | Высокий | ✅ `a63d612` prod (HEAD `c312095`) |

См. [Project.md](./Project.md) § allowlist, [geo-excluded-cities.md](./geo-excluded-cities.md), Diary 2026-07-19.

---

## CI (2026-07-19)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| CI.1 | `validate-build-test`: pnpm до `setup-node` cache | Критический | ✅ `4c09cdb` |
| CI.2 | Backend typecheck: exactOptional / indexed access | Критический | ✅ `7cc58ac` |
| CI.3 | `web:build` без Postgres: empty home fallback | Критический | ✅ `0f45004` CI green |

---

## Sync / TC (2026-07-19)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| S.1 | `tc:sync --ids=...` on-demand upsert (+ `--dry-run`) | Высокий | ✅ `6cc137d` prod |
| S.2 | Admin `POST /api/v1/tc/sync?ids=` | Средний | ✅ `6cc137d` |
| S.3 | Docs + prod smoke 2 ids | Высокий | ✅ +2 ESL |

---

## Event page / UX (2026-07-19)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| E.1 | Description: списки `✅` / `•` / `-` → `<ul><li>` + sanitize | Высокий | ✅ 2026-07-19 @38e8d12 prod proof seks-v-sssr |
| E.2 | Unit-тесты обоих кейсов (checkmark + организационные детали) | Высокий | ✅ |
| E.3 | Prod: `ReferenceError: cleanDisplayText is not defined` (re-export без local import в `event-page-utils`) | Критический | ✅ 7cdd4cf + rebuild 38e8d12 |
| E.4 | Теги на event page: dedupe chips (tags∪subcategories) по нормализованному label | Высокий | ✅ 2026-07-19 @9658b9f prod proof kino |
| E.5 | Event page display time = TZ региона события (как виджет), не forced MSK | Критический | ✅ 2026-07-19 @9f1f744 prod proof Уфа 18:00 |
| E.6 | Hero CTA показывает только минимальную цену `от`; buy-card сохраняет диапазон точных категорий | Высокий | ✅ 2026-07-23 |

---

## Блог / контент (2026-07-19)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| B.1 | Формат «Редакция» (`docs/ai-journalists/00-editorial.md`) | Высокий | ✅ |
| B.2 | Rewrite 4 гидов + SEO/ссылки/`[buy]` | Высокий | ✅ |
| B.3 | Hide `spb-razvod-mostov-kakoi-reis` + 301 → rooftop | Средний | ✅ → **отменено** (статья снова PUBLISHED) |
| B.4 | Commit → deploy-prod-next → `blog:upsert` ×4+hide | Критический | ✅ |
| B.5 | Пакет 10 редакционных статей (verbatim + buy + upsert) | Критический | ✅ |
| B.6 | Вернуть `spb-razvod-mostov-kakoi-reis` PUBLISHED, снять 301 | Высокий | ✅ |
| B.7 | Multi-event: убрать `[buy]`, только `/events` ссылки; цены/meta по prod; Cyrillic READY slug | Критический | ✅ |
| B.8 | Первая колонка Анны «Город крупным планом»: `muzyka-v-osobnyakah-spb` | Критический | ✅ |
| B.9 | Admin: PATCH городов (City SEO/slug/title) + UI | Высокий | ✅ 2026-07-19 |
| B.10 | Admin: дата публикации статей (`publishedAt`) в UI | Высокий | ✅ 2026-07-19 |
| B.11 | Soft-links блога: каталог → лендинги (jazz/standup/river/bus) | Высокий | ✅ 2026-07-19 upsert+revalidate |
| B.12 | Вернуть фото в статьи: distinct `-inline.jpg` + coverImageUrl + upsert/deploy | Критический | ✅ 2026-07-19 |
| B.13 | Home SEO: title без цифр + description шаблон с живыми counts хабов | Высокий | ✅ 2026-07-19 @789ee67 |
| B.14 | Blog: defer первого `[image]` после 2 абзацев (не сразу под hero) | Высокий | ✅ 2026-07-19 @8ba0a05 |
| B.15 | TC: past dated slug → не «открытая дата» / не «Мероприятие прошло»; meta-siblings | Критический | ✅ e9d72f1 + blog slug refresh |
| B.16 | Home: Teplohod signed S3 covers expire → stabilize to api.teplohod.info proxy | Критический | ✅ 2026-07-19 hotfix prod |
| B.17 | Регрессионные unit-тесты B.15+B.16 (image URL + fake open-date / meta purchase) | Высокий | ✅ 2026-07-19 |
| B.18 | Колонка Артура «На вкус»: `kazan-na-vkus-master-klassy` (МК Эчпочмака + гастроужин) | Критический | ✅ 2026-07-22 @93d3a07 + upsert |
| B.19 | Колонка Елены: `spb-s-rebenkom-v-dozhd` (СПб с ребёнком в дождь) | Критический | ✅ 2026-07-22 upsert + revalidate |
| B.20 | `/blog` magazine layout: listing asymmetric + article journal (serif/dropcap/quotes/sidebar) | Высокий | ✅ `a4ecab6` |
| B.21 | Blog typography: откат Source Serif → site `font-display`; убрать dropcap | Критический | ✅ `230ebc2` (prod includes via `6656adf`+) |
| B.22 | `/blog` large card: cover 2:1 (не flex-fill) + excerpt ~6 строк из lead | Высокий | ✅ `0be544f` (prod via `fc5e309`) |
| B.23 | Blog prose: markdown links/H2 anchors/NOTE/prices + visual accents | Критический | ✅ `4f6cdb3` prod | агент |
| B.24 | `/blog` view toggle: magazine-сетка \| список + localStorage/`?view=` | Высокий | ✅ `0741106` prod via `ed874cb` | агент |
| B.24b | Blog cards: убрать cover badges (tag/city на фото) | Высокий | ✅ `b542a45` (+ merge B.24) | агент |
| B.25 | Авторы колонок: brand blue (`text-primary-600`), без бейджа «Колонка» | Высокий | ✅ `ed874cb` prod | агент |
| B.26 | `/blog` UX: темы, поиск, «Показать ещё», CTA CHPU, дата на large | Высокий | ✅ `bd8ec37` prod | агент |
| B.27 | Blog Hero: `Article.isFeatured`, informational hero + admin toggle, LCP priority | Критический | ✅ `72ea839` prod (via d34fd28+) | агент |
| B.28 | Blog Featured Hero: CTA-плитка с promo image под «Свежее» (убрать пустоту) | Критический | ✅ `72ea839` prod | агент |
| B.28b | Afisha promo: цена/тайтлы/chips по header geo; полоса под 3 первыми статьями фида | Критический | 🔄 | агент |

---

## UX каталога (2026-07-19)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| U.9 | Чипы категорий: уникальные пиктограммы (не fallback ticket) | Высокий | ✅ `95d959d` prod |
| U.1 | Расширенные фильтры `/events` — popup как поиск (desktop modal + mobile bottom sheet) | Высокий | ✅ |
| U.2 | Draft Apply/Reset, Esc/backdrop, focus trap, badge счётчика | Высокий | ✅ |
| U.3 | Commit + deploy Next | Критический | ✅ `be8ee55` + prod start web (после обрыва SSH mid-deploy) |
| U.4 | Город из шапки → `city=` каталога при `/events` без явного city; deep-link сохранить | Высокий | ✅ |
| U.5 | Commit + deploy-prod-next U.4 | Критический | ✅ `4772789` prod |
| U.6 | Город шапки → фильтр `/venues` и `/locations` (URL + storage + nav) | Высокий | ✅ (в `361dc4c`) |
| U.7 | Anti-flash «Все города»→город на `/events` (и venues/locations): `cityReady` + layout sync | Высокий | ✅ |
| U.8 | Anti-flash: не показывать SSR all-cities до inject; commit + deploy-prod-next U.6–U.8 | Критический | ✅ `4c09cdb` prod |
| U.10 | Catalog cards: eye-line `object-position` (16:9 headshots Pianissimo) | Высокий | ✅ `539f571` prod |

---

## Reviews (2026-07-19)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| R.1 | Prisma: Review ↔ ExternalOrder + migration | Критический | ✅ |
| R.2 | API create/list + admin moderate | Критический | ✅ |
| R.3 | Admin UI `/reviews` очередь | Высокий | ✅ |
| R.4 | Public ReviewSection + `/reviews/write` + ЛК deep-link | Высокий | ✅ |
| R.5 | Cron review-request email (SMTP graceful) | Высокий | ✅ |
| R.6 | Capability: TC allowed + verification | Критический | ✅ |
| R.7 | Pseudo 4.5–5.0 UI; AggregateRating ≥10 | Высокий | ✅ |
| R.8 | Tests verification + displayed rating | Высокий | ✅ |
| R.9 | Commit + deploy API/admin/Next | Критический | 🔄 commit `1c2b156` pushed; deploy SSH с этой машины — Permission denied (нужен ключ на prod) |
| R.10 | Disputes / supplier LK | — | 🚫 out of scope |
| R.11 | ЛК: past slug 404 → sibling URL + review by eventId; время сеанса подписано; дата покупки без truncate | Критический | ✅ 085617c deploy |

---

## Этап 0 — Post-cutover hardening (закрыть первым)

**Цель:** prod Next стабилен, покупка через виджеты проверена в браузере, admin операционен, data debt по TC осознан.

**Exit criteria:** все пункты «Browser smoke» и «Admin smoke» ✅; по `tc:sync` — ✅ run **или** ⚠️ defer с записью в decision-log.

### 0.1 Cutover & infra

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 0.1.1 | Prod nginx → Next `:3001` | Критический | ✅ |
| 0.1.2 | Rollback script / snapshot | Критический | ✅ |
| 0.1.3 | `launch-prod-smoke-next.sh` (SSR curl) green | Критический | ✅ |
| 0.1.4 | Мониторинг 24–48ч post-cutover | Высокий | ✅ |
| 0.1.5 | Deprecate Vite public (`apps/public`) | Средний | ⏳ после закрытия 0.2–0.3 |

### 0.2 Browser smoke — 4 эталонных slug

Список: [widget-etalon-slugs.md](./widget-etalon-slugs.md).  
API-пререквизит: `npm run check:widgets -- --base https://daibilet.ru`

| # | Slug | TC / TEP | API check | Browser «Купить» | Статус |
|---|------|----------|-----------|------------------|--------|
| 0.2.1 | `tc-6a266b49465e94f72b4ef8f6-interaktivnaya-vystavka-nyuton-park` | TC | ✅ 2026-07-13 | ✅ 2026-07-22 | ✅ |
| 0.2.2 | `tc-6a3582f0bbd948da83dece6e-kombo-kvest` | TC | ✅ 2026-07-13 | ✅ 2026-07-22 | ✅ |
| 0.2.3 | `progulka-ot-prichala-kitai-gorod-do-prichala-kievskii-826` | TEP | ✅ 2026-07-13 | ✅ 2026-07-22 | ✅ |
| 0.2.4 | `centralnaya-krugovaya-rechnaya-progulka-ot-parka-zaryade-ves-centr-za-chas-683` | TEP | ✅ 2026-07-13 | ✅ 2026-07-22 | ✅ |

**Чеклист на каждый slug (browser):**

- [x] Hard refresh `/events/{slug}`
- [x] Hero / buy card: цена и CTA видны
- [x] Клик «Купить» → TC modal **или** Teplohod widget
- [x] DevTools console: нет blocking errors
- [x] (опц.) тестовая покупка → ExternalOrder в admin

Закрыто 2026-07-22: ручное подтверждение (prod виджеты работают; API `check:widgets` был ✅ с 2026-07-13). Тестовая покупка → ExternalOrder подтверждена отдельно.

### 0.3 Admin smoke (`:4000` + static admin)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 0.3.1 | Login (basic auth / realm) | Критический | ✅ 2026-07-22 |
| 0.3.2 | Dashboard metrics загружаются | Высокий | ✅ 2026-07-14 aligned with Events (`admin_event_groups`) |
| 0.3.3 | Sources: TC + Teplohod, last sync | Критический | ✅ 2026-07-22 |
| 0.3.4 | Events: list + detail + override save | Высокий | ✅ full catalog + override lean texts; UI на русском; group readiness future-sibling |
| 0.3.5 | Orders: список реальных заказов (не mock) | Критический | ✅ TC live + cron */10; TEP orders **отложено** (партнёр: нет API, 2026-07-19) |
| 0.3.5a | TEP orders: получить токен + schema у Теплохода, smoke import | Критический | ⏸ отложено — у партнёра нет API заказов; cron tep-orders снят с prod |
| 0.3.6 | Event moderation / publish gate | Средний | ✅ group readiness + admin smoke 2026-07-22 |
| 0.3.7 | Зафиксировать результат в Diary / smoke log | Средний | ✅ 2026-07-22 |

**Admin smoke закрыт 2026-07-22** (ручное подтверждение: login, sources, events, orders, виджет→ExternalOrder). TEP orders остаётся ⏸.

### 0.4 `tc:sync` widgetUrl backfill (prod)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 0.4.1 | Оценить долг: `check:sync-invariants` на prod | Высокий | ⏳ |
| 0.4.2 | **Вариант A:** `npm run tc:sync` на prod (token, maintenance window) | Средний | ✅ 2026-07-13 (~101s, 17082 widgetUrl) |
| 0.4.3 | **Вариант B:** defer + [decision-log.md](./decision-log.md) (критерии: saleable events OK) | Средний | ✅ 2026-07-13 (до sync) |
| 0.4.4 | Post-sync: `check:widgets` + 0.2 browser smoke повтор | Высокий | ✅ API 2026-07-13 + browser 2026-07-22 |

### 0.5 Ops / auth fixes (post-cutover)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 0.5.home-editors | «Выбор редакции»: дедуп combo-family (макс. 1 «Комбо» на venue), секцию оставить | Высокий | ✅ 2026-07-19 |

### 0.7 Admin grouped readiness (NO_FUTURE_SESSIONS)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 0.7.1 | Backend finalizeGroupedAdminReadiness после group | Высокий | ✅ 2026-07-19 |
| 0.7.2 | Admin UI mirror EventsPage | Высокий | ✅ 2026-07-19 |
| 0.7.3 | Unit-тест admin-group-readiness + test:ts | Средний | ✅ 2026-07-19 |
| 0.7.4 | Deploy API (+ admin static) prod | Высокий | ✅ 2026-07-19 bb7fc9c |

### 0.8 Admin audit holes (2026-07-19)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 0.8.1 | Убрать hard limit 10000 admin catalog | Критический | ✅ уже `eventRows(db, null)` |
| 0.8.2 | Dashboard needsAttention ≡ Events | Критический | ✅ `admin_event_groups` |
| 0.8.3 | GET events/:id → event+override | Высокий | ✅ |
| 0.8.4 | Lean source description (left 4000) | Высокий | ✅ |
| 0.8.5 | canPublish ← high readinessIssues | Высокий | ✅ |
| 0.8.6 | Nav stubs / read-only badges / no localhost:5178 | Высокий | ✅ |
| 0.8.7 | Orders archive: проверить правила (не unarchive) | Средний | ✅ documented (stale cancelled 30d) |
| 0.8.8 | ECR остаётся скрыт в prod | Средний | ✅ |
| 0.8.9 | Deploy API + admin static prod | Высокий | ✅ 2026-07-19 `7882d6d` |

### 0.6 CPU/RAM mitigation (prod 3.8Gi)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 0.6.1 | Stop legacy Docker + staging на prod (без rm -v) | Критический | ✅ 2026-07-19 |
| 0.6.2 | systemd MemoryMax/High + NODE_OPTIONS web/api | Высокий | ✅ 2026-07-19 |
| 0.6.3 | TEP sync cadence + warm delay + nice | Высокий | ✅ 2026-07-19 |
| 0.6.4 | watch-tep-sync-load + oom-watch cron | Средний | ✅ 2026-07-19; oom-watch */5 + alerts |
| 0.6.5 | Замер нагрузки на следующем auto-sync окне | Средний | ⏳ скрипт готов / at optional |
| 0.6.6 | cron +x (tc-orders Permission denied) | Критический | ✅ 2026-07-19 |
| 0.6.7 | TEP out-of-process cron/systemd + DISABLE in-process | Высокий | ✅ 2026-07-19 |
| 0.6.8 | Skip startup TEP sync if fresh + delay 45m | Высокий | ✅ 2026-07-19 |
| 0.6.9 | Убрать двойной public warm (startup off) | Высокий | ✅ 2026-07-19 |
| 0.6.10 | Deploy discipline (один restart) | Средний | ✅ 2026-07-19 docs+script |
| 0.6.11 | PG host migrate / dockerd idle | Низкий | ⏳ documented only — не мигрировать без запроса |

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 0.5.1 | `USER_JWT_SECRET` prod/staging | Критический | ✅ |
| 0.5.2 | Teplohod widget bootstrap / related cards | Высокий | ✅ |
| 0.5.3 | EventCard title + «Подробнее» links | Высокий | ✅ |
| 0.5.4 | Catalog city filter instant apply | Средний | ✅ |
| 0.5.5 | Мультисобытие `mergeGroupKey` + HP script | Средний | 🔄 код готов, deploy ⏳ |
| 0.5.6 | Admin lists pagination / lean payloads (orders, buyers, events, venues) | Критический | ✅ 2026-07-13 deploy prod |
| 0.5.7 | Admin cities/landings page envelopes + landing detail events pager + compact dashboard | Критический | ✅ 2026-07-14 |
| 0.5.8 | Быстрые переключения админки: SWR catalog + landings base-cache + sources SWR | Высокий | ✅ 2026-07-14 |
| 0.5.8 | Events/landings SQL read-model (no full grouped catalog before slice) | Высокий | ✅ Events+dashboard SQL 2026-07-19; landings/public — ⏳ |
| 0.5.9 | Catalog quick wins: lean DTO, no widgets in list, hydrate page-only, unified metrics, www/SEO redirects, SSR trim, warmup | Критический | ✅ 2026-07-14 |
| 0.5.10 | Teplohod checkout fallback → account.teplohod.info (не teplohod.info/event 404) | Высокий | ✅ 2026-07-14 |
| 0.5.11 | Post-deploy: clear `.next/cache` + revalidate; ChunkLoadError → one reload | Высокий | ✅ 2026-07-14 |
| 0.5.12 | Teplohod: restore TI_Tickets bootstrap on event page + landing `evt_tep_*` buy | Критический | ✅ 2026-07-18 deploy |
| 0.5.13 | Яндекс.Метрика на `apps/web` (ID 106786540, не admin) | Высокий | ✅ код 2026-07-19; deploy ⏳ |

---

## Этап 1 — Public parity & SEO gaps

**Цель:** Next public ≈ legacy по UX/SEO на event/city; глобальный поиск в header.

### 1.1 Header & navigation

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 1.1.1 | Port `HeaderSearch` → `apps/web` SiteHeader | Высокий | ✅ |
| 1.1.2 | `/api/public/search` parity (debounce, keyboard nav) | Высокий | ✅ |
| 1.1.3 | Mobile: search в drawer | Средний | ✅ |
| 1.1.4 | Страница `/about` | Низкий | ⏳ |

### 1.2 Event page

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 1.2.1 | Breadcrumbs: Главная → События → Город? → Title | Высокий | ✅ |
| 1.2.2 | SSR JSON-LD: `Event` + `Offer` | Высокий | ✅ |
| 1.2.3 | SSR JSON-LD: `BreadcrumbList` | Высокий | ✅ |
| 1.2.4 | `generateMetadata` | — | ✅ |
| 1.2.5 | Sticky buy card + TC/TEP widgets | — | ✅ |
| 1.2.6 | Мультисобытие «Варианты билетов» | Средний | 🔄 |

### 1.3 City page

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 1.3.1 | FAQ block (редакционный / из payload) | Высокий | ✅ 2026-07-19; **fix:** только city FAQ @`9bc8fa7` |
| 1.3.1a | City hub FAQ: убрать generated/platform FAQ про Дайбилет | Высокий | ✅ `9bc8fa7` prod proof SPB |
| 1.3.2 | SEO text block (intro + перелинковка) | Высокий | ✅ 2026-07-19 |
| 1.3.3 | SSR JSON-LD: `FAQPage` | Высокий | ✅ 2026-07-19 |
| 1.3.4 | SSR JSON-LD: `BreadcrumbList` | Средний | ✅ 2026-07-19 |
| 1.3.5 | Hero, categories, venues, events grid | — | ✅ |
| 1.3.5a | City hub: venues=0 при events>0 (hub top-500 miss) | Критический | ✅ 2026-07-19 |
| 1.3.6 | `generateMetadata` | — | ✅ |
| 1.3.7 | Развивать city hubs `/cities/{slug}` (контент, перелинковка, landings) | Высокий | ⏳ |
| 1.3.8 | City-prefix в path venues/events (`/{city}/venues/...`) | — | 🚫 отклонено 2026-07-19 (flat URL) |

### 1.4 Прочие public routes

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 1.4.1 | Venues / locations breadcrumbs | Средний | 🔄 частично |
| 1.4.2 | `/help` FAQ + JSON-LD | — | ✅ |
| 1.4.3 | Landings JSON-LD (client) | — | ✅ |
| 1.4.4 | Фильтр cross-transport subcategories в карточках | Средний | 🔄 |

---

## Этап 2 — SEO foundation (старт параллельно с 1.2–1.3)

**Цель:** indexable routes в sitemap; structured data в HTML source (не только client).

### 2.1 robots & sitemap

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 2.1.1 | `apps/web/app/robots.ts` | Высокий | ✅ 2026-07-19 |
| 2.1.2 | `app/sitemap.xml` — index → chunks | Высокий | ✅ 2026-07-19 |
| 2.1.3 | Sitemap chunk: `/events/*` (catalog public) | Высокий | ✅ 2026-07-19 |
| 2.1.4 | Sitemap chunk: `/cities/*` | Высокий | ✅ 2026-07-19 |
| 2.1.5 | Sitemap chunk: `/venues/*`, landings, blog | Средний | ✅ 2026-07-19 |
| 2.1.6 | Smoke: `/robots.txt`, `/sitemap.xml` + chunk 200 | Средний | ✅ 2026-07-19 |

### 2.2 SSR JSON-LD (пересечение с Этап 1)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 2.2.1 | Shared helper `lib/structured-data.ts` | Высокий | ✅ |
| 2.2.2 | Event page LD+JSON в RSC (View Source) | Высокий | ✅ |
| 2.2.3 | City page LD+JSON в RSC | Высокий | ✅ 2026-07-19 |
| 2.2.4 | Venue page LD+JSON | Средний | ⏳ |
| 2.2.5 | Google Rich Results / validator smoke | Низкий | ⏳ |
| 2.2.6 | Root WebSite/Organization JSON-LD + Google favicon PNG (48/96/192) | Высокий | ✅ 2026-07-19 deploy prod |
| 2.2.7 | Favicon fill ~90%: 32/48/96/180/192/512 + site.webmanifest | Высокий | ✅ |
| 2.2.8 | Favicon: Flaticon ticket_1912 → бренд `#4A7FD4`, classic horizontal | Высокий | ✅ 2026-07-19 deploy prod |
| 2.2.9 | Favicon: тот же билет, rotate 45°, fill ~88–90% (32/48/96/180/192/512/ico/svg) | Высокий | ✅ 2026-07-19 deploy prod fc736e1 |
| 2.2.10 | Favicon: зеркало угла `rotate(-45)`, тот же крупный fill (все PNG/ICO/SVG) | Высокий | ✅ 2026-07-19 deploy prod 70bc59f |
| 2.2.11 | Favicon: оптический recenter `translate(1.2 1.2)` после rotate(-45) | Высокий | ✅ 2026-07-19 `c1ccd48` / prod `@7c59f8d` |

### 2.3 Canonical & indexing policy

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 2.3.1 | www → non-www (nginx) audit | Средний | ⏳ |
| 2.3.2 | `noindex` для thin city/venue | Средний | ✅ 2026-07-19 |
| 2.3.3 | staging `noindex` | — | ✅ |

### 2.4 Blog / content ops

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 2.4.0 | Инвентарь статей (статика + prod `Article`), запрет дублей | Высокий | ✅ 2026-07-19 |
| 2.4.1 | 5 уникальных заголовков + план ([content-blog-plan.md](./content-blog-plan.md)) | Средний | ✅ 2026-07-19 (сверено с инвентарём) |
| 2.4.2 | Написать/опубликовать 4 статьи (без «как купить»; без пересечения с 13) | Высокий | ✅ 2026-07-19 prod upsert + URL 200 |
| 2.4.3 | Weekly digest script → Article `REVIEW` + cron | Средний | ✅ 2026-07-19 cron + первый REVIEW |
| 2.4.4 | ИИ-журналисты: 5 персон (Макс/Анна/Елена/Игорь/Артур) + style guides + `personas.json` | Высокий | ✅ 2026-07-19 канон [ai-journalists/](./ai-journalists/); Макс + референс Perito |
| 2.4.5 | Первый пилотный материал в стиле письма колонки (по теме от пользователя) | Высокий | ✅ 2026-07-19 full Max text + `[buy]` на `fentezi-fest-bylinnyy-bereg` |
| 2.4.6 | Byline / `authorId` в CMS или frontmatter (без деплоя до пилота ок) | Средний | ✅ hero byline `authorName` + frontmatter/API |

---

## F1–F3 — Next migration (справочно, закрыто)

| Блок | Статус |
|------|--------|
| F1 Monorepo shell | ✅ |
| F2 Public SSR (catalog, event, city, venue, landings) | ✅ |
| F3 Cutover staging + prod | ✅ (хвост = **Этап 0**) |

Детали: [phases/phase-f-next-fullstack.md](./phases/phase-f-next-fullstack.md), [phase-f3-cutover-checklist.md](./phases/phase-f3-cutover-checklist.md).

---

## F4 — Admin → Next (done)

**Канон после F4.6:** admin ops в Next; Vite `/legacy` **hard-retired** (не билдится/не раздаётся). Checklist: [phase-f4-retire-legacy.md](./phases/phase-f4-retire-legacy.md).

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| F4.0 | Kickoff: `(admin)` route group `/admin`, shell, stub dashboard, Basic Auth middleware | Критический | ✅ 2026-07-23 |
| F4.1 | Port Dashboard (live `/api/admin/dashboard` + sources + orders metrics) | Высокий | ✅ 2026-07-23 |
| F4.1a | Port Events / Landings / Articles (lists + articles CRUD) | Высокий | ✅ 2026-07-23 |
| F4.1b | Port Sources / sync-health / Settings | Средний | ✅ 2026-07-23 |
| F4.1c | Cutover admin.daibilet.ru → Next; Vite deep CRUD at `/legacy` | Высокий | ✅ 2026-07-23 |
| F4.2 | Sync jobs → apps/worker | Средний | ✅ 2026-07-23 |
| F4.3 | Port Events override/moderation + Landings SEO/matches to Next | Высокий | ✅ 2026-07-23 |
| F4.4 | Orders/Venues/Cities in Next + soft-retire `/legacy` (Vite kept for gaps) | Средний | ✅ 2026-07-23 |
| F4.5 | Remaining rare ops (taxonomy, candidates, ticket-link, ECR/Reviews) | Низкий | ✅ 2026-07-23 |
| F4.6 | Schedule/sales/source + blocks preview + buyers + unarchive/delete; hard-retire `/legacy` | Высокий | ✅ 2026-07-23 |
| F4.6 | Admin article preview (`/admin/articles/[id]/preview`, noindex) | Высокий | ✅ 2026-07-23 |

## F5 — Retire legacy

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| F5.1 | dto.js read → pure Prisma | Высокий | ⏳ |
| F5.2 | Retire server.js / TS flags | Средний | ⏳ |

---

## Codex / Phase G

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| C.1 | Cherry-pick Phase 2 schema + ECR | Критический | ✅ |
| C.2 | Admin EventChangeRequestsPage | Средний | ✅ (flag) |
| C.3 | Phase G finance runtime / ЛК поставщиков (P.3) | Высокий | ⏳ (продуктовый фокус; не ждать F5 целиком) |

---

## Ops backlog (сквозной)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| O.1 | `qa.md` — открытые архитектурные вопросы | Низкий | ⏳ |
| O.2 | Staging DB отдельно от prod | Средний | ⏳ |
| O.3 | Automated browser smoke (Playwright) для 0.2 | Средний | ⏳ |

---

## Журнал обновлений

| Дата | Изменение |
|------|-----------|
| 2026-07-24 | B.26: `/blog` UX - topics/search/load-more/CTA/date on large |
| 2026-07-23 | B.25: column authors brand blue on listing + article (no «Колонка» badge) |
| 2026-07-23 | B.24: `/blog` magazine\|list view toggle + localStorage/`?view=` (merge badges-off) |
| 2026-07-23 | B.21: blog fonts rollback - Source Serif → Space Grotesk / site default; dropcap off |
| 2026-07-23 | B.20: blog magazine full scope - listing asymmetric + article serif/dropcap/quotes/topic sidebar |
| 2026-07-23 | B.20: `/blog` asymmetric magazine grid (large 2/3 + 2 small; mirror); city hub teasers |
| 2026-07-23 | F4.6: schedule/sales/source + blocks preview + buyers + unarchive/delete; Vite `/legacy` hard-retired |
| 2026-07-23 | F4.5: Next taxonomy + ticket-link + landing candidates + Reviews + ECR; Vite remain for schedule/blocks/buyers; retire not yet |
| 2026-07-23 | F4.6: admin preview статей `/admin/articles/[id]/preview` (noindex, Basic Auth, status+publishedAt banner) |
| 2026-07-23 | F4.4: Next Orders/Venues/Cities + soft-retire `/legacy` (Vite remain for taxonomy/candidates/ticket-link); retire not yet |
| 2026-07-23 | F4.3: Next Events override/moderation/SEO + Landings SEO/matches; Vite остаётся для taxonomy/candidates/Orders |
| 2026-07-23 | F4.2: `@daibilet/worker` CLI + cron wrappers → same scripts/*; Admin Sources API unchanged |
| 2026-07-23 | SEO.16–18: TOP-15 для ручного переобхода (owner); sitemap intents без thin; план 30 путеводителей |
| 2026-07-23 | F4.1c: admin.daibilet.ru → Next (middleware host rewrite) + Vite `/legacy` for deep CRUD; nginx patch + deploy |
| 2026-07-23 | F4.1b: Next `/admin/sources` (+ sync trigger, sync-health) и read-only `/admin/settings` |
| 2026-07-23 | F4.1a: Next `/admin/events|landings|articles` lists; articles create/edit/archive; Vite для deep CRUD |
| 2026-07-23 | F4.1: Next `/admin` live dashboard (dashboard/sources/orders) через server fetch + Basic Auth forward |
| 2026-07-23 | F4 kickoff: Next `/admin` shell + Basic Auth middleware; Vite admin остаётся каноном |
| 2026-07-23 | SEO.8b: найдено расхождение `landing-rules.ts` и legacy runtime `dto.js`; синхронизировано правило `country-tours`, prod smoke: 3 экскурсии, без оперы и концертов |
| 2026-07-23 | SEO.8b: `country-tours` перестал матчить любое событие СПб с топонимом пригорода; теперь нужны одновременно экскурсионный и направленческий сигналы |
| 2026-07-19 | 1.3.1a: city hub FAQ — только cityInfo/editorial; prod proof SPB @`9bc8fa7` |
| 2026-07-23 | SEO.8: утверждён и внедрён TOP-15. Weekend URL канонизирован в `na-vyhodnye`; крыши и загородные экскурсии ограничены Санкт-Петербургом; индекс-порог сохранён на 6 |
| 2026-07-19 | P.2n: city hub `#directions` — только chips с count > 0; prod proof rostov-na-donu @`044e441` |
| 2026-07-19 | P.2m: city hub chips — gap-x-4 между date и category группами |
| 2026-07-19 | P.2k: city hub — без подзаголовка счётчика; date+category one-row desktop; без «Стоит внимания» (дубль афиши) |
| 2026-07-19 | P.2j: city hub без «Популярные теги»; единые компактные date/category chips |
| 2026-07-19 | P.2i: editorial hub template experiment (`?hub=editorial`, Source Serif, poster cards); default phase 1 intact |
| 2026-07-19 | P.2f: city hub фаза 1 в `CityPageView` (sticky tabs, афиша выше, FAQ accordion, чипы Сегодня/Выходные) |
| 2026-07-19 | P.2g: wireframe city hub v2 согласован (docs, city-specific); P.2h реализация ⏳ |
| 2026-07-19 | P.2e: wireframe city hub v1 согласован (docs); P.2f реализация ⏳ |
| 2026-07-19 | Продукт: реклама deferred; фокус AI/статьи, city hubs, финконтур; allowlist без хабов не раздувать (P.1–P.5) |
| 2026-07-19 | TC on-demand: `tc:sync --ids` + `--dry-run`, admin `?ids=` (S.1–S.3) |
| 2026-07-19 | URL: flat paths; SEO через city hubs (1.3.7 ⏳, 1.3.8 🚫) |
| 2026-07-19 | Admin: editable Cities (PATCH) + Articles `publishedAt` UI (B.9/B.10) |
| 2026-07-13 | Roadmap перестроен на **Этапы 0–2** с чеклистами browser/admin smoke, tc:sync, SEO gaps |
| 2026-07-11 | F3 cutover prod, Codex cherry-pick |
| 2026-07-10 | F2 SSR complete, staging Next |

## Google Search Console verification
- [x] **Критический** — файл `googleb3313872246ac993.html` в `apps/web/public/`, deploy prod, curl 200 (2026-07-19)

