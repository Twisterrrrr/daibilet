# Аудит стека Daibilet — 2026-07-10

**Ветка:** `integrate/mvp-launch`  
**Prod:** daibilet.ru · **Staging:** staging.daibilet.ru  
**Краткий ответ:** **нет**, не «всё на Next.js + Prisma». Это **гибрид**: Vite/React SPA + Node API (`start:ts`) + Prisma schema/migrations + legacy `dto.js` (~8k строк) как runtime-слой и fallback.

---

## 1. Резюме

| Утверждение | Факт |
|-------------|------|
| Весь frontend на Next.js | ❌ **Vite 6 + React 19 SPA** (`apps/public`, `apps/admin`) |
| Весь backend на Prisma Client | ❌ **Частично** — catalog/event нативно; city/venue/admin read делегируют в `dto.js` |
| Prod на typed entrypoint | ✅ `npm run start:ts` + все `DAIBILET_TS_*=1` |
| Legacy удалён | ❌ `dto.js` + `server.js` остаются ядром маршрутизации и writes |
| Staging изолирован от prod DB | ✅ `5438/daibilet_staging` (E5) |
| Parity legacy vs typed | ✅ `npm run check:parity` — public 4/4 + admin 2/2 |

**Вывод:** фаза E дала **контролируемый typed rollout** поверх legacy, а не полную замену стека. Это осознанный MVP-компромисс.

---

## 2. Frontend

| App | Стек | Рендеринг | API |
|-----|------|-----------|-----|
| `apps/public` | Vite + React 19 + Tailwind | **CSR SPA** (`App.tsx`, client routing) | `fetch('/api/public/...')` |
| `apps/admin` | Vite + React 19 + React Router 7 | **CSR SPA** | `fetch('/api/admin/...')` |

**Next.js в репозитории отсутствует** (нет `next` в dependencies, нет `app/` / `pages/` router).

### Рекомендации (frontend)

1. **Не мигрировать на Next.js до стабилизации backend** — смена SSR/SSG добавит риск для SEO и deploy без выигрыша на текущем объёме SPA.
2. Если понадобится SSR для SEO — точечно: landing/city/event meta уже через API + client; рассмотреть **prerender** или **edge HTML** для top-N URL, не big-bang Next.
3. Держать `PUBLIC_API_URL` / `API_BASE_URL` явными в build env (staging vs prod).

---

## 3. Backend runtime (prod/staging)

```
systemd → npm --prefix apps/backend run start:ts
         → server-entry.ts (флаги DAIBILET_TS_*)
         → typed route handlers (если enabled)
         → fallback: server.js → handleRequest → dto.js
```

### Флаги prod (2026-07-10)

```
DAIBILET_TS_PUBLIC_CATALOG=1
DAIBILET_TS_PUBLIC_EVENT=1
DAIBILET_TS_PUBLIC_CITY=1
DAIBILET_TS_PUBLIC_VENUE=1
DAIBILET_TS_ADMIN_EVENTS=1
DAIBILET_TS_ADMIN_ORDERS=1
```

### Базы данных

| Среда | DATABASE_URL | Назначение |
|-------|--------------|------------|
| Prod | `127.0.0.1:5437/daibilet` | live |
| Staging | `127.0.0.1:5438/daibilet_staging` | snapshot prod + эксперименты |

---

## 4. Public API — что реально на Prisma

| Route | Typed модуль | Реализация | Prisma-native? |
|-------|--------------|------------|----------------|
| `GET /api/public/events` | `public-catalog.dto.ts` | `$queryRaw` + mapper + legacy helpers (saleability, pinned) | **~80%** |
| `GET /api/public/events/:slug` | `public-event.dto.ts` | Prisma `findMany` + legacy normalize/format/saleability | **~70%** |
| `GET /api/public/cities`, `.../cities/:slug` | `public-city.dto.ts` | Prisma catalog sessions + **legacy** destination/hub/landings | **~40%** |
| `GET /api/public/venues`, `.../venues/:slug` | `public-venue.dto.ts` | **Делегат** `buildPublicVenuesCatalog` / `buildPublicVenuePage` | **~10%** |
| Landings, home, stats, buyer | — | **Только** `server.js` → `dto.js` | **0%** |

> Venue list **обязан** идти через `buildPublicVenuesCatalog(searchParams)` — иначе ломаются `family=location|institution`, hero fallback и фильтры (инцидент 2026-07-10).

---

## 5. Admin API

| Route | Typed (E4) | Реализация |
|-------|------------|------------|
| `GET /api/admin/events` | ✅ flag | **legacy** `buildAdminEventsList` |
| `GET /api/admin/events/:id` | ✅ flag | **legacy** `buildAdminEventDetail` |
| `GET /api/admin/orders` | ✅ flag | **legacy** `buildAdminOrdersList` |
| Dashboard, sources, landings, venues, taxonomy, buyers, articles | ❌ | **legacy** `dto.js` raw SQL |
| PATCH events/landings, POST sync, orders/tickets | TS handlers | **writes в dto.js** |

Admin **не на Prisma Client** — только typed entry + parity; SQL в monolith.

---

## 6. Sync / writes / jobs

| Контур | Технология |
|--------|------------|
| TC catalog sync | Node scripts + `dto.js` |
| TEP import | Node scripts + fixture bridge |
| Orders sync | `dto.js` |
| Prisma migrations | `packages/db` (`npm run db:deploy`) |
| Cron | shell + node (см. `deploy/cron/`) |

**Все мутации БД** (override, moderation, landing match, venue update) — через `dto.js` + raw `pg`.

---

## 7. Prisma (`packages/db`)

| Компонент | Статус |
|-----------|--------|
| Schema + migrations | ✅ единый источник DDL |
| Prisma Client (`@daibilet/db`) | ✅ используется в typed public read |
| Phase 2 models (Supplier, Checkout…) | ❌ не в `integrate/mvp-launch` |
| Codex `codex/phase2-foundation` | отложен до финконтура |

---

## 8. Legacy debt (метрики)

| Файл | ~строк | Роль |
|------|--------|------|
| `apps/backend/src/dto.js` | ~8 200 | catalog SQL cache, admin, public helpers, writes |
| `apps/backend/src/server.js` | ~1 200 | route map, sync, fallback для всех необработанных routes |
| `apps/backend/src/*.dto.ts` | 6 модулей | typed read slice + делегаты |

**Rollback:** снять `DAIBILET_TS_*` → instant legacy path (`docs/phases/phase-e-prisma-runtime.md`).

---

## 9. Codex vs Cursor path

| | `integrate/mvp-launch` (текущий) | `codex/phase2-foundation` |
|---|----------------------------------|---------------------------|
| Цель | MVP widget-first + E2–E5 rollout | Phase 2–4 foundation |
| Frontend | Vite SPA | Vite SPA (не Next) |
| Monorepo | npm workspaces | pnpm + `packages/contracts` |
| Prod | ✅ задеплоен | ❌ не задеплоен |
| Merge | — | unrelated history, только cherry-pick |

**Решение:** Codex — справочник для финконтура/ЛК поставщика, не замена текущей ветки.

---

## 10. Рекомендации — Phase F (после E)

### P0 — стабильность (1–2 недели)

1. **Nightly cron** на prod: `check:parity`, `check:widgets`, `check:sync-invariants` → алерт в Telegram/email.
2. **`npm run tc:sync`** backfill widgetUrl (62613 offers без URL — known debt).
3. **Документировать** обязательные query params для venue API в `widget-data-contract.md`.

### P1 — углубление Prisma read (2–4 недели)

1. **Venue/city** — перенести hub rows + hero fallback в Prisma-native (`public-venue.dto.ts`, `public-city.dto.ts`), убрать делегаты; parity обязателен.
2. **Admin dashboard + sources** — Prisma read DTO (образец в Codex, cherry-pick без merge ветки).
3. **Landings list/read** — следующий typed slice + parity.

### P2 — writes на staging only

1. Admin PATCH (event override, landing match) → Prisma transactions на **staging DB**.
2. Prod writes — только после soak + parity для write path.
3. Никогда не включать sync jobs на staging против prod API tokens без явного флага.

### P3 — стратегические решения (не сейчас)

| Вопрос | Рекомендация |
|--------|--------------|
| Next.js? | **Не нужен** для текущего MVP. Пересмотреть при SEO-давлении на 10k+ URL. |
| Удалить `dto.js`? | Только после 100% route coverage + 30d soak без flags. |
| pnpm / Codex merge? | Только при старте Phase 2 finance, точечно. |
| YooKassa / CheckoutOrder | Codex schema cherry-pick + отдельная фаза, не смешивать с E. |

---

## 11. Exit checklist «полный Prisma + без legacy»

- [ ] Public: все GET без делегатов в `dto.js`
- [ ] Admin: все GET на Prisma
- [ ] Writes: Prisma + domain services, `dto.js` read-only → удалён
- [ ] Sync: вынесен в `packages/sync` или workers
- [ ] Parity scripts в CI на каждый PR
- [ ] 30 дней prod без `DAIBILET_TS_*` fallback (flags always on, legacy unused)
- [ ] Staging DB refresh documented + automated weekly

---

## 12. Команды аудита

```bash
# Parity (нужен DATABASE_URL)
npm run check:parity

# Post-deploy
POST_DEPLOY_PUBLIC_BASE=https://daibilet.ru npm run check:post-deploy

# Staging DB refresh
cd /opt/daibilet-staging
STAGING_POSTGRES_PASSWORD=... bash deploy/scripts/restore-staging-db.sh
systemctl restart daibilet-api-staging
```

---

## Связанные документы

- [phase-e-prisma-runtime.md](./phases/phase-e-prisma-runtime.md) — rollout E1–E5
- [backend-typescript-migration.md](./backend-typescript-migration.md) — история TS migration
- [codex-handoff-2026-07-10.md](./codex-handoff-2026-07-10.md) — границы Codex
- [current-state.md](./current-state.md) — ops backlog
