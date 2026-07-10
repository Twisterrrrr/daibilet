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

## Next (`feat/next-monorepo`) — готов к F3 cutover

- `apps/web`: SSR catalog/event/city/venue, **landings ISR**, **catalog filters**, **TC/Teplohod widgets**
- Parity: `pnpm backend:next:parity`
- Build: `pnpm web:build` ✅

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

- [ ] F3: staging nginx → Next, smoke, prod cutover ([checklist](./phases/phase-f3-cutover-checklist.md))
- [ ] `tc:sync` widgetUrl backfill на prod
- [ ] Codex: `codex/phase2-finance-next` от F1

## Документы

- [audit-2026-07-10-stack-state.md](./audit-2026-07-10-stack-state.md)
- [codex-phase2-next-handoff.md](./codex-phase2-next-handoff.md)
