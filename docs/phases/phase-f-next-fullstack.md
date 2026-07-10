# Фаза F — Next.js full-stack monorepo (Path B)

**Дата старта:** 2026-07-10  
**Ветка Cursor:** `integrate/mvp-launch` → `feat/next-monorepo`  
**Ветка Codex:** `codex/phase2-finance-next` (от `feat/next-monorepo` после F1)  
**Статус:** 🔄 Планирование / F1

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
| Lazy load 60 — бот видит мало | SSR **N** карточек (120 default), «ещё» — enhancement |
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
| **Codex** | `codex/phase2-finance-next` | Phase 2: Supplier, Checkout schema, YooKassa *foundation*, admin supplier read — **feature-flagged off** |
| **Prod** | `integrate/mvp-launch` | Стабильный widget MVP до cutover F3 |

Codex **не мержит** в prod до review. Cherry-pick только после parity.

Handoff для Codex: [codex-phase2-next-handoff.md](../codex-phase2-next-handoff.md)

---

## Этапы F

### F1 — Monorepo shell (1–2 нед) 🔄

- [ ] `pnpm-workspace.yaml`, `apps/web` Next 15 + Tailwind
- [ ] Перенос `packages/db` без изменения schema
- [ ] `packages/contracts` — public + admin types из `apps/backend/src/types`
- [ ] Health route, env loader, deploy stub
- [ ] CI: `pnpm build`, typecheck

**Exit:** `apps/web` builds, подключается к staging DB.

### F2 — Public SSR (2–3 нед)

- [ ] **Каталог** `/events` — SSR page 1 (limit=120), facets server-side
- [ ] **Event** `/events/[slug]` — SSR + `generateMetadata`
- [ ] **City** `/cities/[slug]` — SSR
- [ ] **Venue/location** `/venues/[slug]`, `/locations/[slug]` — SSR
- [ ] **Landings** top slugs — SSG или ISR
- [ ] Route Handlers: thin wrapper над Prisma DTO (port from `public-*.dto.ts`)
- [ ] Parity scripts against legacy on staging

**SEO exit:** View Source содержит карточки + title/description без JS.

**Catalog pagination:**
- SSR: page 1 (120 items) в HTML
- «Показать ещё» / `?page=2` — crawlable links, не только JS
- Опционально: selector 60/120/200 — **первая порция всегда в SSR**

### F3 — Cutover public (1 нед)

- [ ] nginx → Next на staging
- [ ] Smoke: widgets, post-deploy, parity
- [ ] Prod cutover public routes
- [ ] Deprecate `apps/public` Vite (archive)

### F4 — Admin + worker (2–3 нед)

- [ ] Admin route group `(admin)` в Next, Basic Auth middleware
- [ ] Port admin pages from Vite
- [ ] Sync jobs → `apps/worker` or Route Handlers + cron
- [ ] Writes still via ported services (Prisma transactions)

### F5 — Retire legacy (2+ нед)

- [ ] `dto.js` read paths deleted, parity 100%
- [ ] `server.js` / `server-entry.ts` removed
- [ ] Flags `DAIBILET_TS_*` removed (single code path)

---

## Phase 2 (Codex) — вне runtime F

Codex готовит в `codex/phase2-finance-next`:

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
