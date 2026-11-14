# Codex ↔ Cursor — Phase 2 finance и split веток

**Обновлено:** 2026-07-10  
**Cursor (public Next):** `feat/next-monorepo` → **`apps/web`** (Path B, full-stack read)  
**Codex (Phase 2 + admin):** **`codex/phase2-foundation`** (фактическая ветка на GitHub)

> ⚠️ Ветки **`codex/phase2-finance-next` на remote нет**. Handoff изначально предполагал rebase Codex на `feat/next-monorepo`; Codex продолжил работу в **`codex/phase2-foundation`** с **unrelated git history** — wholesale merge **запрещён**.

---

## Фактическое состояние (2026-07-10)

| | Cursor `feat/next-monorepo` | Codex `codex/phase2-foundation` |
|---|---------------------------|--------------------------------|
| **Tip** | `fec7ff5` F2 complete | `229ad3b` SPBBOATS doc + Next-in-public |
| **Next app** | `apps/web` — SSR/ISR, Prisma read | `apps/public` — Next catch-all **+ SPA inside** |
| **Public API** | Route Handlers, `@daibilet/backend/public-read` | **Proxy bridge** → legacy `:4000` |
| **Prisma models** | ~29 | **~66** (+ Phase 2 migrations) |
| **Merge base** | — | **нет** с `feat/next-monorepo` |

### Что сделал Codex (ценное для cherry-pick)

- Prisma migrations: `phase2_commerce_supplier_contracts`, `phase2_event_management_buyer_account`
- `docs/phase-2-finance-supplier-blueprint.md`, `docs/spbboats-next-prisma-extraction.md`
- **Event Change Requests:** backend handlers, applier, admin queue UI (`a6beaef`…`e9f612d`)
- `packages/contracts/src/admin.ts` (расширенные admin types)
- Typed admin dashboard/sources DTO (`8cf79b8`)

### Что из Codex **не мержить**

| Артефакт | Причина |
|----------|---------|
| Next в `apps/public` + `backend-proxy.ts` | Конфликт с canonical **`apps/web`** |
| `app/[[...path]]/page.tsx` SPA-in-Next | Path A (bridge), не Path B |
| Wholesale lockfile / unrelated history | Риск регрессии MVP |

**Canonical public Next:** только **`apps/web`** на `feat/next-monorepo`.

---

## План интеграции Codex → Cursor

**Когда:** после **F3 cutover** (staging smoke green, prod public на Next).

**Как:** cherry-pick / ручной port по файлам, **не** `git merge codex/phase2-foundation`.

### Slice 1 — Schema (Критический, после F3)

```
packages/db/prisma/migrations/20260709223000_phase2_commerce_supplier_contracts/
packages/db/prisma/migrations/20260710110000_phase2_event_management_buyer_account/
packages/db/prisma/schema.prisma  # additive diff only
packages/db/README.md
```

Проверка: `pnpm db:deploy` на staging `5438`, `pnpm db:smoke`.

### Slice 2 — Event Change Requests (Высокий)

```
apps/backend/src/event-change-request-*.ts
apps/backend/src/admin-event-change-requests-*.ts
apps/admin/src/pages/EventChangeRequestsPage.tsx
apps/admin/src/config/navigation.ts  # nav entry
packages/contracts/src/admin.ts      # merge types, не replace wholesale
```

Feature flag: routes off until admin review (`DAIBILET_EVENT_CHANGE_REQUESTS=0`).

### Slice 3 — Admin contracts & docs (Средний)

```
docs/phase-2-finance-supplier-blueprint.md
docs/spbboats-next-prisma-extraction.md  # reference
```

### Slice 4 — Phase G only (позже)

- Supplier admin read routes
- Checkout/YooKassa runtime
- `DAIBILET_PHASE2_*` flags

---

## Роли после синхронизации

| Кто | Владеет |
|-----|---------|
| **Cursor** | `apps/web` public SSR, F3–F5 cutover, nginx/systemd |
| **Codex** | Phase 2 schema, supplier/checkout **foundation**, event change workflow |
| **Shared** | `packages/db` migrations (additive), `packages/contracts` (review both sides) |

Codex **может** продолжать Phase 2 backend/admin в `codex/phase2-foundation`, но **не** трогает `apps/web` public routes.

---

## Git workflow (актуальный)

### Codex — продолжение работы

```bash
git fetch origin codex/phase2-foundation
git checkout codex/phase2-foundation
# work on backend/admin/schema only — NOT apps/web
git push origin codex/phase2-foundation
```

### Cursor — cherry-pick после F3

```bash
git checkout feat/next-monorepo
git fetch origin codex/phase2-foundation

# Пример: один коммит schema (проверить конфликты!)
git cherry-pick a6beaef   # event change applier — после schema slice
git cherry-pick 6f88fb7   # admin queue
# … по одному, CI после каждого

pnpm db:deploy && pnpm backend:test:ts && pnpm web:build
```

**Не делать:** `git merge origin/codex/phase2-foundation`.

---

## Feature flags (задел)

```env
DAIBILET_PHASE2_SUPPLIERS=0
DAIBILET_PHASE2_CHECKOUT=0
DAIBILET_YOOKASSA_ENABLED=0
DAIBILET_EVENT_CHANGE_REQUESTS=0
```

---

## Exit criteria интеграции (post-F3)

- [ ] Phase 2 migrations apply на staging `5438` без конфликта с F2 schema
- [ ] Event change requests: backend tests green, admin page behind flag
- [ ] `apps/web` public routes **без изменений** после cherry-pick
- [ ] Codex Next/proxy **не** в `feat/next-monorepo`
- [ ] `docs/decision-log.md` + Tasktracker обновлены

---

## Связанные документы

- [phase-f-next-fullstack.md](./phases/phase-f-next-fullstack.md) — Path B
- [phase-f3-cutover-checklist.md](./phases/phase-f3-cutover-checklist.md) — cutover до cherry-pick
- [codex-cherry-pick-plan.md](./codex-cherry-pick-plan.md) — детальный чеклист коммитов
- [Project.md](./Project.md), [Tasktracker.md](./Tasktracker.md)
