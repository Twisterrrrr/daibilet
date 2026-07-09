# Текущее состояние Daibilet

Дата: **2026-07-10** (checkpoint после prod deploy)  
Ветка: **`integrate/mvp-launch`**  
Детальный аудит: **[checkpoint-2026-07-10-mvp-launch.md](./checkpoint-2026-07-10-mvp-launch.md)**

## Продуктовый режим

MVP **widget-first**: покупка через Ticketscloud / Teplohod.info.  
**Не в runtime:** YooKassa, внутренний checkout, ЛК поставщика, trip planner.

## Деплой (актуально)

| Контур | Код | API | Домен | Коммит (сервер) |
|--------|-----|-----|-------|-----------------|
| **Prod** | `/opt/daibilet` | `:4000` | daibilet.ru | `4cee7a7` |
| **Staging** | `/opt/daibilet-staging` | `:4001` | staging.daibilet.ru | `4cee7a7`+ |
| **GitHub** | — | — | — | `6df849f` |

Prod hotfix до merge: stash `pre-integrate-deploy-20260709` на сервере.

## Архитектура (кратко)

- **Prisma** — schema, migrations, smoke; **runtime API** — `dto.js` + pg SQL
- **TS foundation** — parallel (`server-entry.ts`, typed handlers); prod = `server.js`
- **ProviderLink** — в схеме и тестах
- **2386** events, **1057** venues на API

## Следующие шаги

1. Browser widget smoke (TC + Teplohod)
2. Prod pull `6df849f`, deploy через fixed script
3. SEO + launch checklist
4. Решение по staging БД (shared vs separate)

## Команды проверки

```bash
npm run db:validate && npm run db:generate && npm run db:typecheck
npm run backend:typecheck && npm run backend:test:ts
npm run public:build && npm run admin:build
```

## Документы

- [checkpoint-2026-07-10-mvp-launch.md](./checkpoint-2026-07-10-mvp-launch.md) — аудит точки
- [decision-log.md](./decision-log.md)
- [launch-qa-and-deploy.md](./launch-qa-and-deploy.md)
