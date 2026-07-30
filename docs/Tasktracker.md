# Tasktracker — Daibilet

**Обновлено:** 2026-07-30
**Источники:** [Project.md](./Project.md), [current-state.md](./current-state.md), [migration-spb-to-msk.md](./migration-spb-to-msk.md), [widget-etalon-slugs.md](./widget-etalon-slugs.md), [content-blog-plan.md](./content-blog-plan.md)

**Легенда:** ✅ done · 🔄 in progress · ⏳ todo · 🚫 blocked · ⚠️ deferred

---

## Infra: prod 504 incident (2026-07-30)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| INC.504.1 | MSK egress/DNS: тикет Timeweb на исходящий UDP/TCP :53 и HTTPS (github, IndexNow, remote image hosts) | Средний | ⏳ |
| INC.504.2 | nginx: прямой bypass `/images/*` static, без `/_next/image` для локальных файлов | Средний | ✅ |
| INC.504.3 | Пересмотр `daibilet-web` MemoryMax / heap (1G limit vs ~1.1G RSS под catalog SWR) | Средний | ⏳ |
| INC.504.4 | SWR catalog rebuild: non-blocking / async (не блокировать event loop 49-219с) | Средний | ⏳ |
| INC.504.5 | Dual catalog SWR cache (`dto.js` + `public-catalog.dto.ts`) - merge/unify в F5.3b | Средний | ⏳ |
| INC.504.6 | nginx proxy_cache SWR: `background_update` + TTL 30m (browser clear ≠ cold Next) | Критический | ✅ |
| INC.504.7 | City hub ISR: `unstable_cache` + `generateStaticParams` (было no-store / 20-30с) | Критический | ✅ |
| INC.504.8 | Cron/warm hub pages (`/`, `/events`, top cities) каждые N мин | Высокий | ✅ cron `*/3` + deploy hook |
| INC.504.9 | Compact `/api/public/home` DTO + cache-control (было ~1.2MB no-store) | Критический | ✅ |
| INC.504.10 | City SSR: secondary timeout 3s + perf marks; lighten events list DTO | Критический | ✅ |
| INC.504.11 | AAAA IPv6: проверить маршрут до MSK или снять AAAA в Timeweb | Высокий | ⏳ |

См. Diary 2026-07-30 «Prod 504: daibilet-web hang» и «Cold TTFB после browser cache clear».

---

## Catalog sale vs display price (2026-07-30)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| CAT.DP1 | Owner: saleable = widget+schedule; не требовать priceFrom≥100 для каталога | Критический | ✅ |
| CAT.DP2 | Карточки/таблицы: не показывать «от N ₽» / fake price при null или &lt;100 | Критический | ✅ |
| CAT.DP3 | Admin «Без цены» = display-price gap (мониторинг), не block from sale | Средний | ✅ note |

---

## Infra: переезд prod СПб → МСК (2026-07-29)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| MIG.0 | SSH МСК на новом IP `201.24.125.184` (`daibilet-msk`) | Критический | ✅ |
| MIG.1 | Задокументировать снимок СПб/МСК + план cutover | Высокий | ✅ docs |
| MIG.2 | Postgres Docker `:5437` на МСК + restore dump со СПб | Критический | ✅ |
| MIG.3 | Код `2ec37f4` + `.next` со СПб (build на МСК упёрся в fonts.googleapis DNS) | Критический | ✅ |
| MIG.4 | TLS (443) + nginx parity со СПб | Критический | ✅ |
| MIG.5 | Cron/timers (tc-catalog-sync и др.) на МСК | Высокий | ✅ |
| MIG.6 | Smoke на МСК (IP/`--resolve`) до DNS | Критический | ✅ |
| MIG.7 | DNS A `daibilet.ru`/`www` → `201.24.125.184` + post-smoke | Критический | ✅ 2026-07-30 |
| MIG.8 | СПб: stop public web/api + TC timer + crontab sync; PG snapshot; host → finance+staging | Средний | ✅ 2026-07-30 · [spb-finance-host.md](./spb-finance-host.md) |
| MIG.9 | Role lock: `.184` catalog · `.159` battle finance · `.16` retire after smoke | Высокий | 🔒 docs 2026-07-30 · [spb-finance-host.md](./spb-finance-host.md) |
| MIG.9.0 | Phase 0: SSH/firewall `.159` + DNS stub `checkout`/`supplier`/(opt `finance-api`) | Критический | ⏳ |
| MIG.9.1 | Phase 1: base stack docker/nginx/node на `.159` | Высокий | ⏳ |
| MIG.9.2 | Phase 2: fresh finance PG на `.159` (не catalog dump) | Критический | ⏳ |
| MIG.9.3 | Phase 3: finance app + TLS `checkout.daibilet.ru` (primary), `supplier.daibilet.ru` | Критический | ⏳ |
| MIG.9.4 | Phase 4: optional staging/build scaffolding на `.159` (не justification для `.16`) | Средний | ⏳ |
| MIG.9.5 | Phase 5: YooKassa webhook → новый finance API; старый держать до smoke | Критический | ⏳ |
| MIG.9.6 | Phase 6: smoke checkout/supplier/webhook; catalog `.184` без cutover | Критический | ⏳ |
| MIG.9.7 | Phase 7: backup `.16` + retention 7–14d + retire Intelligent Hoopoe | Высокий | ⏳ |
| PERF.OOM4 | MSK: снять `cpus:1`/`workerThreads:false`, heap build 5120Mi | Высокий | ✅ |

План: [migration-spb-to-msk.md](./migration-spb-to-msk.md) · roles/MIG.9: [spb-migrate-4gb-to-8gb.md](./spb-migrate-4gb-to-8gb.md) · [spb-finance-host.md](./spb-finance-host.md)  
Домены finance: **`checkout.daibilet.ru`** (канон-предложение), optional `pay.daibilet.ru` alias, `supplier.daibilet.ru`, maybe `finance-api.daibilet.ru` ([qa.md](./qa.md)).

## PERF event pages (после DNS на МСК)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| PERF.E3 | `hydrateSlots: false` в event DTO | Высокий | ✅ cold TTFB МСК ~0.12–0.17с → warm ~8ms |
| PERF.E4 | Warm top-100–300 `/events/[slug]` после deploy/sync | Высокий | ✅ `scripts/warm-top-event-pages.mjs` + deploy hook |
| PERF.E4b | `generateStaticParams` только top-N | Высокий | ✅ top-N default 200 (`EVENT_SSG_TOP_N`) |
| PERF.E5 | Event page без full catalog (slug→DB + related) | Средний | ✅ 2026-07-30 |

---

## Event page perf (после переезда на МСК) (2026-07-29)

**Блокер/зависимость:** все пункты ниже - **после переезда на МСК** (после MIG.7 / DNS cutover). Не блокируют сам переезд. Owner 2026-07-29: отложено post-MSK.

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| PERF.E2 | Diagnose `/events`→`/events/[slug]` slow nav (TTFB cold 1.5–7.5с) | Критический | ✅ root cause: on-demand ISR + catalog hydrate в event DTO |
| PERF.E3 | `buildPublicEventDto`: `getPublicCatalogSessions(..., { hydrateSlots: false })` | Высокий | ✅ код; cold TTFB МСК ~0.12–0.17с → warm ~8ms (2026-07-30) |
| PERF.E4 | Warm top-100–300 популярных `/events/[slug]` после deploy/sync | Высокий | ✅ `scripts/warm-top-event-pages.mjs` + deploy hook |
| PERF.E4b | `generateStaticParams` только top-N (не все ~2600; OOM-safe) | Высокий | ✅ top-N default 200 (`EVENT_SSG_TOP_N`) |
| PERF.E5 | Event page без full catalog: slug → DB + related отдельно | Средний | ✅ 2026-07-30 `public-event.dto` без `getPublicCatalogSessions` |

---

## Landing match: concerts vs bus tours (2026-07-29)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| LAND.C1 | /kontserty: исключить автобусные туры (тег/«на автобусе») из concerts-genre | Высокий | ✅ dual-edit dto.js + landing-rules.ts |

---

## Blog content polish (2026-07-29)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| BLOG.P1 | Причесать все blog MD кроме 5 owner-rewrites | Высокий | ✅ 37 PUBLISHED |
| BLOG.P2 | Cover + 1-2 inline на диске для PUBLISHED | Критический | ✅ missing=0 |
| BLOG.P3 | HIDDEN: bylinnyy-bereg-fentezi-fest, open-air-festy-vyhodnoi-ru | Низкий | ⚠️ без тяжёлой переписки |
| BLOG.P4 | Deploy prod после push feat/next-monorepo | Высокий | ✅ `13f0e18` prod |
| BLOG.P5 | Excerpt UX: listing only / no mash; article без excerpt block | Критический | ✅ |
| BLOG.P6 | SEO desc: strip «Колонка {Имя}:» | Высокий | ✅ |

---

## Ops: TC catalog sync reliability (2026-07-27)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| SYNC.1 | `deploy/cron/tc-catalog-sync.sh` executable (`100755`) - nightly 203/EXEC | Критический | ✅ prod chmod + git filemode |
| SYNC.2 | systemd: `NODE_OPTIONS=--max-old-space-size=1536`, MemoryMax≥2G (catalog JSON ~245MB) | Критический | ✅ prod unit + repo `deploy/systemd/` |
| SYNC.3 | `tc-sync` / worker: fail when child killed by signal (OOM masked SUCCESS) | Критический | ✅ code; **deploy на prod ⏳** |
| SYNC.4 | Verify next nightly 03:20: real `importedEvents` + non-zero import, not fetch-only | Критический | 🔄 timer ✅; **2026-07-27 03:20Z** `importedEvents:21145` exitCode:0; **28.07** ⏳ post-check `verify-tc-catalog-sync.sh`; alert в `tc-catalog-sync.sh` |
| SYNC.5 | TEP full sync (habit) | Высокий | ✅ 2026-07-26 22:22Z ~307с / 214 events / 20566 links |
| VENUE.L1 | Lumiere Hall enue_54cabc2b9cb5385a9f65b95a: 404 hub (MEETING_POINT/NONE) - ensure script + TC import guard | Критический | ✅ 6e17cce prod + ensure DB | агент |

---

## Landing SSR perf (2026-07-27)


| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| PERF.B1 | /blog ISR: cached list 300s, Suspense shell, minimal hero (no newsletter) | Критический | ✅ 88585ec prod: s-maxage=300 HIT, TTFB ~0.10s (было ~1.08s no-cache) | агент |

---

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| PERF.L1 | Landings ISR: убрать `await searchParams` в `[segment]`/`[segment2]`/`[segment3]`; genre с URL на клиенте | Критический | ✅ `c433652` prod (`s-maxage=3600` + HIT) |
| PERF.L2 | `publicCatalogSessions` SWR (fresh 5м / stale 30м + soft-invalidate), зеркало TS DTO | Критический | ✅ `c433652` prod |
| PERF.L3 | Slim SSR: fallback `buildPublicLandingPage` → lean cards + slice 48 (как managed) | Высокий | ✅ `c433652`; `/rechnye-progulki` ~231KB (было ~705KB) |
| PERF.L4 | `/events` generateMetadata без searchParams (SEO tradeoff vs ISR) | Средний | ✅ `c799c31` prod: `s-maxage=300` + HIT |
| PERF.L5 | `/progulki-po-krysham` warm всегда `x-nextjs-cache: MISS` при s-maxage=3600 | Низкий | ⏳ anomaly (TTFB OK ~0.12с) |
| PERF.E1 | `/events/[slug]` ISR: `generateStaticParams([])` + `unstable_cache` DTO/rating; shared metadata+page | Критический | ✅ `c799c31` prod: cold MISS ~1.4с → warm HIT ~16ms |
| PERF.D1 | Deploy: reap orphan `jest-worker` / leftover `next build` (PPID=1, cwd under `/opt/daibilet`) | Критический | ✅ `c799c31` deploy reap pre/post; orphan=0 |
| PERF.OOM1 | `next.config`: `workerThreads: false`, `productionBrowserSourceMaps: false` | Критический | ✅ `073f1d3` prod |
| PERF.OOM2 | `web:build` heap cap 2560Mi (`next-build.mjs` + deploy NODE_OPTIONS) | Критический | ✅ prod deploy EXIT:0 |
| PERF.OOM3 | Prod `vm.swappiness=10` idempotent in deploy | Высокий | ✅ prod sysctl=10 |

---

## Landing buy UX / TC+Teplohod feedback (2026-07-26)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| BUY.1 | Hidden TC triggers не перекрывают CTA (`pointer-events-none`) | Критический | ✅ `c984d8a` |
| BUY.2 | Optimistic shell «Открываем оплату…» + retry/fallback TC+Teplohod | Критический | ✅ код готов; deploy с CV.L-Hero |
| BUY.3 | Bridges: убрать fake ★4.7 / sold-count; hide fake Reviews | Высокий | ✅ |
| BUY.4 | TEP open: не ждать `window.TI_Tickets` (IIFE); fast-path click + preload script | Критический | ✅ `ac91b0f` на prod (2026-07-27) |
| BUY.4b | TEP: Fancybox/iframe = success; не fail/dismiss если виджет уже виден; wait buy-link | Критический | ✅ `b02f657` prod; smoke moscow/bridges/SPB river ~40–57ms, fail shell=0 |
| BUY.5 | TEP: lazy/shared embed на лендингах (убрать N×XHR `widget/embed`) | Высокий | ✅ `59fd4d8` prod deploy |
| BUY.6 | TEP: `TeplohodWidgetEmbed` всегда через `resolveTeplohodCheckoutUrl` (не raw purchaseUrl) | Средний | ⏳ latent defense |
| BUY.7 | Owner site-wide TEP link audit (landings/event/home/dinner/party) | Высокий | ✅ 2026-07-27: broken patterns не найдены; см. Diary |
| BUY.8 | Landing buy: TEP → CheckoutModal iframe; TC → native tcwidget (не iframe-в-iframe) | Критический | ✅ `988ae7e` |
| BUY.8b | TC: убрать CheckoutModal вокруг widgets/common (event/landing/CTA) | Критический | ✅ `988ae7e` |
| BUY.8c | TC: z-index - overlay ниже iframe shell (2147482990 / 2147483000) + liftTcWidgetLayers | Критический | ✅ `2ec37f4` prod |
| BUY.9 | Event page: TEP → CheckoutModal; TC → TcWidgetButton/slots (native) | Критический | ✅ `988ae7e` |

---

## Bridges SEO lead / on-page copy (2026-07-26)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| BR.SEO1 | Night-bridges SEO lead: full width + абзацы + дедуп pad ×3; sanitize seed | Высокий | ✅ |
| BR.SEO2 | Проверка остальных landings с тем же pad в `seo-listing-texts` | Высокий | ✅ cleaned all + runtime sanitize |

---

## Bridges hero price range (2026-07-26)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| BR.PR1 | Hero stats: real min-max `priceTo` + honest label; CTA only «от min» | Критический | ✅ `ae3c86c`/`6fe5ede`/`f02889e`; prod smoke `priceTo:2490`, hero `990-2 490 ₽` |
| BR.PR2 | Hero 4-stat strip (события/sold/4.7/диапазон) - owner lock, **не обрезать** | Критический | ✅ restored 2026-07-26 (откат ошибочного trim) |

---

## Seasonal landing H1 (2026-07-26)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| SEO.NY1 | NY/seasonal H1: убрать «сегодня, дата»; festive framing без «точек обзора» | Критический | ✅ `c008a52`/`776cad9` prod smoke `/novyj-god` |

---

## IndexNow / Yandex Webmaster (2026-07-26)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| SEO.IN1 | IndexNow: key file `/indexnow-key.txt` + `/{key}.txt` + notify Yandex/Bing on revalidate / article publish / deploy-warm (без спама каталогом) | Критический | ✅ `96fd5a9` / fix `683455d` / `d355b62`; prod key 200; Yandex IndexNow 202 |
| SEO.IN2 | Owner: добавить sitemap `https://daibilet.ru/sitemap.xml` в Яндекс.Вебмастер (если ещё нет) | Высокий | ⏳ **владелец** (чеклист `docs/webmaster-top15-checklist.md`) |
| SEO.IN3 | Owner: Переобход TOP-15 URL после deploy (Вебмастер → Индексирование → Переобход) | Высокий | ⏳ **владелец** (см. `docs/webmaster-top15-checklist.md`) |
| SEO.IN4 | Метрика уже на сайте (ID 106786540) - не трогать код; цели CV.2b отдельно | — | ✅ already |

---

## SEO technical launch checklist (2026-07-26)

Полная таблица: [seo-launch-checklist.md](./seo-launch-checklist.md). Lovable Category-модель / sample `[city]/[category]` - не принимать.

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| SEO.LC1 | Audit robots/sitemap/canonical/meta/H1/CWV vs owner checklist | Критический | ✅ |
| SEO.LC2 | robots: Disallow `/api/` (+ account/admin/login/reviews/write) | Высокий | ✅ |
| SEO.LC3 | Meta: реальный `priceFrom` only; убрать invent «от 100» в `landing-seo` | Критический | ✅ |
| SEO.LC4 | National + city×category metadata через `buildLandingMetadata` / `seo-listing-meta` | Высокий | ✅ |
| SEO.LC5 | Landing grid «Показать ещё» (page 48) + chip touch ~44px | Средний | ✅ |
| SEO.LC6 | Owner: Webmaster sitemap + reindex TOP | Высокий | ⏳ **владелец** (IN2/IN3) |

---

## Event buy-card tariffs (2026-07-26)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| BT.1 | Public event DTO: offers из page event, не cheapest-32 по meta-группе | Критический | ✅ |
| BT.2 | Smoke TC «Реки и каналы»: диапазон + все категории в buy-card | Критический | ✅ `98aec73` |

---

## Clean & Contextual UI (2026-07-25)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| CU.1 | Токены + tailwind: fonts, radius 16, soft shadow, graphite, surface muted, section spacing | Критический | ✅ |
| CU.2 | Шрифты Manrope + Inter (+ Source Serif legacy) в root layout (link; next/font follow-up) | Критический | ✅ |
| CU.2b | Self-host через next/font (Manrope+Inter+Source Serif) | Средний | ✅ |
| CU.3 | EventCard / EventCardHorizontal / showcase: Clean UI (фото, meta icons, цена+CTA) | Критический | ✅ |
| CU.4 | Home rails + `/events` grid/list gap и section-y | Высокий | ✅ |
| CU.5 | Header / SiteNav / footer под токены | Высокий | ✅ |
| CU.6 | Event detail page: воздух, meta, CTA | Высокий | ✅ |
| CU.7 | Catalog filters / chips toolbar | Средний | ✅ |
| CU.8 | CityCard / InstitutionCard / landing tiles | Средний | ✅ |
| CU.8b | Home format + thematic tiles: photo covers вместо градиентов | Высокий | ✅ |
| CU.8c | EventCard pin lines: адрес/город vs provider secondary | Высокий | ✅ |
| CU.8e | EventCard: meta под фото; слоты 2×2/3 в ряд, формат без weekday | Высокий | ✅ UI `618fdd6`; API slots 5 `LIST_SLOT_PREVIEW` |
| CU.8e2 | Catalog API: upcomingSlots 3→5 (hydrate+list-item), иначе чипы без primary = max 2 | Критический | ✅ `11ac786` prod |
| CU.8d | Home featured blog: white title on dark overlay | Высокий | ✅ |
| CU.9 | Commit + deploy для owner review | Критический | ✅ `17a56af` (p2) + `4a69541` (p3-4) |
| CU.10 | Blog surfaces + search overlay polish | Средний | ✅ |
| CU.11 | Micro-animations (hover translate/scale) | Низкий | ✅ |
| CU.12 | HorizontalScroll / ScrollRail: prev/next на md+ для home rails и `/podborki` | Высокий | ✅ `fac6863` (prod @`cf9ccfd`) |
| CU.13 | Home/podborki: на lg+ сетка всех превью (format 4 / thematic 3), без обрезки карусели; фото fallback | Высокий | ✅ `5d11482` |
| CU.2b | Self-host через next/font (Manrope+Inter+Source Serif) | Средний | ✅ |

---

## UX conversion fixes (2026-07-25)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| UX.1 | City hub: CTA без «билетного оператора» + короткий SEO-блок | Критический | ✅ |
| UX.2 | `/events`: clamp page, conditional facets, empty-state reset | Критический | ✅ |
| UX.3 | `/events`: сквозной date picker + preset «2 недели» | Высокий | ✅ |
| UX.4 | Карточки: теги без площадки/судна; CTA «Купить билет»; цена «от» | Высокий | ✅ |
| UX.5 | Event detail: шаги покупки, open-date UX, тарифы/hint цены | Критический | ✅ |
| UX.6 | Landing SEO copy без «у оператора» (`seo-listing-texts`) | Средний | ⏳ |
| UX.7 | Home SERP: meta «Купите билеты» + nosnippet partner/footer; help FAQ soften | Критический | ✅ |
| UX.8 | Event description: H3/UL/абзацы (Teplohod marker-less + TC comma lists) | Критический | ✅ `f92b1d6` Teplohod; TC fix `f5d85f6` prod smoke 4×h3 + ul |

---

## Conversion surfaces pack (2026-07-25)

Стратегия по 5 поверхностям (owner brief). Fake sold/rating запрещены (HC.3). Owner lock 2026-07-25: см. `qa.md` (закрыто) + Diary.

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| CV.1 | `/events` filters: sticky «Показать N вариантов» + live preview count | Критический | ✅ debounce 350ms; zero CTA: «Нет подходящих событий» (pastel gray) |
| CV.2 | `/events` grid: interstitial баннеры каждые 8 карточек → гиды/подборки | Высокий | ✅ soft tint + badge «Подборка»/«Из Блога»; compact mobile + click track |
| CV.2b | Настроить цель `catalog_interstitial_click` в Метрике + триггер/тег в GTM (маркетолог; frontend push уже есть) | Высокий | ⏳ handoff: `docs/metrika-goals-checklist.md`; код ✅ |
| CV.2c | Метрика: цель `product_card_click` (клик карточки события) - маркетолог создаёт JS-событие | Критический | ⏳ handoff: код ✅ (`EventCard`); см. `docs/metrika-goals-checklist.md` |
| CV.2d | Метрика: цель `select_tickets` (клик Купить / открытие виджета TC\|Teplohod) - маркетолог | Критический | ⏳ handoff: код ✅ (`TcWidget`/`TeplohodWidget`); см. checklist |
| CV.2e | Метрика: цель `purchase_success` - маркетолог может создать заранее; **код НЕ шлёт** без callback виджета / thank-you / webhook | Высокий | ⏳ documented `docs/metrika-goals-checklist.md`; код ❌ |
| CV.2f | Webvisor SOP (маркетолог): первый месяц ежедневно 10-15 мин просмотр сессий воронки card→виджет | Высокий | ⏳ SOP в `docs/metrika-goals-checklist.md` §5 |
| CV.3 | Home: live stats (города/события/площадки) + «Как купить» 3 шага | Высокий | ✅ step3 email/SMS/phone; how-to-buy mt-20 + bg-slate-50; social proof = destinations с events (city+region, ≈stats.destinations) до CV.11 |
| CV.4 | Blog: native `[buy]` card (цена + CTA), без «сайт партнёра» | Высокий | ✅ live DTO + no-store; min `от N ₽` + fixed price width; единственный embed-путь (см. CV.8 🚫) |
| CV.5 | Sort «скидки» в каталоге | Средний | ⚠️ deferred: нет `discount`/`strikePrice` в DTO; ждать sync architecture sprint |
| CV.6 | Home video hero (HC.10) | Средний | ⚠️ deferred: photo rotator KEEP; stock muted loops 🚫; ждать продакшн-съёмку; реальные МСК/СПб WebP/AVIF |
| CV.6b | Home hero multi-city rotator (не только СПб/Исаакий) | Высокий | ✅ superseded CV.6c: landmarks сняты |
| CV.6c | Home hero tourist emotions (people-first, не landmarks) | Высокий | ✅ `home/hero-emotion-0{1-6}.jpg` + HeroBanner migrate `20260726010000` |
| CV.7 | Podborki listing: inline buy на плитках | Низкий | ⏳ покупка уже на CHPU landing |
| CV.8 | Blog: auto related events по тегам статьи | Средний | 🚫 rejected: misfire риск убивает native conversion; только manual `[buy]` / admin field |
| CV.9 | Venue logistics «как найти» (эпик; owner иногда зовёт «Спринт CV.5» - **не** путать с CV.5 discounts) | Высокий | ✅ `714822c` CV.9a-d; OSM→Yandex unify deferred; [venue-logistics-spec.md](./venue-logistics-spec.md); prod = migrate+deploy |
| CV.9a | Prisma: `Venue.metroStation` / `wayToFind` / `parkingInfo` + migrate | Высокий | ✅ `20260725120000_venue_logistics` |
| CV.9b | Admin CMS: секция «Логистика» в Next `/admin/venues/[id]` + PATCH (`normalizeVenuePayload` / `updateAdminVenue`); address sync-only readonly | Высокий | ✅ |
| CV.9c | Public DTO + блок логистики на venue page (`VenueLogisticsBlock`; empty hide если нет address и трёх полей); OSM keep | Высокий | ✅ + owner: hide empty metro/way/parking independently |
| CV.9d | `/events/[slug]`: venue click → modal (логистика + Yandex iframe при coords / external button иначе); slim SSR fields; fallback «Страница площадки» | Средний | ✅ |
| CV.9e | Guard: null/whitespace `metroStation` → no metro UI (иконка+label); same for wayToFind/parking; LocationCard без fake Train | Высокий | ✅ |
| CV.9f | Venue route CTA: Google Maps → 2ГИС (`build2gisRouteUrl`, lon,lat) | Средний | ✅ 2026-07-27 |
| CV.10 | Mood chip «Свидание» на `/podborki` (рядом с «Для двоих») | Низкий | ⏳ |
| CV.11 | Social proof «проданные билеты» (TC Order paid aggregate) | Средний | ⚠️ deferred: только после реального order-aggregate; hardcoded fake 🚫; до - каталожные counts (CV.3) |
| CV.12 | Catalog card dates: human mask `25 июля, суббота в 07:15` | Высокий | ✅ open-date без фейковых часов; не путать с CV.5 (скидки) |

---

## Landing master template / CRO (2026-07-26)

Эталон: Night Bridges. Инкрементально вытаскивать паттерны в shared hooks/components. План: [landing-master-template-plan.md](./landing-master-template-plan.md).  
GPT-брифы на контент-дыры: [landing-content-gpt-briefs.md](./landing-content-gpt-briefs.md).  
Owner-locked порядок: Hero → Советы → Расписание → Как выбрать → FAQ → Attention → Отзывы (только real).  
Запреты: no UnifiedEventCard rewrite каталога; no `app/[city]/[category]`; no fake ★; no prisma rating migration без Review aggregate; no clone palace-bridge hours на NY.

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| CV.L-Buy | Restore clickable landing buy CTAs (TC trigger overlay) | Критический | ✅ `TcWidget` off-screen + `pointer-events:none` |
| CV.L-Hero | Hero-first: bridges selling strip на все профили; NY countdown+CTA; **4 stats обязательны** | Критический | ✅ 4-col strip restored + NY layout |
| CV.L-Order | Reorder секций к owner 1-7 на всех профилях | Высокий | ✅ CW/Tips before schedule; howTo→FAQ→checklist→reviews |
| CV.L-Content | Контент tips/how-to/FAQ/checklist по GPT briefs (owner assign) | Высокий | ✅ packs A-G wired (`landing-content-packs` + CW + bridges/NY) |
| CV.L1 | Micro-badges из tags/subcategories/title на schedule rows + EventCard(`landingActions`); dinner badge chips; скрыть fake ★ на этих поверхностях | Критический | ✅ helper `landing-card-badges.ts` |
| CV.L2 | Date chips UX для concert/standup (sticky horizontal, slots без reload) | Высокий | ⏳ chips уже есть на default; polish |
| CV.L3 | River section tabs day/night/dinner (bridges patterns → shared) | Высокий | ⏳ |
| CV.L4 | ContextWidget config по slug (owner matrix: planetarium/rooftops/country-tours/river-party/family-kids/new-year); text-first chips; no Prisma Category.widgetData | Средний | ✅ thin |
| CV.L4b | ContextWidget follow-up: yards / dinner / standup / museums | Средний | ⏳ |
| CV.L5 | Empty-state cross-sell на соседние CHPU / city hub | Высокий | ✅ `LandingEmptyState` + related hits при 0; catalog empty polish |
| CV.L5b | Optimistic UI: favorites heart + verify landing filter chips local | Средний | ✅ favorites local-first optimistic; chips уже client filter |
| CV.L6 | Map start points (Yandex) yards/bridges - после logistics | Низкий | ⏳ later |
| CV.L-debt | Cleanup legacy `LandingReviews` ниже fold; hero 4-stat strip = owner-approved selling (не debt) | Средний | ⏳ Reviews hide until real; strip ✅ |

---

## SEO duplicate titles (2026-07-24)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| SEO.T1 | Уникальные title/OG для `/legal` `/privacy`; fix home og inherit | Критический | ✅ |
| SEO.T2 | `/events` + filters: dynamic title + noindex на query | Критический | ✅ |
| SEO.T3 | Event twins: date/venue disambiguator в title | Высокий | ✅ |
| SEO.T4 | `not-found` metadata; HOME/social-preview без em dash | Высокий | ✅ |
| SEO.T5 | Deploy + revalidate / переобход Вебмастер | Критический | ⏳ |

---

## UX: scroll to top (2026-07-24)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| ST.1 | Floating «Наверх» в `SiteLayout` (хабы/блог/каталоги/home) | Высокий | ✅ |

---

## Hero conversion pack (2026-07-24)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| HC.1 | `/` H1 «Куда сходим в [City_Пр]?» + chips + CTA «Найти билеты» | Критический | ✅ |
| HC.2 | `/events` strip: гео H1 + матрица Когда/Что + trust (без photo) | Критический | ✅ → HC.2b |
| HC.2b | `/events` UX: единая search bar, одна лента категорий, быстрые в Фильтры | Критический | ✅ |
| HC.3 | Landing trust strip (email / возврат по правилам / e-вход); убраны fake sold/rating | Высокий | ✅ |
| HC.4 | `/locations` гео H1 + type chips в hero; emoji убраны; withMap сохранён | Высокий | ✅ |
| HC.4b | `/locations` H1 «Локации и точки сбора» (каталог, не tourist CTA) | Высокий | ✅ |
| HC.5 | `/venues` гео H1 + format toggles в hero; photo сохранён; emoji убраны | Высокий | ✅ |
| HC.6 | `/cities` live search suggestions + tabs Популярные/А-Я | Высокий | ✅ |
| HC.7 | `/podborki` emotional H1 + mood chips + seasonal banner; emoji presets off | Высокий | ✅ |
| HC.8 | `/blog` «Материал недели» + newsletter UI + `/api/public/newsletter` stub | Высокий | ✅ |
| HC.9 | Event detail: CTA крупнее; scarcity только из real `vacant` | Средний | ✅ partial |
| HC.10 | Home video muted loop ≤5MB | Низкий | ⚠️ deferred (owner 2026-07-25): photo rotator KEEP; stock muted loops 🚫; ждать продакшн-съёмку (=CV.6) |
| HC.11 | `/venues` «Рядом со мной» geolocation sort | Средний | ⚠️ P2 нет lat/lng на VenueCatalogCard |
| HC.12 | `/events` featured split / search preview / tourist tags | Средний | ⚠️ P2 |
| HC.13 | Landing «бесплатная отмена 24ч» | - | 🚫 запрещено политикой (возврат у организатора) |

---

## Catalog covers policy (2026-07-24)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| CC.1 | Policy: нет Event/Venue без cover; после TC/TEP import - promote CDN, иначе generate | Критический | ✅ `4f11520` |
| CC.2 | Fix lean venue fallback: принимать `/images/events|venues/*` (не только https) | Критический | ✅ `4f11520` |
| CC.3 | `scripts/ensure-catalog-covers.js` + hook в `tc:sync` / `tep:sync` / worker | Критический | ✅ `4f11520` |
| CC.4 | Prod backfill: promote + generate пустые hubs (Sortavala и др.) | Критический | ✅ venues promote 939 + gen 9; events 55 (11 groups); `no_hero=0` / `no_image=0` @`5fcc79d` |

---

## Home rails cover dedupe (2026-07-24)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| HR.1 | Taboo Harry Potter + basename cover skip (`4e18b60`) | Критический | ✅ |
| HR.2 | Content fingerprint (ETag) + multi-key URL normalize; refill gaps | Критический | ✅ `ab1dc94` prod |
| HR.3 | Home TTFB: убрать `connection()` + fingerprints в `unstable_cache` 300s | Критический | ✅ `1d0ed0e` prod |
| HR.4 | `/events` `/podborki` city hub: убрать `searchParams` no-store; podborki meta cache | Критический | ✅ `bf97706` prod (`/` `/events` `/podborki` → ○ ISR; city hub ещё ƒ) |

---

## Hero UX (2026-07-24)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| H.1 | Shared `HeroLayout` + `HeroMedia` (LCP priority) | Критический | ✅ |
| H.2 | Home imageOverlay/rotator + Prisma `HeroBanner` + admin toggle | Критический | ✅ `72ea839` prod migrate+deploy |
| H.3 | `/cities` split + RF map hover + top tiles ISR 1h | Высокий | ✅ |
| H.3b | `/cities` top tiles + «Популярные города»: max-w-5xl + items-stretch (как podborki) | Критический | ✅ `d1ccd8a` prod |
| H.3c | `/cities`+/`podborki`: H1 и row на одной оси `HeroLayout` max-w-5xl; blog featured = container width | Критический | ✅ |
| H.3d | `/cities` imageOverlay photo hero + search (как venues); tiles/map ниже на max-w-5xl | Критический | 🚫 owner: откат к `minimal`+tiles/map (до `8ec241c`) |
| H.3e | `/cities` hub mini-tags (top landings) + ISR 86400 | Критический | ✅ `44887fb` |
| H.3f | `/cities` hubTags: 3 чипа в одну строку (nowrap + шире tiles vs aside) | Высокий | 🔄 |
| H.3g | `/cities` top tiles: отдельные daytime preview (`cities/top/*.jpg`), каталог без изменений | Критический | ✅ `fbbbaf7` prod |
| H.4 | `/podborki` featured+trending equal-height, centered `max-w-5xl` | Высокий | ✅ `533d40a` prod @`d1ccd8a` |
| H.4b | `/podborki` tag soup → `LandingCategory` + carousels (by-type/for-whom/seasonal) | Критический | ✅ `30e87fe`+`44887fb` |
| H.5 | `/venues` dark imageOverlay + search | Средний | ✅ MVP |
| H.5b | `/events` imageOverlay photo hero + search/city/date (как venues) | Критический | 🚫 owner: откат к `SectionPageHero` strip (до `47430af`) |
| H.6 | `/locations` photo hero (imageOverlay) как venues; map не в hero | Критический | 🚫 owner: откат к `withMap`+RussiaMap (до `47430af`) |
| H.7 | Video loop asset для home | Низкий | ⚠️ deferred (owner 2026-07-25): rotator KEEP; stock loops 🚫; =HC.10/CV.6 |
| H.8 | Blog Featured Hero + interactive list H1 + «Свежее»×3 + min price | Высокий | ✅ `b45995c` prod @`c39d124` |
| H.8b | `/blog` featured+«Свежее»: max-w-5xl composition + square thumbs | Критический | ✅ `90f6151` prod @`d1ccd8a` |
| H.8c | `/blog` list hero → imageOverlay + search/chips внутри (уровень venues) | Критический | 🚫 owner: откат к interactive strip (до `8ec241c`; «статьи») |
| H.8d | `/blog` city rank (header) + cursor pagination + article canonical | Критический | ✅ `44887fb` |
| H.8e | `/blog` client: base64url Buffer crash → btoa/atob cursor | Критический | ✅ `c716a4e` prod |
| H.8f | `/blog` afisha promo: цена/события/chips по geo; full-width после 3 статей фида | Критический | 🚫 owner: не убирать из угла |
| H.8f-fix | Blog afisha promo: split server `resolveBlogSidebarPromoMap` (pg out of client) | Критический | ✅ `d47c300` prod |
| H.8g | `/blog`: swap «Свежее»↔Featured; rich Афиша в углу под Fresh; убрать mid-feed strip | Критический | ✅ `9be0a98` prod @`ab1dc94` |
| H.8h | `/blog` featured/large: длиннее excerpt, без mt-auto/flex-1 дыры над CTA | Критический | ✅ `55aaa9d` prod @`5fcc79d` |
| H.8h2 | `/blog` default/small cards: без flex-1 на line-clamp (ложные «...» mid-phrase) | Критический | ✅ `a0a12b9` prod |
| H.8i | `/blog` topic chips: smooth scroll к `#blog-feed` + явный active chip | Высокий | ✅ `292c92b` prod |
| H.9 | Ultrawide heroes: min-h + face-safe object-position (home+catalog HeroMedia) | Критический | 🚫 reverted (гигантский hero) |
| H.9b | Ultrawide: альтернативные 21:9 кадры (`*-uw.jpg`) + `<picture>`, без min-h inflation | Критический | 🚫 owner: увеличивало фото; откат к desktop landscape |
| H.9c | Ultrawide: убрать `*-uw` art-direction; тот же кадр + мягкий object-position | Критический | ✅ `982d89c` prod |

---

## Catalog perf (2026-07-24)

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| P.V1 | `/venues`+`/locations`: lean Prisma `_count` вместо session hydrate для плиток | Высокий | ✅ `9af3910` |
| P.V1b | Regression: lean hub дропнул event-image cover fallbacks → пустые карточки `/venues` | Критический | ✅ `f7e0071` prod |
| P.V2 | Suspense + pulse skeletons на фильтрах (city/type), без full-page loader | Высокий | ✅ `9af3910` |
| P.V3 | `Venue @@index([title])` + migrate `20260724030000_venue_title_search_index` | Средний | ✅ `9af3910` (migrate on deploy) |
| PERF.1 | Prisma singleton `globalThis` + shared pg Pool (`@daibilet/db`) | Критический | ✅ `6ce435a` |
| PERF.2 | Lean catalog DTOs + `unstable_cache` 600s для podborki/venues/locations (Redis follow-up) | Высокий | ✅ partial; landings rule-match sessions ещё в DTO |
| PERF.3 | Header search: pg_trgm + synonyms (Meilisearch P2) | Высокий | ✅ `125feab` |
| PERF.3b | Header search: не отдавать past/non-saleable events (404 trap) | Критический | ✅ 2026-07-27 |
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

## Решение владельца (2026-07-23; lock 2026-07-25)

- **F4 admin → Next** - ✅ **done (F4.6)**; Vite `/legacy` hard-retired. Канон: Next admin на `admin.daibilet.ru`.
- Launch-фокус: качество landing matching + актуальность событий; dual-edit `dto.js` + `landing-rules.ts` до F5 (без codegen).
- Finance contour / ЛК поставщиков отложен: продукт ещё не готов. Изменения Codex finance не трогаем.
- Blog anti-spam LOCK: хаос-темп гидов при 80–90% index; 1 пн-колонка/нед; Pack B = новый угол, не rewrite 9 longforms.
- SEO LOCK: TOP-15 editorial focus без URL churn; `MIN_LISTING=6`; CHPU density; телефон только после 8-800.

| # | Задача | Приоритет | Статус | Ownership |
|---|--------|-----------|--------|-----------|
| SEO.1 | Формулы Title/Description category×city (`seo-listing-meta.ts`) | Критический | ✅ | агент |
| SEO.2 | On-page SEO тексты TOP seed (~18 шт., 1000–1200) под сеткой | Критический | ✅ | агент (seed); владелец - утверждение/правки |
| SEO.3 | Thin pages: `noindex,follow` если &lt; 6 офферов; sitemap filter | Критический | ✅ | агент |
| SEO.4 | MULTI_CITY: standup / family-kids / concerts / active-sport + SPB/MSK/Kazan | Высокий | ✅ | агент |
| SEO.5 | Intent ЧПУ `/podborki/{intent}` (+ city) + preset links | Высокий | ✅ | агент |
| SEO.6 | `/contacts` + footer/sitemap trust | Высокий | ✅ | агент |
| SEO.7 | Event trust strip | Средний | ✅ | агент |
| SEO.8 | TOP-15 launch set: водные, стендап, экскурсии, культура, intent; «крыши» только СПб | Высокий | ✅ 2026-07-23 | владелец утвердил, агент внедрил; editorial focus LOCK, без URL churn |
| SEO.8a | Editorial polish текстов TOP-15, в первую очередь новые `walking-tours`, `country-tours`, `exhibitions`, `unusual-theatres`, `excursions`, `rooftops` | Высокий | 🔄 seed готов, нужна редакторская вычитка | владелец + агент |
| SEO.8b | `country-tours`: требовать экскурсионный и направленческий сигналы, исключить культурные события по топонимам | Высокий | ✅ 2026-07-23 | runtime `dto.js` синхронизирован, prod deploy + smoke: 3 экскурсии, без оперы и концертов |
| SEO.8c | Аудит всех landing rules: исключить мусорные попадания, сверить сэмплы и runtime `dto.js` | Критический | 🔄 2026-07-25 | national `/progulki-po-krysham` ✅ (смотровые); остальной rule-audit продолжается |
| SEO.9 | Trust contacts без телефона (launch policy) | Средний | ✅ политика: футер email only; реквизиты off `/contacts` → `/requisites`; YM Webmaster/Business по ИНН/ОГРНИП | **владелец** (верификация) / агент (UI ✅) |
| SEO.9b | Телефон 8-800 в header + footer (+ contacts), когда номер одобрен | Высокий | 🚫 blocked: ждём утверждённый 8-800 у владельца; ASAP после approve | **владелец** → агент UI |
| SEO.11 | Порог индекса SEO-листингов | Критический | ✅ `MIN_LISTING_OFFERS_FOR_INDEX = 6` (не поднимать; soft-цель редакторов = 10) | агент |
| SEO.12 | Внутренняя перелинковка: футер «Популярные направления», event breadcrumbs → CHPU, «Смотрите также» на листингах | Высокий | ✅ 2026-07-23 | агент |
| SEO.13 | SSR JSON-LD: BreadcrumbList (listing+event) + ItemList только на CHPU landings (non-empty) | Высокий | ✅ 2026-07-23 | агент |
| SEO.14 | `/podborki` tag cloud → CHPU landings/intent вместо `/events?q=` | Высокий | ✅ 2026-07-23 (топ-24: 23 CHPU / 1 fallback) | агент |
| SEO.15 | Казань/Екб: падежи + meta-шаблоны listing/hub/event + thin cards (6–7) | Критический | ✅ 2026-07-23 | агент |
| SEO.16 | Ручной переобход TOP-15 в Яндекс.Вебмастер / GSC | Высокий | ⏳ `docs/webmaster-top15-checklist.md`; клики только владелец | **владелец** |
| SEO.17 | Sitemap: intents без thin (&lt; 6); smoke prod index + landings/static | Высокий | ✅ 2026-07-23 @`0fe5140`+prod | агент |
| SEO.18 | План 20-30 путеводителей → CHPU (`docs/seo-guide-articles-plan.md`) | Высокий | ✅ 2026-07-23 batch #1 = 10 Казань/Екб | агент |
| SEO.19 | Batch #1 генерация/размещение 10 гидов (GPT → MD → blog) | Высокий | ⏳ пачка A+МСК/СПб owner rewrite ✅; хаос-календарь ✅; Pack B = новый commercial угол (top5/events), не rewrite 9 longforms | владелец + агент |
| SEO.19a | Blog mid-article плашка `[NOTE]` (`BlogArticleNote`) | Высокий | ✅ 2026-07-23; hotfix nested `[link](url)` in text= | агент |
| SEO.19f | Blog markdown SEO: links/H2/NOTE harden + price accents + tests | Критический | ✅ `4f6cdb3` prod | агент |
| SEO.19b | Batch A: уникальные cover вместо city-placeholder (3 jpg) | Высокий | ✅ 2026-07-23 | агент |
| SEO.19b2 | МСК/СПб: уникальные cover ×6 + magazine `/blog` hero | Высокий | ✅ 2026-07-23 | агент |
| SEO.19b3 | Правило: cover обязателен до PUBLISHED; догенерация missing (bylinnyy ×2) | Критический | ✅ 2026-07-23 | агент |
| SEO.19c | Публикация гидов: хаос-график + микс городов; `publishedAt` schedule filter | Высокий | ✅ 2026-07-23; safety: throttle 1/day только если mass «малоценная» (owner Webmaster/GSC) | агент |
| SEO.19d | Owner anti-AI rewrite 9 гидов + upsert по графику | Высокий | ✅ 2026-07-23; LOCK: повторный rewrite 9 longforms не делаем | владелец + агент |
| SEO.19e | Антиспам: пн-колонки + template_type long/top5/events + safety индекс | Высокий | ✅ LOCK 2026-07-25: 1 колонка/нед; HIDDEN backlog не жечь быстрее | агент |
| SEO.20 | Listing garbage audit: daily scan saleable public events (encoding / stopwords / CAPS / HTML) → Telegram | Высокий | ✅ код `pnpm audit:listings`; ⏳ cron 04:00 на prod (owner) | агент |
| SEO.21 | Tags dictionary monthly sprint: analyzer (>6–8 live events + Wordstat >0) → admin one-click promote query-fallback → CHPU + meta + sitemap (не ad-hoc) | Средний | ⏳ monthly ops | агент + владелец (approve) |
| SEO.10 | Editorial polish SEO-текстов (убрать шаблонный хвост); URL/mapping TOP-15 не трогать | Средний | ⏳ | владелец + агент |
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
| P.2h | Реализация wireframe v2 в `apps/web` (плитки направлений, top-N venues, sights CTA) | Высокий | 🔄 пилот СПб/Мск/Сочи/Казань 2026-07-30 |
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
| L.2 | Images: `next/image` + WebP/AVIF (`SafeImage`), remotePatterns TC/TEP/S3, sharp, hot-path cards/heroes | Высокий | ✅ `9646968`; follow-up: GCS hostname + TEP dirtyAlias placeholder (код в deploy-fix, ждут deploy) |
| L.2b | Prod `/_next/image` 400/504: `googleapis` remotePatterns; TEP без dirtyAlias; cold-cache после UX `33df97f` | Критический | 🔧 код готов, нужен deploy |
| R.4b | Reviews `GET .../events/:publicSlug` 404 на кириллическом DB slug (TEP) | Высокий | 🔧 `resolveReviewEvent` → `evt_tep_{id}` + publicSlugLite |
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
| B.12b | Inline 1-2 в каждую статью (правила + 9 SEO-гидов без body images) | Критический | ✅ 2026-07-24 `@b1b23b5` + upsert |
| B.12c | Blog inline UI: увеличить float + 1-е фото full-width (не thumb 14.5rem) | Высокий | 🔄 UI ready, нужен deploy |
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
| B.28b | Afisha promo: цена/тайтлы/chips по header geo; полоса под 3 первыми статьями фида | Критический | 🚫 owner: афиша должна быть в углу | агент |
| B.28c | Owner fix: swap колонок + rich Афиша в углу под «Свежее» (не mid-feed) | Критический | ✅ `9be0a98` prod @`ab1dc94` | агент |
| B.29 | Pack B GPT brief: 9 гидов + 2 колонки Макса (`blog-content-gpt-briefs.md`) | Высокий | ⏳ brief ✅ 2026-07-27; тексты GPT → owner review → agent publish | владелец + агент |
| B.30 | Pack C: 9 гидов + 2 колонки Макса (1024610) | Высокий | ✅ контент+images; log:upsert prod; slug 404 до publishedAt | владелец + агент |
| B.31 | Blog inline images: подпись (figcaption/alt) скрыта по умолчанию, показ при hover | Средний | ✅ 2026-07-27 `BlogFigure` web+public: `group-hover` + `@media(hover:hover)`, `title`+`alt` на img | агент |

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
| 1.1.4 | Страница `/about` | Низкий | ✅ 2026-07-30 |

### 1.2 Event page

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 1.2.1 | Breadcrumbs: Главная → События → Город? → Title | Высокий | ✅ |
| 1.2.2 | SSR JSON-LD: `Event` + `Offer` | Высокий | ✅ |
| 1.2.3 | SSR JSON-LD: `BreadcrumbList` | Высокий | ✅ |
| 1.2.4 | `generateMetadata` | — | ✅ |
| 1.2.5 | Sticky buy card + TC/TEP widgets | — | ✅ |
| 1.2.6 | Мультисобытие «Варианты билетов» | Средний | ✅ heading + purchaseOptions (≥2) |

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
| 1.3.7 | Развивать city hubs `/cities/{slug}` (контент, перелинковка, landings) | Высокий | ✅ rollout 65 hubs `city-hub-config` (пилот 4 + 61); prod deploy ⏳ |
| 1.3.8 | City-prefix в path venues/events (`/{city}/venues/...`) | — | 🚫 отклонено 2026-07-19 (flat URL) |

### 1.4 Прочие public routes

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 1.4.1 | Venues / locations breadcrumbs | Средний | ✅ UI = `VenueBreadcrumbsNav` + JSON-LD |
| 1.4.2 | `/help` FAQ + JSON-LD | — | ✅ |
| 1.4.3 | Landings JSON-LD (client) | — | ✅ |
| 1.4.4 | Фильтр cross-transport subcategories в карточках | Средний | ✅ `pickCatalogSubcategories` / transport conflict |

---

## Этап 2 — SEO foundation (старт параллельно с 1.2–1.3)

**Цель:** indexable routes в sitemap; structured data в HTML source (не только client).

### 2.1 robots & sitemap

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 2.1.1 | `apps/web/app/robots.ts` (+ `Disallow: /admin/` owner audit 2026-07-25) | Высокий | ✅ 2026-07-19 / fix 2026-07-25 |
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
| 2.2.4 | Venue page LD+JSON | Средний | ✅ `buildVenuePageJsonLd` Place+BreadcrumbList |
| 2.2.5 | Google Rich Results / validator smoke | Низкий | ✅ 2026-07-30 `smoke-rich-results.mjs` + JsonLd вне SiteLayout; MSK View Source Event/FAQ/Place ok |
| 2.2.6 | Root WebSite/Organization JSON-LD + Google favicon PNG (48/96/192) | Высокий | ✅ 2026-07-19 deploy prod |
| 2.2.7 | Favicon fill ~90%: 32/48/96/180/192/512 + site.webmanifest | Высокий | ✅ |
| 2.2.8 | Favicon: Flaticon ticket_1912 → бренд `#4A7FD4`, classic horizontal | Высокий | ✅ 2026-07-19 deploy prod |
| 2.2.9 | Favicon: тот же билет, rotate 45°, fill ~88–90% (32/48/96/180/192/512/ico/svg) | Высокий | ✅ 2026-07-19 deploy prod fc736e1 |
| 2.2.10 | Favicon: зеркало угла `rotate(-45)`, тот же крупный fill (все PNG/ICO/SVG) | Высокий | ✅ 2026-07-19 deploy prod 70bc59f |
| 2.2.11 | Favicon: оптический recenter `translate(1.2 1.2)` после rotate(-45) | Высокий | ✅ 2026-07-19 `c1ccd48` / prod `@7c59f8d` |

### 2.3 Canonical & indexing policy

| # | Задача | Приоритет | Статус |
|---|--------|-----------|--------|
| 2.3.1 | www → non-www (nginx) audit | Средний | ✅ 2026-07-30 `www`→301 `https://daibilet.ru/` |
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
| F5.0 | Карта зависимостей dto.js → Prisma ([f5-retire-dto-map.md](./phases/f5-retire-dto-map.md)) | Высокий | ✅ doc 2026-07-30 |
| F5.1 | Public helpers + catalog datetime/subcategories из TS; grouping в dto (bridge) | Высокий | ✅ 2026-07-30 |
| F5.2 | Landing match single source (`landing-rules.ts`); dto без дубля rules | Высокий | ✅ 2026-07-30 |
| F5.3a | Catalog grouping + city destination helpers в TS (`public-catalog-grouping`, `public-destination`) | Высокий | ✅ 2026-07-30 |
| F5.3b | Venue pages + `publicVenueHubRows` + server.js admin (bridge dto.js) | Средний | ⏳ |

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
| 2026-07-30 | MIG.9 🔒 role lock: `.184` catalog · `.159` battle finance · `.16` retire; phases 9.0–9.7 + checkout DNS |
| 2026-07-30 | MIG.9 ⏳ план (superseded by role lock): СПб 4ГБ→8ГБ; catalog MSK |
| 2026-07-30 | Prod 504 MSK: restart web+nginx; INC.504.1-4 mitigations ⏳ Medium |
| 2026-07-30 | MIG.8 ✅ СПб public/sync off; PERF.E5 event без catalog; SEO-хвост about/crumbs/variants; F5.0 map |
| 2026-07-25 | SEO.20 listing garbage audit: код ✅ (`pnpm audit:listings` + Telegram helper); cron 04:00 на prod ⏳ owner |
| 2026-07-25 | Owner QA close (blog/F4/SEO): SEO.20 daily garbage audit ⏳ High; SEO.21 monthly tag promote ⏳ Medium; SEO.9b phone 🚫 blocked; SEO.9 launch policy ✅ |
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

