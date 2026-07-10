# Текущее состояние Daibilet

Дата: **2026-07-10** (фаза E закрыта → старт F Path B)  
Ветка prod: **`integrate/mvp-launch`**  
Ветка migration: **`feat/next-monorepo`** (создаётся в F1)

> **Стратегия:** [phase-f-next-fullstack.md](./phases/phase-f-next-fullstack.md) — Next full-stack + SSR для SEO.  
> **Codex:** [codex-phase2-next-handoff.md](./codex-phase2-next-handoff.md) — Phase 2 finance foundation в новом monorepo.

## Фазы A–F

| Фаза | Статус | Документ |
|------|--------|----------|
| A–E | ✅ | [phases/README.md](./phases/README.md) |
| **F** — Next monorepo + SSR | 🔄 F1 | [phase-f-next-fullstack.md](./phases/phase-f-next-fullstack.md) |
| **G** — Phase 2 finance runtime | ⏳ | [codex-phase2-next-handoff.md](./codex-phase2-next-handoff.md) |

## Prod (widget MVP — до cutover F3)

- API: `start:ts`, все `DAIBILET_TS_*=1`
- Frontend: **Vite SPA** (временно, до F3)
- DB prod: `5437/daibilet` · staging: `5438/daibilet_staging`

## SEO (мотивация F)

CSR-каталог и lazy load **не подходят** для индексации. F2: SSR page 1 каталога (120), event/city/venue `generateMetadata`.

## Deploy

```bash
# Текущий prod (до Next cutover)
./deploy/scripts/deploy-from-git.sh

# Staging DB refresh
STAGING_POSTGRES_PASSWORD=... bash deploy/scripts/restore-staging-db.sh
```

## Ops backlog

- [ ] F1: `apps/web` Next shell + pnpm
- [ ] F2: public SSR routes + parity
- [ ] `tc:sync` widgetUrl backfill на prod
- [ ] Codex: `codex/phase2-finance-next` от F1

## Документы

- [audit-2026-07-10-stack-state.md](./audit-2026-07-10-stack-state.md)
- [codex-phase2-next-handoff.md](./codex-phase2-next-handoff.md)
