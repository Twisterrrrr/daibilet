# Фазы: виджеты, данные, импорт

План работ после checkpoint MVP launch (2026-07-10).  
Каждая фаза завершается **отчётом**, **обновлением docs** и **отдельным коммитом**.

| Фаза | Фокус | Статус | Отчёт |
|------|-------|--------|-------|
| **A** | Цепочка данные → виджет (API + эталоны) | ✅ Закрыта | [phase-a-widget-readiness.md](./phase-a-widget-readiness.md) |
| **B** | Импорт sync → БД (TC + TEP, ProviderLink) | ✅ Закрыта | [phase-b-import-sync.md](./phase-b-import-sync.md) |
| **C** | Целостность данных (инварианты, guards) | ✅ Закрыта | [phase-c-data-integrity.md](./phase-c-data-integrity.md) |
| **D** | Deploy / parity / CI | ⏳ Следующая | — |

## Команды по фазам

```bash
# Фаза A
npm run check:widgets
npm run check:widgets -- --base https://staging.daibilet.ru

# Фаза C — после sync
npm run check:sync-invariants

# Фаза B (после merge)
npm run tc:sync
npm run tep:sync
```
