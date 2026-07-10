# Cherry-pick plan: Codex → feat/next-monorepo

**Статус:** ⏳ после F3 cutover  
**Источник:** `origin/codex/phase2-foundation` @ `229ad3b`  
**Цель:** Phase 2 schema + event change requests + admin contracts **без** Codex Next/proxy

---

## Предусловия

- [ ] F3 staging smoke green (`deploy/scripts/deploy-staging-next.sh`)
- [ ] `feat/next-monorepo` = prod/staging public canonical
- [ ] Backup staging DB `5438`

---

## Порядок cherry-pick

### 1. Schema + migrations

| Commit | Описание | Риск |
|--------|----------|------|
| `8cf79b8` (partial) | schema.prisma + migrations Phase 2 | **Высокий** — ручной merge diff, не blind cherry-pick |
| — | `20260709223000_phase2_commerce_supplier_contracts` | additive |
| — | `20260710110000_phase2_event_management_buyer_account` | additive |

**Verify:** `pnpm db:deploy`, `pnpm db:smoke`, `pnpm web:build`.

### 2. Admin contracts

| Файл | Из Codex |
|------|----------|
| `packages/contracts/src/admin.ts` | merge diff, export map |
| `packages/contracts/src/index.ts` | re-exports |

### 3. Event Change Requests (backend)

| Commit | Файлы |
|--------|-------|
| `a6beaef` | `event-change-request-applier.ts`, handler, tests |
| `6f88fb7` | `admin-event-change-requests.dto.ts`, queue handler |
| `e9f612d` | detail diff |
| earlier in `8cf79b8` | `event-change-request-payload.ts`, `event-change-request-state.ts` |

**Verify:** `pnpm backend:test:ts`, flag `DAIBILET_EVENT_CHANGE_REQUESTS=0` default.

### 4. Admin UI

| Commit | Файлы |
|--------|-------|
| `6f88fb7` | `EventChangeRequestsPage.tsx`, navigation |

Admin остаётся Vite до F4; page за feature flag / nav hidden.

### 5. Docs (reference copy)

- `docs/phase-2-finance-supplier-blueprint.md`
- `docs/spbboats-next-prisma-extraction.md`

---

## Explicitly skip

- `5b18225` — Next in `apps/public` + proxy
- `0eb24e4` — admin lazy load (optional later)
- `docs/fullstack-next-prisma-roadmap.md` Path A — superseded by Path B

---

## Rollback

```bash
git revert <cherry-pick-sha>   # per slice
pnpm db:migrate                # if migration rolled back manually
systemctl restart daibilet-api-staging daibilet-web-staging
```

---

## Tracking

Обновлять [Tasktracker.md](./Tasktracker.md) § Codex integration после каждого slice.
