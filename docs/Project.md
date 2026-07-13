# Project — Daibilet (Next full-stack migration)

**Обновлено:** 2026-07-14  
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
| `GET /api/admin/dashboard` | Только `generatedAt` + `metrics` (grouped catalog, не raw Event) |
| `GET /api/admin/{events,venues,cities,buyers,orders,landings}` | `page/limit/q` → `{ page, pages, limit, total, rows }` |
| `GET /api/admin/landings/:slug` | Пагинация событий: `page/limit/q` + `events[]` текущей страницы |

**Perf debt:** events/landings match всё ещё full grouped catalog → filter → slice (см. Tasktracker 0.5.8).

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

Env для widgets: `NEXT_PUBLIC_TC_WIDGET_TOKEN`, `NEXT_PUBLIC_TEP_WIDGET_ID`.

---

## Связанные документы

- [Tasktracker.md](./Tasktracker.md) — прогресс задач
- [Diary.md](./Diary.md) — технический дневник
- [decision-log.md](./decision-log.md) — архитектурные решения
- [current-state.md](./current-state.md) — оперативный статус
