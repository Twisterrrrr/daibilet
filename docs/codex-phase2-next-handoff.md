# Codex handoff — Phase 2 finance в Next full-stack monorepo

**Дата:** 2026-07-10  
**Для:** Codex / Daibilet Local  
**Базовая ветка:** `feat/next-monorepo` (после F1 shell от Cursor)  
**Целевая ветка Codex:** `codex/phase2-finance-next`

---

## Контекст

Cursor идёт по **Path B**: Next.js full-stack monorepo + Prisma (`docs/phases/phase-f-next-fullstack.md`).

**Твоя задача** — подготовить **Phase 2 foundation (финконтур + ЛК поставщика)** в **новой структуре monorepo**, не ломая widget MVP и не включая платежи в runtime.

Старая ветка `codex/phase2-foundation` — **reference only** (unrelated git history). Переноси идеи cherry-pick, не merge wholesale.

---

## Что сделать

### 1. Monorepo alignment

После появления `feat/next-monorepo`:

```
apps/web/                    # Next — не трогать public routes Cursor
packages/db/prisma/          # additive migrations Phase 2
packages/contracts/          # supplier, checkout, order types + Zod
apps/web/app/api/admin/      # read-only admin routes (optional slice)
```

**Package manager:** pnpm (как в твоём foundation doc).

### 2. Prisma schema (Phase 2 models)

Заложить модели из `docs/marketplace-phase-foundation.md` / твоего blueprint:

- `Supplier`, `SupplierUser`, `SupplierVenue`, `SupplierEvent`
- `SupplierCommissionRule`, `SupplierLegalProfile`, `SupplierBankAccount`
- `SupplierLedgerEntry`, `SupplierReport`, `SupplierSettlement`
- `CheckoutOrder`, `CheckoutItem`, `Payment`, `FiscalReceipt`
- `RefundRequest`, `PaymentEventLog`, `IdempotencyKey`

**Правила:**

- Migrations **только additive**
- Не удалять/не переименовывать MVP models (Event, ExternalOrder, …)
- `CheckoutOrder` ≠ `ExternalOrder` — разные контуры

### 3. Admin read (без mock)

- `GET /api/admin/suppliers` — list
- `GET /api/admin/suppliers/[id]` — detail
- DTO через Prisma, **не** fallback mock data
- Parity test vs fixture DB (может быть 0 rows)

### 4. Документация

- `docs/phase-2-finance-supplier-blueprint.md` — актуализировать под Next structure
- `packages/db/README.md` — как деплоить migrations на staging DB `5438`

### 5. Tests

- Unit tests для Zod contracts
- Integration smoke: `supplier.findMany()` на empty DB

---

## Что НЕ делать

| Запрещено | Почему |
|-----------|--------|
| YooKassa API / webhooks в runtime | Phase G, не сейчас |
| Checkout UI / «Купить через Daibilet» | Widget MVP |
| Включать Phase 2 routes на prod | Feature flag `DAIBILET_PHASE2=0` |
| Merge в `integrate/mvp-launch` без review | Parallel work |
| Переписывать public catalog/event Cursor | Conflict F2 |
| pnpm migrate prod до F1 complete | Deploy risk |

---

## Feature flags (задел)

```env
# .env.example — все выключены по умолчанию
DAIBILET_PHASE2_SUPPLIERS=0
DAIBILET_PHASE2_CHECKOUT=0
DAIBILET_YOOKASSA_ENABLED=0
```

Route handlers проверяют flag → 404 если off.

---

## Git workflow

```bash
git fetch origin feat/next-monorepo
git checkout -b codex/phase2-finance-next origin/feat/next-monorepo
# work...
git push -u origin codex/phase2-finance-next
```

**Weekly:** rebase на `feat/next-monorepo`.  
**PR в `feat/next-monorepo`:** только после F1 merge + CI green + Cursor review.

---

## Reference (твои прошлые артефакты)

Cherry-pick ideas from `origin/codex/phase2-foundation`:

- `packages/contracts/src/*`
- `admin-dashboard.dto.ts`, `admin-sources.dto.ts` patterns
- `docs/phase-2-finance-supplier-blueprint.md`
- `event-change-request-*.ts` (optional, lower priority)

**Не cherry-pick:** unrelated history, wholesale pnpm lock replace on `integrate/mvp-launch`.

---

## Exit criteria Codex

- [ ] Phase 2 migrations apply clean on `daibilet_staging` (5438)
- [ ] `packages/contracts` exports supplier + checkout types
- [ ] Admin suppliers read routes behind flag
- [ ] Zero YooKassa network calls in codebase
- [ ] README + blueprint updated
- [ ] CI: typecheck + test green on `codex/phase2-finance-next`

---

## Контакт / sync

Cursor владеет: F1 shell, public SSR, prod cutover.  
Codex владеет: Phase 2 schema + supplier admin read foundation.  
Sync point: **после F1** — согласовать `packages/contracts` export map.

См. также [cursor-handoff-prompt.md](./cursor-handoff-prompt.md) (Codex branch) для widget-first правил.
