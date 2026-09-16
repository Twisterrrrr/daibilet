# Фазы: виджеты, данные, импорт

План работ после checkpoint MVP launch (2026-07-10).  
Каждая фаза завершается **отчётом**, **обновлением docs** и **отдельным коммитом**.

| Фаза | Фокус | Статус | Отчёт |
|------|-------|--------|-------|
| **A** | Цепочка данные → виджет (API + эталоны) | ✅ Закрыта | [phase-a-widget-readiness.md](./phase-a-widget-readiness.md) |
| **B** | Импорт sync → БД (TC + TEP, ProviderLink) | ✅ Закрыта | [phase-b-import-sync.md](./phase-b-import-sync.md) |
| **C** | Целостность данных (инварианты, guards) | ✅ Закрыта | [phase-c-data-integrity.md](./phase-c-data-integrity.md) |
| **D** | Deploy / parity / CI | ✅ Закрыта | [phase-d-deploy-parity.md](./phase-d-deploy-parity.md) |
| **E** | Prisma runtime rollout (TS flags → staging → prod) | ✅ Закрыта | [phase-e-prisma-runtime.md](./phase-e-prisma-runtime.md) |
| **F** | Next.js full-stack monorepo (Path B, SEO SSR) | ✅ F2 / 🔄 F3 | [phase-f-next-fullstack.md](./phase-f-next-fullstack.md) |
| **G** | Phase 2 finance runtime (Codex + flags) | ⏳ После F | [codex-phase2-next-handoff.md](../codex-phase2-next-handoff.md) |

**Аудит стека (2026-07-10):** [audit-2026-07-10-stack-state.md](../audit-2026-07-10-stack-state.md)  
**Решение 2026-07-10:** Path B утверждён — SEO через Next SSR, Codex → Phase 2 foundation.

## Команды

```bash
# После deploy
npm run check:post-deploy
npm run check:sync-invariants
npm run check:widgets

# Parity (staging + DATABASE_URL)
npm run check:parity
```
