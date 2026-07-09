# Текущее состояние Daibilet

Дата: **2026-07-10** (после фазы C)  
Ветка: **`integrate/mvp-launch`**

## Фазы

| Фаза | Статус | Документ |
|------|--------|----------|
| A — виджет API | ✅ | [phase-a-widget-readiness.md](./phases/phase-a-widget-readiness.md) |
| B — import sync → БД | ✅ | [phase-b-import-sync.md](./phases/phase-b-import-sync.md) |
| C — целостность данных | ✅ | [phase-c-data-integrity.md](./phases/phase-c-data-integrity.md) |
| D — deploy / parity | ⏳ | — |

## Проверки (полный цикл)

```bash
npm run tc:sync
npm run check:sync-invariants
npm run check:widgets

npm run tep:sync
npm run check:sync-invariants
```

## Следующий шаг

**Фаза D:** deploy на staging/prod, nightly cron инвариантов, parity typed handlers.

## Документы

- [import-guards.md](./import-guards.md)
- [phases/README.md](./phases/README.md)
