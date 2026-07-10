# Текущее состояние Daibilet

Дата: **2026-07-10** (F2 ✅ → старт F3 cutover)  
Ветка prod: **`integrate/mvp-launch`**  
Ветка migration: **`feat/next-monorepo`**

> **Стратегия:** [phase-f-next-fullstack.md](./phases/phase-f-next-fullstack.md) — Next full-stack + SSR для SEO.  
> **Codex:** [codex-phase2-next-handoff.md](./codex-phase2-next-handoff.md) — Phase 2 finance foundation в новом monorepo.

## Фазы A–F

| Фаза | Статус | Документ |
|------|--------|----------|
| A–E | ✅ | [phases/README.md](./phases/README.md) |
| **F** — Next monorepo + SSR | ✅ F2 / 🔄 F3 | [phase-f-next-fullstack.md](./phases/phase-f-next-fullstack.md) |
| **G** — Phase 2 finance runtime | ⏳ | [codex-phase2-next-handoff.md](./codex-phase2-next-handoff.md) |

## Next (`feat/next-monorepo`) — F3 staging ✅ / prod ⏳

- **Staging:** https://staging.daibilet.ru — Next `:3000`, API `:4001`, SSR smoke OK
- Deploy: `deploy-staging-next.sh`, `pnpm launch:staging-smoke-next`
- **Prod cutover** — следующий шаг

## Codex (`codex/phase2-foundation`)

- Phase 2 schema (~66 models), event change requests, admin queue
- **Не интегрировать** Next/proxy из Codex — cherry-pick **после F3**
- План: [codex-cherry-pick-plan.md](./codex-cherry-pick-plan.md)

## Prod (widget MVP — до cutover F3)

- Frontend: **Vite SPA** (временно)
- DB prod: `5437/daibilet` · staging: `5438/daibilet_staging`

## SEO (мотивация F)

CSR-каталог и lazy load **не подходят** для индексации. F2: SSR page 1 каталога (**100**, selector 100/200/300), event/city/venue `generateMetadata`.

## Deploy

```bash
# Текущий prod (до Next cutover)
./deploy/scripts/deploy-from-git.sh

# Staging DB refresh
STAGING_POSTGRES_PASSWORD=... bash deploy/scripts/restore-staging-db.sh
```

## Ops backlog

- [ ] F3: staging deploy + smoke ([checklist](./phases/phase-f3-cutover-checklist.md))
- [ ] Post-F3: cherry-pick Codex Phase 2 schema + event change requests
- [ ] `tc:sync` widgetUrl backfill на prod

## Документы

- [audit-2026-07-10-stack-state.md](./audit-2026-07-10-stack-state.md)
- [codex-phase2-next-handoff.md](./codex-phase2-next-handoff.md)
