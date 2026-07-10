# Фазы: виджеты, данные, импорт

План работ после checkpoint MVP launch (2026-07-10).  
Каждая фаза завершается **отчётом**, **обновлением docs** и **отдельным коммитом**.

| Фаза | Фокус | Статус | Отчёт |
|------|-------|--------|-------|
| **A** | Цепочка данные → виджет (API + эталоны) | ✅ Закрыта | [phase-a-widget-readiness.md](./phase-a-widget-readiness.md) |
| **B** | Импорт sync → БД (TC + TEP, ProviderLink) | ✅ Закрыта | [phase-b-import-sync.md](./phase-b-import-sync.md) |
| **C** | Целостность данных (инварианты, guards) | ✅ Закрыта | [phase-c-data-integrity.md](./phase-c-data-integrity.md) |
| **D** | Deploy / parity / CI | ✅ Закрыта | [phase-d-deploy-parity.md](./phase-d-deploy-parity.md) |
| **E** | Prisma runtime rollout (TS flags → staging → prod) | 🔄 В работе | [phase-e-prisma-runtime.md](./phase-e-prisma-runtime.md) |

## Команды

```bash
# После deploy
npm run check:post-deploy
npm run check:sync-invariants
npm run check:widgets

# Parity (staging + DATABASE_URL)
npm run check:parity
```
