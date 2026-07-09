# Текущее состояние Daibilet

Дата: **2026-07-10** (после фазы B)  
Ветка: **`integrate/mvp-launch`**

## Фазы (виджеты + импорт)

| Фаза | Статус | Документ |
|------|--------|----------|
| A — данные → виджет (API) | ✅ | [phases/phase-a-widget-readiness.md](./phases/phase-a-widget-readiness.md) |
| B — импорт sync → БД | ✅ | [phases/phase-b-import-sync.md](./phases/phase-b-import-sync.md) |
| C — целостность данных | ⏳ | — |
| D — deploy / parity | ⏳ | — |

## Импорт (фаза B)

| Источник | Команда / API | БД |
|----------|---------------|-----|
| **TC** | `npm run tc:sync`, `POST /api/v1/tc/sync` | upsert + ProviderLink |
| **TEP** | `npm run tep:sync`, `POST /api/v1/tep/sync` | replace sessions + ProviderLink |

## Проверки

```bash
npm run check:widgets
npm run tc:import      # нужен catalog.public.json + DATABASE_URL
npm run backend:test:ts
```

## Следующий шаг

**Фаза C:** инварианты после sync, мониторинг `missingFromCatalog`.

## Документы

- [phases/README.md](./phases/README.md)
- [widget-data-contract.md](./widget-data-contract.md)
- [ticketscloud-import.md](./ticketscloud-import.md)
