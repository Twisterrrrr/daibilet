# Project — Daibilet (Next full-stack migration)

**Обновлено:** 2026-07-19  
**Ветка migration / prod:** `feat/next-monorepo`  
**Prod:** Next `apps/web` `:3001` + legacy API `:4000` + Vite admin static

---

## Цель

Миграция public-сайта на **Next.js 15 App Router** в monorepo (`apps/web`) для **SEO через SSR/ISR**. Public cutover (F3) выполнен; admin остаётся на Vite static до F4.

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

**Read path:** `@daibilet/backend/public-read` → `public-*.dto.ts` (+ lean catalog list-item).

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
| `/cities`, `/cities/[slug]` | SSR dynamic | lean session embed |
| `/venues`, `/venues/[slug]` | SSR dynamic | |
| `/locations`, `/locations/[slug]` | SSR dynamic | |
| `/podborki` | ISR 3600 | каталог подборок |
| `/rechnye-progulki/...`, `/{city}/night-bridges/` | ISR/SSG | landing SEO paths |
| `/api/public/*` | Route Handlers | parity с legacy API |

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
- **Prisma 7** — schema/migrations; runtime read через dto port
- **Консистентность:** parity scripts; константы каталога в `@daibilet/contracts`
- **SEO:** title template `%s | Дайбилет` без дублей; `og:url` route-specific (`seo-meta.ts`)
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

## Блог / контент-ops

- Карточки: `apps/web/src/data/blog-posts.ts` (+ зеркало в `apps/public`).
- Тексты: `content/blog/*.md` → `npm run blog:sync-bodies` → `blog-article-bodies.ts` (SSR fallback); прод-источник — `Article` через `npm run blog:upsert`.
- ### CPU/RAM (prod 3.8Gi)
- Deploy: один controlled restart (deploy/scripts/deploy-prod-next.sh) — не пачкой.
- TEP **каталог**: предпочтительно out-of-process deploy/cron/tep-catalog-sync.sh / daibilet-tep-catalog-sync.timer; in-process TEP_AUTO_SYNC_ENABLED=0 на prod.
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
