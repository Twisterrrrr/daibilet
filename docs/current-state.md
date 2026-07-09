# Текущее состояние Daibilet

Дата: **2026-07-10** (после фазы A)  
Ветка: **`integrate/mvp-launch`**  
Checkpoint: **[checkpoint-2026-07-10-mvp-launch.md](./checkpoint-2026-07-10-mvp-launch.md)**

## Продуктовый режим

MVP **widget-first**: покупка через Ticketscloud / Teplohod.info.  
**Не в runtime:** YooKassa, внутренний checkout, ЛК поставщика, trip planner.

## Фазы (виджеты + импорт)

| Фаза | Статус | Документ |
|------|--------|----------|
| A — данные → виджет (API) | ✅ | [phases/phase-a-widget-readiness.md](./phases/phase-a-widget-readiness.md) |
| B — импорт sync → БД | ⏳ | — |
| C — целостность данных | ⏳ | — |
| D — deploy / parity | ⏳ | — |

## Деплой

| Контур | API | Домен | Примечание |
|--------|-----|-------|------------|
| **Prod** | `:4000` | daibilet.ru | hotfix CORS @ `e72c912` |
| **Staging** | `:4001` | staging.daibilet.ru | noindex, shared DB |

## Архитектура (кратко)

- **Prisma** — schema, migrations; **runtime API** — `dto.js` + pg SQL
- **2386** events, **1057** venues (prod stats)
- Widget API check: `npm run check:widgets` — **4/4 эталона OK** (prod + staging)

## Следующий шаг

**Фаза B:** TC import в один sync, ProviderLink после импорта.

## Команды проверки

```bash
npm run check:widgets
npm run db:validate && npm run backend:test:ts
npm run public:build && npm run admin:build
```

## Документы

- [phases/README.md](./phases/README.md) — дорожная карта фаз
- [widget-data-contract.md](./widget-data-contract.md) — контракт полей виджета
- [widget-etalon-slugs.md](./widget-etalon-slugs.md) — эталоны для регрессии
- [decision-log.md](./decision-log.md)
