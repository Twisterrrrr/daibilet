# Project — Daibilet (Next full-stack migration)

**Обновлено:** 2026-07-23
**Ветка migration / prod:** `feat/next-monorepo`  
**Prod:** Next `apps/web` `:3001` + legacy API `:4000` + Vite admin static

---

## Цель

Миграция public-сайта на **Next.js 15 App Router** в monorepo (`apps/web`) для **SEO через SSR/ISR**. Public cutover (F3) выполнен; admin остаётся на Vite static до F4.

---

## Продуктовые приоритеты (2026-07-22)

Решение владельца: **не рекламировать «пустышку»** — сначала собрать витрину, потом paid acquisition.

| Приоритет | Фокус | Статус |
|-----------|--------|--------|
| 1 | **F4 admin → Next** — перенос admin SPA в Next route group | следующий крупный поток |
| 2 | **Landing matching quality** — правила, аудит выдачи и актуальность событий всех посадок | активный |
| 3 | **AI / статьи и city hubs** — редакционный контент и SEO-якоря | поддерживающий поток |
| — | **Finance contour / ЛК поставщиков** | ⚠️ deferred: продукт ещё не готов |
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

## Архитектура (Path B)

```
apps/web          — Next 15: public SSR/ISR, Route Handlers, client widgets
apps/backend      — legacy API + dto.js (sync/writes, admin API)
apps/admin        — Vite SPA (static на admin.daibilet.ru)
apps/public       — Vite SPA (deprecated после F3)
packages/db       — Prisma schema + client
packages/contracts — Zod/types, catalog constants
packages/config   — shared tsconfig/eslint
```

**Read path:** `@daibilet/backend/public-read` → `public-*.dto.ts` (+ lean catalog list-item). Landing page DTO использует legacy `dto.js` как источник данных и правил. `apps/backend/src/landing-rules.ts` должен оставаться синхронен с `dto.js` до F5.

**Write/sync path:** legacy `server.js` / sync scripts; после sync — `invalidatePublicCaches({ warm: true })` + Next revalidate.

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

**Perf debt:** landings match / public catalog list всё ещё full (or cached) grouped set → filter → slice. Events list — ✅ SQL (0.5.8).

---

## Public catalog (perf rules)

- List DTO lean: без widget URL / полного `upcomingSlots`; slot preview ≤3.
- Slot hydrate только для запрошенной страницы `limit`, не для всего кэша.
- Карточки `/events`: без TC/Teplohod widget markup — виджет только на странице события / landing CTA.
- City/landing SSR: ≤48 lean cards.
- Redirects: `www` → apex; `/river-cruises` → `/rechnye-progulki`.

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
- **Meta (city listing):** `[Категория] в [Городе] [Год] - купить билеты, расписание и цены на Дайбилет` (`seo-listing-meta.ts`).
- **Thin listing:** &lt; 6 офферов → `noindex,follow` (страница доступна, не в индексе).
- **Launch set:** утверждён TOP-15 category×city и intent URL. Для узких направлений действуют ограничения городов: `/progulki-po-krysham/saint-petersburg` и `/zagorodnye-ekskursii/saint-petersburg` не получают московских вариантов. Канонический weekend intent - `/podborki/na-vyhodnye`; старый `na-vyhodnyh` отдаёт permanent redirect.
- **Контакты:** до подключения номера 8-800 публикуются email, ИНН и ОГРНИП, без подставного телефона.
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
| F4 Admin + worker | ⏳ | admin в Next, sync в worker |
| F5 Retire dto.js | ⏳ | parity 100%, server.js removed |

Детали: [phases/phase-f-next-fullstack.md](./phases/phase-f-next-fullstack.md), F3: [phases/phase-f3-cutover-checklist.md](./phases/phase-f3-cutover-checklist.md).

---

## Технологии и стандарты

- **Node** ≥22.13, **pnpm** 11.7 workspaces
- **Next 15**, React 19, Tailwind 3
- **Images:** `next/image` + `sharp` (WebP/AVIF), `SafeImage` wrapper, `remotePatterns` для TC/TEP/S3 CDN
- **Prisma 7** — schema/migrations; runtime read через dto port
- **Консистентность:** parity scripts; константы каталога в `@daibilet/contracts`
- **SEO:** title template `%s | Дайбилет` без дублей; `og:url` route-specific (`seo-meta.ts`); flat entity URLs + city hubs (см. URL / SEO policy выше)
- **Sitemap:** `/sitemap.xml` — index; chunks `/sitemaps/{static,events,cities,venues,landings,blog}.xml` (`lib/sitemap-data.ts`); `robots.txt` → index, Allow `/` для `*` / Googlebot / Yandex
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

---

## Блог / контент-ops

- Карточки: `apps/web/src/data/blog-posts.ts` (+ зеркало в `apps/public`).
- Тексты: `content/blog/*.md` → `npm run blog:sync-bodies` → `blog-article-bodies.ts` (SSR fallback); прод-источник — `Article` через `npm run blog:upsert`.
- ### CPU/RAM (prod 3.8Gi)
- Deploy: один controlled restart (deploy/scripts/deploy-prod-next.sh) — не пачкой.
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

- [Tasktracker.md](./Tasktracker.md) — прогресс задач
- [Diary.md](./Diary.md) — технический дневник
- [content-blog-plan.md](./content-blog-plan.md) — контент-план блога
- [ai-journalists/README.md](./ai-journalists/README.md) — ИИ-колонки / персоны
- [decision-log.md](./decision-log.md) — архитектурные решения
- [current-state.md](./current-state.md) — оперативный статус
