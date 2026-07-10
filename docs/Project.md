# Project — Daibilet (Next full-stack migration)

**Обновлено:** 2026-07-10  
**Ветка migration:** `feat/next-monorepo`  
**Prod (до F3):** `integrate/mvp-launch` + Vite SPA

---

## Цель

Миграция public-сайта на **Next.js 15 App Router** в monorepo (`apps/web`) для **SEO через SSR/ISR**, без proxy к legacy API на read path. Prod MVP (виджеты TC/Teplohod) остаётся на Vite до cutover **F3**.

---

## Архитектура (Path B)

```
apps/web          — Next 15: public SSR/ISR, Route Handlers, client widgets
apps/backend      — legacy API + dto.js (sync/writes, admin до F4/F5)
apps/public       — Vite SPA (deprecated после F3)
packages/db       — Prisma schema + client
packages/contracts — Zod/types, catalog constants (100/200/300)
packages/config   — shared tsconfig/eslint
```

**Read path (F2):** `@daibilet/backend/public-read` → `public-*.dto.ts` → `dto.js` (refactor в F5).

**Write/sync path:** legacy `server.js` / sync scripts без изменений до F4.

---

## Public routes (Next)

| Route | Рендер | Примечание |
|-------|--------|------------|
| `/` | SSR dynamic | home + top cities |
| `/events` | SSR dynamic | каталог, filters GET, pagination |
| `/events/[slug]` | SSR dynamic | event + PurchaseWidget (client) |
| `/cities`, `/cities/[slug]` | SSR dynamic | |
| `/venues`, `/venues/[slug]` | SSR dynamic | |
| `/locations`, `/locations/[slug]` | SSR dynamic | |
| `/podborki` | ISR 3600 | каталог подборок |
| `/rechnye-progulki/...`, `/{city}/night-bridges/` | ISR/SSG | landing SEO paths |
| `/api/public/*` | Route Handlers | parity с legacy API |

---

## Codex integration (post-F3)

Cherry-pick из **`codex/phase2-foundation`**: schema, event change requests, admin contracts.  
**Не мержить** Codex Next/proxy — canonical **`apps/web`**.

См. [codex-phase2-next-handoff.md](./docs/codex-phase2-next-handoff.md), [codex-cherry-pick-plan.md](./docs/codex-cherry-pick-plan.md).

---

## Этапы F

| Этап | Статус | Exit criteria |
|------|--------|---------------|
| F1 Monorepo shell | ✅ | `pnpm web:build`, health route |
| F2 Public SSR | ✅ | View Source без JS, parity scripts |
| F3 Cutover | 🔄 | nginx → Next staging/prod |
| F4 Admin + worker | ⏳ | admin в Next, sync в worker |
| F5 Retire dto.js | ⏳ | parity 100%, server.js removed |

Детали: [phases/phase-f-next-fullstack.md](./phases/phase-f-next-fullstack.md), F3: [phases/phase-f3-cutover-checklist.md](./phases/phase-f3-cutover-checklist.md).

---

## Технологии и стандарты

- **Node** ≥22.13, **pnpm** 11.7 workspaces
- **Next 15**, React 19, Tailwind 3
- **Prisma 7** — schema/migrations; runtime read через dto port
- **Консистентность:** parity scripts обязательны на каждый slice; константы каталога в `@daibilet/contracts`
- **SEO:** indexable pages только SSR/SSG; client-only — buyer account, widgets

---

## Команды

```bash
pnpm install
pnpm web:dev              # :3000
pnpm web:build
pnpm backend:next:parity  # DTO + optional HTTP staging compare
pnpm backend:catalog:parity
```

Env для widgets: `NEXT_PUBLIC_TC_WIDGET_TOKEN`, `NEXT_PUBLIC_TEP_WIDGET_ID`.

---

## Связанные документы

- [Tasktracker.md](./Tasktracker.md) — прогресс задач
- [Diary.md](./Diary.md) — технический дневник
- [decision-log.md](./decision-log.md) — архитектурные решения
- [current-state.md](./current-state.md) — оперативный статус
