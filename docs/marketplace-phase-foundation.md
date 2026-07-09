# Marketplace Phase Foundation (фазы 2–4)

Дата: 2026-07-09  
Статус: **schema foundation only** — не активная бизнес-логика MVP

## Контекст

MVP (фаза 1) — widget-first: TC/Teplohod виджеты, ExternalOrder/ExternalTicket.

Фазы 2–4 заложены в Prisma-схеме как **аддитивный foundation** для будущего:

- Внутренний checkout
- YooKassa payments
- Фискальные чеки
- ЛК поставщика
- Trip planner

**В runtime MVP эти сущности не используются.**

## Правила для миграций

1. Только **аддитивные** изменения — новые таблицы/колонки, без DROP существующих
2. Не ломать `ExternalOrder`, `ExternalTicket`, каталог, `ProviderLink`
3. Применять через `npm run db:migrate` (dev) / `prisma migrate deploy` (prod)
4. Не смешивать ExternalOrder и CheckoutOrder в UI без явного DTO-слоя

## Планируемая миграция

```
packages/db/prisma/migrations/20260709210000_marketplace_phase_foundation/migration.sql
```

> **Примечание:** миграция ещё не создана в репозитории. При добавлении — проверить аддитивность на копии prod/staging БД.

### Ожидаемые сущности (foundation)

| Модель | Назначение | MVP runtime |
|--------|------------|-------------|
| `CheckoutOrder` | Внутренний заказ | ❌ |
| `Payment` | Платёж YooKassa | ❌ |
| `FiscalReceipt` | Чек 54-ФЗ | ❌ |
| `SupplierAccount` | ЛК поставщика | ❌ |
| `TripPlan` | Trip planner | ❌ |

### Что не трогать

- `ExternalOrder` / `ExternalTicket` — единственный order flow в MVP
- `Event`, `EventSession`, `EventOffer` — каталог
- `ProviderLink` — provider identity
- Индексы public catalog

## Проверка перед deploy миграции

```bash
npm run db:validate
npm run db:generate
# на staging БД:
cd packages/db && npx prisma migrate deploy
npm run db:smoke
npm run backend:test:ts
```

### Smoke после миграции

- [ ] `ExternalOrder` count не изменился неожиданно
- [ ] Public catalog `/api/public/events` — 200, группировка слотов
- [ ] Admin Orders — ExternalOrder only, без CheckoutOrder в UI
- [ ] TC/Teplohod widget open на event detail

## Связь с UI

Admin и Public **не должны** показывать CheckoutOrder/Payment до отдельной задачи включения.

Если в API появятся поля foundation — скрывать за feature flag `DAIBILET_INTERNAL_CHECKOUT=0` (default).

## См. также

- [packages/db/README.md](../packages/db/README.md)
- [decision-log.md](./decision-log.md)
- [current-state.md](./current-state.md)
