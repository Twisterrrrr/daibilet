# Фаза F — Next.js full-stack monorepo (Path B)

**Дата старта:** 2026-07-10  
**Ветка Cursor:** `integrate/mvp-launch` → `feat/next-monorepo`  
**Ветка Codex:** `codex/phase2-foundation` (Phase 2 backend; **не** merge Next/proxy)  
**Статус:** ✅ F2 done → **F3** cutover (`feat/next-monorepo`)

**F2 read path:** Prisma напрямую в Server Components и Route Handlers (full-stack), без proxy fetch к legacy backend.

---

## Решение

Переходим на **Path B** из [audit-2026-07-10-stack-state.md](../audit-2026-07-10-stack-state.md):

- **Next.js App Router** — public + admin в одном `apps/web`
- **Route Handlers** вместо отдельного `server.js` для read API
- **`packages/db` + `packages/contracts`** — Prisma + shared Zod/types
- **Постепенный вывод `dto.js`** — parity slice за slice
- **SEO — не откладываем:** indexable страницы только через SSR/SSG, не CSR-only

**Codex** параллельно готовит **Phase 2 финконтур** (schema + read/admin foundation) в целевой структуре monorepo — **без включения в prod runtime** до отдельного флага.

---

## Почему сейчас (SEO)

| Проблема SPA (Vite CSR) | Решение Next |
|-------------------------|--------------|
| `/events` — контент после JS + fetch | SSR первой страницы каталога в HTML |
| `/events/:slug`, `/cities/*`, `/venues/*` — meta в client | `generateMetadata` + server fetch |
| Lazy load 60 — бот видит мало | SSR **100** карточек (default), selector **100/200/300**, «ещё» — enhancement |
| Нет crawlable pagination | URL `?page=` / `<link rel="next">` |

**Правило:** всё с `index,follow` рендерится на сервере. Client-only — только buyer account, admin auth flows.

---

## Целевая структура monorepo

```
daibilet/
├── apps/
│   ├── web/                 # Next.js 15 — public + admin + API routes
│   └── worker/              # (F4+) TC/TEP sync, cron — вынести из dto.js
├── packages/
│   ├── db/                  # Prisma schema, migrations, client (existing)
│   ├── contracts/           # Zod + TS types (public, admin, order, supplier)
│   └── config/              # eslint, tsconfig bases
├── deploy/                  # systemd → next start, staging/prod
└── docs/
```

**Package manager:** pnpm workspaces (как в Codex foundation, но migrate с npm постепенно).

---

## Разделение команд

| Кто | Ветка | Scope |
|-----|-------|-------|
| **Cursor** | `feat/next-monorepo` | F1–F4: Next shell, public SSR, Prisma read, deploy, parity |
| **Codex** | `codex/phase2-foundation` | Phase 2 schema, event change requests, supplier foundation — cherry-pick **после F3**, без Codex Next/proxy |
| **Prod** | `integrate/mvp-launch` | Стабильный widget MVP до cutover F3 |

Codex **не мержит** в prod до review. Cherry-pick только после parity.

Handoff для Codex: [codex-phase2-next-handoff.md](../codex-phase2-next-handoff.md)

---

## Этапы F

### F1 — Monorepo shell (1–2 нед) 🔄

- [x] `pnpm-workspace.yaml`, `apps/web` Next 15
- [x] `packages/contracts`, `packages/config` (from Codex reference)
- [x] `packages/db` exports для workspace import
- [x] Health route `/api/health`, root `.env` loader
- [x] Deploy stub `deploy/scripts/start-web.sh`
- [x] CI: `pnpm build`, typecheck on `feat/next-monorepo`

**Exit:** `apps/web` builds, подключается к staging DB.

### F2 — Public SSR (2–3 нед) ✅

- [x] **Каталог** `/events` — SSR page 1 (limit=100), crawlable `?page=`
- [x] **Event** `/events/[slug]` — SSR + `generateMetadata`
- [x] **City** `/cities/[slug]` — SSR + `/cities` index
- [x] **Venue/location** `/venues/[slug]`, `/locations/[slug]` — SSR + indexes
- [x] **Landings** `/podborki`, SEO paths — ISR (`revalidate=3600`) + top slugs SSG
- [x] Route Handlers `/api/public/events|events/[slug]|cities/[slug]|venues/[slug]|landings/*`
- [x] Prisma read via `@daibilet/backend/public-read` (no HTTP proxy)
- [x] **Catalog filters SSR** — city, date, sort, q (GET form)
- [x] **Widgets** — TC/Teplohod client enhancement на event page
- [x] Parity: `pnpm backend:next:parity` (+ optional HTTP staging compare)

**SEO exit:** View Source содержит карточки + title/description без JS.

**Catalog pagination:**
- SSR: page 1 (**100** items default) в HTML
- «Показать ещё» / `?page=2` — crawlable links, не только JS
- Selector **100 / 200 / 300** — **первая SSR-порция всегда 100** (default)

### F3 — Cutover public (1 нед) 🔄

См. [phase-f3-cutover-checklist.md](./phase-f3-cutover-checklist.md)

- [x] Deploy artifacts: `deploy-staging-next.sh`, systemd, nginx snippet, smoke script
- [ ] Staging deploy + smoke on server
- [ ] Prod cutover + rollback plan
- [ ] Post-F3: Codex cherry-pick ([plan](../codex-cherry-pick-plan.md))

### F4 — Admin + worker (2–3 нед) 🔄

- [x] Admin route group `(admin)` в Next, Basic Auth middleware (kickoff `/admin` stub)
- [x] Port Dashboard live metrics (`/api/admin/dashboard` + sources + orders)
- [x] Port Events / Landings lists + Articles CRUD (F4.1a); Vite for event override / landing matches
- [x] Port Sources + sync triggers + read-only Settings (F4.1b)
- [x] Cutover admin.daibilet.ru → Next; Vite deep CRUD at `/legacy` (F4.1c)
- [x] Port Events override/moderation/SEO + Landings SEO/matches (F4.3)
- [ ] Remaining `/legacy` screens (taxonomy, Orders, Venues/Cities) / retire Vite (F4.4)
- [ ] Writes still via ported services (Prisma transactions)

### F5 — Retire legacy (2+ нед)

- [ ] `dto.js` read paths deleted, parity 100%
- [ ] `server.js` / `server-entry.ts` removed
- [ ] Flags `DAIBILET_TS_*` removed (single code path)

---

## Phase 2 (Codex) — вне runtime F

Codex продолжает в `codex/phase2-foundation`; интеграция в Cursor — [codex-cherry-pick-plan.md](../codex-cherry-pick-plan.md) **после F3**.

- Prisma models: Supplier, CheckoutOrder, Payment, FiscalReceipt, …
- Migrations **additive only**
- Admin read: suppliers list, supplier detail (mock-free)
- **NO** YooKassa API calls, **NO** checkout UI, **NO** prod flags

Включение Phase 2 — отдельная **Phase G** после F5.

---

## Риски

| Риск | Mitigation |
|------|------------|
| Big-bang deploy | Staging first, public-only cutover F3 |
| dto.js regression | Parity scripts обязательны на каждый slice |
| Codex merge conflict | Отдельная ветка, rebase на F1 weekly |
| Sync downtime | worker отдельно от web process |
| SEO regression | Lighthouse + Google Search Console + manual View Source |

---

## Команды (целевые)

```bash
pnpm install
pnpm --filter @daibilet/web dev
pnpm --filter @daibilet/db db:deploy
pnpm check:parity          # сохраняем до F5
```

---

## Связанные документы

- [audit-2026-07-10-stack-state.md](../audit-2026-07-10-stack-state.md)
- [codex-phase2-next-handoff.md](../codex-phase2-next-handoff.md)
- [phase-e-prisma-runtime.md](./phase-e-prisma-runtime.md)
