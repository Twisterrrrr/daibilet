# Текущее состояние Daibilet

Дата: 2026-07-09  
Ветка интеграции: `integrate/mvp-launch` (база: `backend-ts-foundation` + UI из `feat/lovable-landings`)

## Продуктовый режим

MVP работает **widget-first**:

- Покупка через виджеты **Ticketscloud** и **Teplohod.info**
- Daibilet хранит каталог, факт покупки, покупателя, статус заказа и билетов
- **Не включено в runtime:** YooKassa, чеки через Daibilet, внутренний checkout, ЛК поставщика, trip planner

## Архитектура

| Слой | Технология | Статус |
|------|------------|--------|
| Монорепо | npm workspaces (`apps/*`, `packages/*`) | Активно |
| Схема БД | Prisma 7, `packages/db` | Активно, 10 миграций |
| Runtime БД | `pg` Pool + тяжёлый SQL в `dto.js` | Prod path |
| TS foundation | `server-entry.ts`, typed handlers, zod | Smoke / постепенное включение |
| Public | Vite + React SPA | Интегрирован UI из lovable |
| Admin | Vite + React SPA | MVP + Articles |
| Deploy prod | `/opt/daibilet` | Без изменений до smoke |
| Deploy staging | `/opt/daibilet-staging` | Новый контур |

## Ключевые модели (MVP)

- **Event** — карточка события (не слот)
- **EventSession** — слот времени
- **ProviderLink** — identity поставщика: EVENT, SESSION, OFFER, VENUE
- **ExternalOrder / ExternalTicket** — зеркало покупок через виджеты
- **CheckoutOrder / Payment / FiscalReceipt** — только foundation в схеме, не в runtime

## Ветки GitHub

| Ветка | Назначение |
|-------|------------|
| `backend-ts-foundation` | Codex: Prisma, ProviderLink, TS handlers, тесты |
| `feat/lovable-landings` | UI/UX: каталог, виджеты, blog, locations, trust pages |
| `integrate/mvp-launch` | **Текущая:** foundation + точечный UI port |
| `main` | Устаревший initial, не deploy base |

## Что сохранено из foundation

- `packages/db` — Prisma schema, migrations, `ProviderLink`
- TS modules: `public-*-handler.ts`, `provider-links.repository.ts`, тесты
- `server-entry.ts` — typed entrypoint с feature flags
- Правило каталога: TC/Teplohod слоты не как отдельные события

## Что перенесено из lovable

- Public UI: виджеты TC/Teplohod, каталог, лендинги, blog, locations/venues, trust pages
- Backend helpers: `event-venue-context.js`, `venue-normalize.js`, `city-timezone.js`, `social-preview.js`
- Admin: Articles, доработки Venues
- Deploy: staging scripts, nginx snippets

## Инфраструктура

| Параметр | Prod | Staging |
|----------|------|---------|
| Код | `/opt/daibilet` | `/opt/daibilet-staging` |
| Public static | `/var/www/daibilet/public` | `/var/www/daibilet/staging` |
| Admin static | `/var/www/daibilet/admin` | `/var/www/daibilet/staging-admin` |
| API service | `daibilet-api` :4000 | `daibilet-api-staging` :4001 |
| Домен | `daibilet.ru` | `staging.daibilet.ru` |

## Команды проверки

```bash
npm install
npm run db:validate
npm run db:generate
npm run db:typecheck
npm run backend:typecheck
npm run backend:test:ts
npm run public:build
npm run admin:build
# при доступной БД:
npm run db:migrate   # dev
npm run db:smoke
```

## Открытые блокеры до первых продаж

1. Staging smoke на Timeweb (`/opt/daibilet-staging`)
2. Widget smoke TC + Teplohod на staging
3. SEO smoke: robots, sitemap, canonical, www redirect
4. Подтверждение владельца: домены, legal pages, скрытие неготового контента

## См. также

- [decision-log.md](./decision-log.md) — зафиксированные решения
- [marketplace-phase-foundation.md](./marketplace-phase-foundation.md) — фазы 2–4 в схеме
- [launch-qa-and-deploy.md](./launch-qa-and-deploy.md) — smoke checklist
- [deploy-timeweb.md](./deploy-timeweb.md) — prod deploy
- [deploy-staging.md](./deploy-staging.md) — staging deploy
