# Фазы: виджеты, данные, импорт

План работ после checkpoint MVP launch (2026-07-10).  
Каждая фаза завершается **отчётом**, **обновлением docs** и **отдельным коммитом**.

| Фаза | Фокус | Статус | Отчёт |
|------|-------|--------|-------|
| **A** | Цепочка данные → виджет (API + эталоны) | ✅ Закрыта | [phase-a-widget-readiness.md](./phase-a-widget-readiness.md) |
| **B** | Импорт sync → БД (TC + TEP, ProviderLink) | ✅ Закрыта | [phase-b-import-sync.md](./phase-b-import-sync.md) |
| **C** | Целостность данных (diff, инварианты) | ⏳ Следующая | — |
| **D** | Наблюдаемость, deploy, parity | ⏳ | — |

## Команды по фазам

```bash
# Фаза A
npm run check:widgets
npm run check:widgets -- --base https://staging.daibilet.ru

# Фаза B (после merge)
npm run tc:sync
npm run tep:sync
```
