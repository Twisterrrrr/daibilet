# Дайбилет — описание проекта

**Версия документа:** 2026-07-05  
**Репозиторий:** [github.com/Twisterrrrr/daibilet](https://github.com/Twisterrrrr/daibilet)  
**Production:** [daibilet.ru](https://daibilet.ru) · API `213.171.7.16:4000` · код `/opt/daibilet`

---

## 1. Назначение продукта

**Дайбилет** — агрегатор событий и экскурсий из внешних билетных систем. Сервис **не принимает платежи** и **не выпускает билеты**; покупка идёт через виджеты Ticketscloud и Teplohod.info.

Задачи MVP:

- импорт и нормализация каталога (события, площадки, города, категории);
- публичный SEO-каталог с фильтрами и лендингами;
- страницы события / города / площадки / локации;
- админка для модерации, override контента и синхронизаций;
- зеркалирование внешних заказов и статусов билетов.

Подробная продуктовая спецификация: [mvp-spec.md](./mvp-spec.md).

---

## 2. Как проект «получен» — контекст и наследие

### 2.1. Исходная точка

Проект развивается как **новый MVP на Timeweb Cloud** (с июня 2026), параллельно со старой версией сайта. Деплой описан в [deploy-timeweb.md](./deploy-timeweb.md).

Типичная эволюция кодовой базы:

| Слой | Как появился | Текущее состояние |
|------|----------------|-------------------|
| **Схема БД** | Prisma 7, миграции с мая 2026 | Актуальная, 8 миграций, ~30 моделей |
| **Runtime доступ к БД** | Сначала прототип на `pg` + сырые SQL | **Prisma Client не используется в runtime** |
| **Backend API** | Монолит `dto.js` + `server.js` | ~8000 строк SQL/DTO в одном файле |
| **Public frontend** | Vite + React, SPA без роутера | Client-side routing в `App.tsx` |
| **Данные каталога** | Ticketscloud gRPC + Teplohod REST | ~1800 saleable-событий на prod |
| **Контент** | Импорт + ручные override JSON/scripts | EventOverride, venue-address-overrides |

### 2.2. Архитектурный компромисс MVP

Для скорости выхода в prod выбран **«Prisma для схемы, pg для запросов»**:

- Prisma даёт типобезопасную схему, миграции и `db:validate`.
- Весь публичный каталог собирается **одним тяжёлым SQL** в `publicCatalogSessionsFast()` и кэшируется в памяти процесса API.
- Бизнес-логика группировки дублей, нормализации площадок, лендингов и SEO — в **`apps/backend/src/dto.js`**.

Это осознанный trade-off: быстрый запуск vs. поддерживаемость.

### 2.3. Связанные legacy-документы

- [legacy-public-inventory.md](./legacy-public-inventory.md) — инвентарь старого public.
- [spbboats-mvp-extraction-plan.md](./spbboats-mvp-extraction-plan.md) — план выделения MVP.
- [event-extraction.md](./event-extraction.md) — правила извлечения событий.

---

## 3. Текущее состояние (июль 2026)

### 3.1. Production-метрики (ориентир)

| Показатель | Значение |
|------------|----------|
| Событий в saleable-каталоге | ~1809 |
| Направлений (города/регионы) | 45 |
| Площадок в hub-кэше | до 500 |
| Прогрев API-кэша при старте | ~10–11 с |
| Warm `/api/public/venues?family=institution` | ~3 ms |
| Warm `/api/public/cities/:slug` | ~10 ms |
| Cold каталог после `?refresh=1` | ~8 s |

Актуальные замеры: [public-performance-snapshot.md](./public-performance-snapshot.md).

### 3.2. Недавно реализовано (сессия разработки 2026-07)

**Производительность public**

- In-memory индексы: `venueIndex`, `slugIndex`, `destinationIndex`, `catalogFacets`.
- Прогрев `publicVenueCatalogLists` (institution/location) при старте API.
- HTTP `Cache-Control: public, max-age=60, stale-while-revalidate=300` для public JSON.
- Frontend: lazy routes, localStorage-кэши (city, venue, catalog, landing, events).
- Страница локации: prefetch API в `index.html`, без `hydratePublicShell` на не-главных страницах, shell hero до загрузки расписания.

**Каталог и контент**

- Группировка дублей карточек (`groupKey`, слоты в EventCard).
- Объединение площадок с суффиксами залов (`Stage StandUp Club | * зал` → одна площадка).
- Override описаний ~1700 событий через `EventOverride` + `scripts/apply-event-manual-content.js`.
- Локальное время города (не MSK) в карточках и виджетах.

**Известные узкие места**

- `/api/public/stats` — ~600 ms даже в warm (тяжёлый aggregate).
- Cold rebuild каталога — 8–10 s после `?refresh=1` или рестарта без прогретого кэша.
- `dto.js` — монолит, сложно тестировать и рефакторить.
- Public SPA: первый визит тянет main bundle ~497 KB + lazy chunk.

### 3.3. Что работает в prod

- [x] Главная, `/events`, `/cities`, `/venues`, `/locations`
- [x] Страницы города, события, площадки/локации
- [x] Лендинги (`/podborki`, `/l/:slug`)
- [x] Виджеты TC + Teplohod
- [x] Admin dashboard (отдельный домен)
- [x] Автосинк Teplohod по расписанию
- [x] Ручной full-sync Ticketscloud через scripts

---

## 4. Архитектура системы

```mermaid
flowchart TB
  subgraph clients [Клиенты]
    Public[Public SPA<br/>daibilet.ru]
    Admin[Admin SPA<br/>admin.daibilet.ru]
  end

  subgraph server [Backend Node.js :4000]
    Server[server.js<br/>HTTP router]
    DTO[dto.js<br/>SQL + бизнес-логика]
    Cache[In-memory caches<br/>catalog / venue hub / HTTP]
    Auth[user-auth.js]
  end

  subgraph db [PostgreSQL]
    PG[(Prisma schema<br/>pg Pool runtime)]
  end

  subgraph external [Внешние системы]
    TC[Ticketscloud gRPC]
    TEP[Teplohod.info API]
    TCW[TC Widget JS]
  end

  Public --> Server
  Admin --> Server
  Server --> DTO
  DTO --> PG
  DTO --> Cache
  Server --> Auth
  scripts[scripts/*.js] --> PG
  scripts --> TC
  scripts --> TEP
  Public --> TCW
```

### 4.1. Поток данных каталога

1. **Импорт:** `scripts/tc-full-sync.js`, `scripts/tep-import-fixtures.js` → Postgres.
2. **Сборка saleable-каталога:** `publicCatalogSessions()` — один SQL + маппинг в DTO-сессии.
3. **Кэш процесса:** 5 мин TTL, прогрев при старте (`warmPublicCatalogCache`).
4. **HTTP-кэш:** `withPublicResponseCache` + `Cache-Control` для CDN/браузера.
5. **Клиент:** fetch API + localStorage SWR-кэши на ключевых страницах.

### 4.2. Границы ответственности модулей

| Модуль | Ответственность |
|--------|-----------------|
| `apps/backend/src/server.js` | HTTP, CORS, auth, admin routes, cache headers |
| `apps/backend/src/dto.js` | Public/admin DTO, SQL, группировки, landings, SEO |
| `apps/backend/src/venue-normalize.js` | Нормализация адресов/названий площадок |
| `apps/backend/src/city-timezone.js` | IANA TZ для городов |
| `apps/backend/src/db.js` | `pg.Pool`, минимальный query helper |
| `apps/public/src/App.tsx` | Client-side routing (без react-router) |
| `scripts/` | Sync, seed, content batch, диагностика |

---

## 5. Структура репозитория

```
daibilet/
├── apps/
│   ├── backend/          # Node.js HTTP API (ESM)
│   │   └── src/
│   │       ├── server.js
│   │       ├── dto.js    # ⚠️ основной монолит
│   │       ├── db.js
│   │       ├── venue-normalize.js
│   │       └── city-timezone.js
│   ├── public/           # Vite + React 18, Tailwind
│   │   └── src/
│   │       ├── App.tsx
│   │       ├── components/
│   │       └── lib/      # кэши, datetime, venue-meta
│   └── admin/            # Vite + React, админка
├── packages/
│   └── db/               # Prisma schema + migrations
│       └── prisma/
├── scripts/              # sync, content, диагностика
├── data/                 # geo routing, fixtures
├── docs/                 # документация
├── deploy/               # deploy scripts
└── docker-compose.yml    # local Postgres :5437
```

### NPM-скрипты (корень)

| Команда | Назначение |
|---------|------------|
| `npm run db:up` | Postgres в Docker |
| `npm run db:migrate` | Prisma migrate dev |
| `npm run backend:dev` | API :4000 |
| `npm run public:serve` | Public dev :5173/5178 |
| `npm run public:build` | Production build public |
| `npm run tc:full-sync` | Полный sync Ticketscloud |
| `npm run tep:sync` | Import Teplohod fixtures |
| `npm run public:perf` | Snapshot производительности |

---

## 6. База данных

### 6.1. Prisma schema (источник истины)

Файл: `packages/db/prisma/schema.prisma`  
Клиент генерируется в `packages/db/src/generated/prisma`, но **приложение его не импортирует**.

**Основные модели:**

| Группа | Модели |
|--------|--------|
| Импорт | `Source`, `SourceSyncRun`, `RawImportRecord`, `EventSourceLink` |
| Каталог | `Event`, `EventSession`, `EventOffer`, `EventOverride` |
| Таксономия | `Category`, `Subcategory`, `Tag`, `EventTag`, `EventSubcategory` |
| География | `Region`, `City`, `Venue`, `VenueAlias` |
| SEO/контент | `Landing`, `LandingContentBlock`, `LandingMatch`, `Article`, `SeoMeta` |
| Заказы | `ExternalOrder`, `ExternalTicket` |
| Пользователи | `SiteUser` |
| Качество | `QualityIssue` |

Миграции: `packages/db/prisma/migrations/` (8 штук, с `20260531071601_init`).

Локальная БД:

```bash
docker compose up -d postgres
export DATABASE_URL="postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet"
npm run db:migrate
```

### 6.2. Runtime: raw `pg`

`apps/backend/src/db.js` создаёт singleton `Pool` и экспортирует `{ query, stats, recentEvents }`.

Все сложные выборки — **строковые SQL-шаблоны** в `dto.js`, в т.ч.:

- `publicCatalogSessionsFast()` — CTE primary_offer + event_base + tags + groupKey;
- `venueRows()` — агрегат событий по площадкам;
- admin list/detail queries.

**Индексы для каталога** добавлены миграцией `20260617130000_public_catalog_indexes`.

---

## 7. Backend API (public)

Базовый URL: `/api/public/*`

| Endpoint | Назначение |
|----------|------------|
| `GET /stats` | Счётчики для hero |
| `GET /destinations` | Список городов/регионов |
| `GET /home/preview` | Превью главной (96 карточек) |
| `GET /events?…` | Каталог с фильтрами |
| `GET /venues?family=institution\|location` | Каталог площадок |
| `GET /venues/:slug` | Страница площадки/локации |
| `GET /cities/:slug` | Страница города |
| `GET /events/:slug` | Страница события |
| `GET /landings/:slug` | SEO-лендинг |
| `GET /search?q=` | Поиск |
| `GET /promo-blocks` | Промо-блоки |

Admin: `/api/admin/*` (Basic Auth / session).  
Auth пользователей: `/api/auth/*`, `/api/account/*`.

Кэширование:

- In-process: `publicCatalogCache`, `publicVenueHubCache`, `publicResponseCache`.
- HTTP: `Cache-Control` на public JSON.
- Invalidation: `?refresh=1` или `invalidatePublicCaches()` после sync.

---

## 8. Frontend (public)

### 8.1. Стек

- **Vite 6** + **React 18** + **TypeScript**
- **Tailwind CSS**
- Routing: условный рендер в `App.tsx` (без react-router)
- Lazy imports: `CatalogPage`, `CityPage`, `EventPage`, `LandingPage`, `VenuePage`

### 8.2. Маршруты

| URL | Компонент |
|-----|-----------|
| `/` | Home (в App.tsx) |
| `/events` | CatalogPage |
| `/cities`, `/cities/:slug` | CitiesCatalogPage / CityPage |
| `/venues`, `/venues/:slug` | VenuesCatalogPage / VenuePage |
| `/locations`, `/locations/:slug` | LocationsCatalogPage / VenuePage |
| `/events/:slug` | EventPage |
| `/l/:slug`, `/podborki` | LandingPage |

### 8.3. Client-side кэши (localStorage)

| Ключ | TTL | Файл |
|------|-----|------|
| `daibilet:city-page:*` | 5 min | `city-page-cache.ts` |
| `daibilet:venue-page:*` | 5 min | `venue-page-cache.ts` |
| `daibilet:venues-catalog:*` | 5 min | `venues-catalog-cache.ts` |
| `daibilet:public-stats` | session | `data.ts` |
| `daibilet:public-home-preview` | session | `data.ts` |

### 8.4. Prefetch

В `apps/public/index.html` для `/locations/*` и `/venues/*` — ранний `fetch` API до загрузки React (`__DAIBILET_VENUE_PREFETCH__`).

---

## 9. Интеграции

Подробно: [integrations.md](./integrations.md), [ticketscloud-import.md](./ticketscloud-import.md).

| Источник | Канал | Скрипт | Widget |
|----------|-------|--------|--------|
| **Ticketscloud** | gRPC `tc-simple` + REST orders | `scripts/tc-full-sync.js` | `tcwidget.js` |
| **Teplohod.info** | REST API (IP allowlist) | `scripts/tep-import-fixtures.js` | iframe/deeplink |

Переменные окружения — см. [deploy-timeweb.md](./deploy-timeweb.md).

---

## 10. Деплой и эксплуатация

### 10.1. Production layout

```
/opt/daibilet/              # git clone, .env, node_modules
/var/www/daibilet/public/   # static public dist
/var/www/daibilet/admin/    # static admin dist
systemd: daibilet-api       # node apps/backend, PORT=4000
docker: daibilet-tours-postgres
```

### 10.2. Типовой деплoy (ручной)

```bash
npm run public:build
scp apps/backend/src/dto.js apps/backend/src/server.js root@213.171.7.16:/opt/daibilet/apps/backend/src/
scp -r apps/public/dist/* root@213.171.7.16:/var/www/daibilet/public/
ssh root@213.171.7.16 "systemctl restart daibilet-api"
```

Автоматический: `deploy/scripts/deploy-from-git.sh`.

### 10.3. После деплоя проверить

- `journalctl -u daibilet-api | grep "Public cache warmed"`
- `curl -s http://127.0.0.1:4000/api/public/stats`
- Smoke: главная, `/venues`, страница города, страница локации

---

## 11. Контент и override

| Механизм | Файлы | Назначение |
|----------|-------|------------|
| `EventOverride` | DB + `scripts/apply-event-manual-content.js` | Ручные описания событий |
| `venue-address-overrides.json` | `scripts/data/` | Канонические названия/адреса площадок |
| `venue-content-user-batch*.json` | `scripts/data/` | SEO-тексты площадок |
| Runtime merge | `dto.js` `mergePublicVenueHubRows` | Объединение дублей площадок |

---

## 12. Рекомендации: переход на Prisma Client

### 12.1. Текущая проблема

```
Prisma schema ──migrate──► PostgreSQL
                              ▲
                              │ raw SQL (dto.js)
                         pg.Pool (db.js)
```

Prisma используется только как **DDL/migration tool**. Весь runtime — сырой SQL без типизации результата, без связей, без query builder.

**Риски:**

- Расхождение schema ↔ SQL (поля переименовали в Prisma, забыли в SQL).
- Сложность онboarding: 8000 строк `dto.js`.
- Нет unit-тестов на уровне репозитория.
- Дублирование логики фильтрации (SQL + JS post-filter).

### 12.2. Целевая архитектура

```
Prisma schema ──migrate──► PostgreSQL
       │
       ▼
 Prisma Client (+ @prisma/adapter-pg)
       │
       ▼
 Repository layer (typed queries)
       │
       ▼
 Service/DTO layer (business logic, cache)
       │
       ▼
 server.js (HTTP)
```

### 12.3. Поэтапный план миграции

#### Фаза 0 — Подготовка (1–2 дня)

- [ ] `npm run db:generate`, добавить `@daibilet/db` export PrismaClient.
- [ ] Создать `apps/backend/src/prisma.js` — singleton client с adapter-pg.
- [ ] CI: `db:validate` + smoke test подключения.
- [ ] Зафиксировать baseline perf (`npm run public:perf`).

#### Фаза 1 — Admin CRUD (1–2 недели)

Низкий риск, простые CRUD:

- `updateAdminEventOverride` → `prisma.eventOverride.upsert`
- `updateAdminVenue` → `prisma.venue.update`
- Списки admin events/venues/orders → `findMany` + `include`

**Критерий:** admin routes не вызывают `db.query` напрямую.

#### Фаза 2 — Repository для справочников (1 неделя)

- Cities, Categories, Tags, Sources — `findMany` с фильтрами.
- Заменить `destinationRows`, `categoryRows` и аналоги.

#### Фаза 3 — Catalog query (2–4 недели) ⚠️ самое сложное

`publicCatalogSessionsFast()` — монолитный SQL с CTE, array_agg, groupKey.

**Стратегии (выбрать одну):**

| Подход | Плюсы | Минусы |
|--------|-------|--------|
| **A. `$queryRaw` + Prisma типы** | Минимальный diff, сохраняет perf | SQL остаётся строкой |
| **B. Materialized view + Prisma** | Быстрые простые SELECT | Нужен refresh job |
| **C. Denormalized `CatalogSession` table** | Prisma-native, индексируемо | ETL после каждого sync |
| **D. PostGIS/JSON table** | Гибко | Over-engineering для MVP |

**Рекомендация для MVP:** **A → C**.

1. Краткосрочно: обернуть текущий SQL в `prisma.$queryRaw` с `Prisma.sql` tagged template и zod-валидацией результата.
2. Среднесрочно: таблица `CatalogSessionSnapshot` (jsonb row + indexes), заполняется после sync; public API читает из неё через Prisma.

#### Фаза 4 — Разрез dto.js (2–3 недели)

```
dto.js  →  services/
              catalog.service.js
              venue.service.js
              city.service.js
              landing.service.js
              admin/
           repositories/
              event.repository.js
              venue.repository.js
           mappers/
              public-session.mapper.js
```

#### Фаза 5 — Удаление pg Pool (1 день)

- Удалить `db.js` raw pool или оставить только для `$queryRaw` edge cases.
- ESLint rule: запрет `pool.query` вне repositories.

### 12.4. Что НЕ мигрировать на Prisma в лоб

- Тяжёлые аналитические aggregate для `/stats` — оставить `$queryRaw` или materialized view.
- Full-text search — позже PostgreSQL `tsvector` или Meilisearch.
- Batch import scripts — можно оставить `pg` copy/stream для скорости.

### 12.5. Prisma 7 — технические заметки

- Конфиг: `packages/db/prisma.config.ts` (Prisma 7 style).
- Client output: `packages/db/src/generated/prisma`.
- Adapter: `@prisma/adapter-pg` + существующий `pg` pool (рекомендуется Prisma docs 2025+).
- Migrate prod: `prisma migrate deploy` (не `migrate dev`).

Пример bootstrap:

```javascript
// apps/backend/src/prisma.js
import { PrismaClient } from '@daibilet/db/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });
```

### 12.6. Карта admin-эндпоинтов → репозитории

Целевая структура (фаза 1):

```
apps/backend/src/
  prisma.js
  repositories/
    taxonomy.repository.js      # GET /api/admin/taxonomy
    city.repository.js          # GET /api/admin/cities
    venue.repository.js         # GET/PUT /api/admin/venues/:id
    event-override.repository.js
    event-taxonomy.repository.js
    order.repository.js
    source.repository.js        # GET /api/admin/sources (+ $queryRaw)
  services/admin/
    events.service.js           # группировка, quickFilters — остаётся в service
    orders.service.js
    dashboard.service.js
```

| HTTP | Текущая функция (`dto.js`) | Репозиторий | Стратегия Prisma |
|------|----------------------------|-------------|------------------|
| `GET /api/admin/taxonomy` | `buildAdminTaxonomy` | `taxonomy.repository` | `findMany` ×3 |
| `GET /api/admin/cities` | `buildAdminCitiesList` | `city.repository` | `findMany` + `include` |
| `GET /api/admin/venues` | `buildAdminVenuesList` | `venue.repository` | `findMany` + post-filter `q` |
| `GET /api/admin/venues/:id` | `buildAdminVenueDetail` | `venue.repository` | `findUnique` + `include.events` |
| `PUT /api/admin/venues/:id` | `updateAdminVenue` | `venue.repository` | `update` |
| `GET /api/admin/events/:id` | `buildAdminEventDetail` | `event.repository` | `findUnique` + nested `include` |
| `PUT /api/admin/events/:id/override` | `updateAdminEventOverride` | `event-override.repository` | `upsert` |
| `PUT /api/admin/events/:id/taxonomy` | `updateAdminEventTaxonomy` | `event-taxonomy.repository` | `$transaction` |
| `GET /api/admin/orders` | `buildAdminOrdersList` | `order.repository` | `findMany` + `include` (фильтры в service) |
| `GET /api/admin/sources` | `buildAdminSources` | `source.repository` | **`$queryRaw`** (aggregate sync stats) |
| `GET /api/admin/events` | `buildAdminEventsList` | `event.repository` + `events.service` | `findMany` базовый набор → **JS-группировка в service** |
| `GET /api/admin/dashboard` | `buildAdminDashboard` | несколько repo | orchestration в `dashboard.service` |

**Правило:** репозиторий не знает про HTTP, кэш public API и `LANDING_RULES`. Service вызывает 1–N репозиториев и мапперы.

### 12.7. Примеры репозиториев

#### `taxonomy.repository.js` → `GET /api/admin/taxonomy`

Заменяет три отдельных `db.query` в `buildAdminTaxonomy`.

```javascript
// apps/backend/src/repositories/taxonomy.repository.js
export async function listTaxonomy(prisma) {
  const [categories, subcategories, tags] = await Promise.all([
    prisma.category.findMany({
      select: { id: true, slug: true, title: true, position: true },
      orderBy: [{ position: 'asc' }, { title: 'asc' }],
    }),
    prisma.subcategory.findMany({
      select: { id: true, categoryId: true, slug: true, title: true, position: true },
      orderBy: [{ position: 'asc' }, { title: 'asc' }],
    }),
    prisma.tag.findMany({
      select: { id: true, slug: true, title: true },
      orderBy: { title: 'asc' },
    }),
  ]);

  return { categories, subcategories, tags };
}
```

#### `city.repository.js` → `GET /api/admin/cities`

```javascript
// apps/backend/src/repositories/city.repository.js
export async function listAdminCities(prisma) {
  const rows = await prisma.city.findMany({
    include: {
      region: { select: { id: true, slug: true, title: true } },
      _count: { select: { events: true, venues: true } },
    },
    orderBy: [{ isDestination: 'desc' }, { title: 'asc' }],
  });

  return rows.map((city) => ({
    id: city.id,
    slug: city.slug,
    name: city.title,
    type: city.isDestination ? 'city' : 'region-hub',
    region: city.region?.title || null,
    events: city._count.events,
    venues: city._count.venues,
    isDestination: city.isDestination,
  }));
}
```

#### `venue.repository.js` → `GET/PUT /api/admin/venues/:id`

```javascript
// apps/backend/src/repositories/venue.repository.js
export async function findVenueById(prisma, venueId) {
  return prisma.venue.findUnique({
    where: { id: venueId },
    include: {
      city: { select: { title: true } },
      events: {
        take: 24,
        orderBy: { sessions: { _count: 'desc' } },
        select: {
          id: true,
          title: true,
          status: true,
          priceFromRub: true,
          sessions: {
            take: 1,
            orderBy: { startsAt: 'asc' },
            select: { startsAt: true },
          },
        },
      },
    },
  });
}

export async function updateVenue(prisma, venueId, payload) {
  return prisma.venue.update({
    where: { id: venueId },
    data: {
      title: payload.title,
      description: payload.description,
      shortDescription: payload.shortDescription,
      heroImageUrl: payload.heroImageUrl,
      seoH1: payload.seoH1,
      seoTitle: payload.seoTitle,
      seoDescription: payload.seoDescription,
      canonicalPath: payload.canonicalPath,
      isIndexable: payload.isIndexable,
      address: payload.address,
      kind: payload.kind,
      pageStatus: payload.pageStatus,
    },
  });
}
```

#### `event-override.repository.js` → `PUT /api/admin/events/:id/override`

Прямая замена `updateAdminEventOverride` (upsert по `eventId`).

```javascript
// apps/backend/src/repositories/event-override.repository.js
import { randomUUID } from 'node:crypto';

export async function upsertEventOverride(prisma, eventId, payload) {
  const current = await prisma.eventOverride.findUnique({ where: { eventId } });

  return prisma.eventOverride.upsert({
    where: { eventId },
    create: {
      id: randomUUID(),
      eventId,
      title: payload.title ?? null,
      description: payload.description ?? null,
      shortDescription: payload.shortDescription ?? null,
      imageUrl: payload.imageUrl ?? null,
      seoH1: payload.seoH1 ?? null,
      seoTitle: payload.seoTitle ?? null,
      seoDescription: payload.seoDescription ?? null,
      canonicalPath: payload.canonicalPath ?? null,
      isIndexable: payload.isIndexable ?? null,
      editorStatus: payload.editorStatus ?? null,
    },
    update: {
      title: payload.title ?? current?.title ?? null,
      description: payload.description ?? current?.description ?? null,
      shortDescription: payload.shortDescription ?? current?.shortDescription ?? null,
      imageUrl: payload.imageUrl ?? current?.imageUrl ?? null,
      seoH1: payload.seoH1 ?? current?.seoH1 ?? null,
      seoTitle: payload.seoTitle ?? current?.seoTitle ?? null,
      seoDescription: payload.seoDescription ?? current?.seoDescription ?? null,
      canonicalPath: payload.canonicalPath ?? current?.canonicalPath ?? null,
      isIndexable: payload.isIndexable ?? current?.isIndexable ?? null,
      editorStatus: payload.editorStatus ?? current?.editorStatus ?? null,
    },
  });
}
```

#### `event-taxonomy.repository.js` → `PUT /api/admin/events/:id/taxonomy`

Заменяет цикл `insert` + `delete` в `updateAdminEventTaxonomy`; атомарность через транзакцию.

```javascript
// apps/backend/src/repositories/event-taxonomy.repository.js
export async function updateEventTaxonomy(prisma, eventId, { categoryId, primarySubcategoryId, subcategoryIds, tagIds }) {
  const uniqueSubcategoryIds = [...new Set([primarySubcategoryId, ...subcategoryIds].filter(Boolean))];
  const uniqueTagIds = [...new Set(tagIds.filter(Boolean))];

  return prisma.$transaction(async (tx) => {
    await tx.event.update({
      where: { id: eventId },
      data: { categoryId, primarySubcategoryId },
    });

    await tx.eventSubcategory.deleteMany({ where: { eventId } });
    if (uniqueSubcategoryIds.length) {
      await tx.eventSubcategory.createMany({
        data: uniqueSubcategoryIds.map((subcategoryId) => ({
          eventId,
          subcategoryId,
          isPrimary: subcategoryId === primarySubcategoryId,
        })),
      });
    }

    await tx.eventTag.deleteMany({ where: { eventId } });
    if (uniqueTagIds.length) {
      await tx.eventTag.createMany({
        data: uniqueTagIds.map((tagId) => ({ eventId, tagId })),
        skipDuplicates: true,
      });
    }

    return tx.event.findUnique({
      where: { id: eventId },
      include: {
        category: true,
        primarySubcategory: true,
        subcategories: { include: { subcategory: true } },
        tags: { include: { tag: true } },
      },
    });
  });
}
```

#### `order.repository.js` → `GET /api/admin/orders`

Prisma покрывает join tickets/events; фильтры `view`, `q`, пагинация — в `orders.service.js`.

```javascript
// apps/backend/src/repositories/order.repository.js
export async function listExternalOrders(prisma) {
  return prisma.externalOrder.findMany({
    include: {
      source: { select: { code: true, name: true } },
      tickets: {
        include: {
          event: { select: { id: true, title: true, slug: true } },
          session: { select: { startsAt: true } },
        },
      },
    },
    orderBy: [{ purchasedAt: 'desc' }, { updatedAt: 'desc' }],
  });
}
```

#### `source.repository.js` → `GET /api/admin/sources` (гибрид)

Агрегаты sync-run и groupedEvents пока оставляем в `$queryRaw` — Prisma findMany не заменит lateral join без дублирования SQL.

```javascript
// apps/backend/src/repositories/source.repository.js
import { Prisma } from '@daibilet/db/generated/prisma';

export async function listSourcesWithSyncHealth(prisma) {
  return prisma.$queryRaw`
    select
      source.id,
      source.code::text as code,
      source.name,
      source.enabled,
      latest.status::text as "lastSyncStatus",
      latest."finishedAt" as "lastSyncFinishedAt"
    from "Source" source
    left join lateral (
      select status, "finishedAt"
      from "SourceSyncRun"
      where "sourceId" = source.id
      order by "startedAt" desc
      limit 1
    ) latest on true
    order by source.code asc
  `;
}
```

### 12.8. Подключение в `server.js` (целевой паттерн)

```javascript
import { prisma } from './prisma.js';
import { listTaxonomy } from './repositories/taxonomy.repository.js';
import { upsertEventOverride } from './repositories/event-override.repository.js';
import { buildAdminEventsList } from './services/admin/events.service.js';

// GET /api/admin/taxonomy
if (route === 'GET /api/admin/taxonomy') {
  return sendJson(response, await listTaxonomy(prisma));
}

// PUT /api/admin/events/:id/override
if (route.startsWith('PUT /api/admin/events/') && route.endsWith('/override')) {
  const eventId = extractEventId(pathname);
  const payload = await readJsonBody(request);
  return sendJson(response, await upsertEventOverride(prisma, eventId, payload));
}

// GET /api/admin/events — service orchestrates repo + groupAdminEventRows
if (route === 'GET /api/admin/events') {
  return sendJson(response, await buildAdminEventsList(prisma, searchParams));
}
```

**Не переносить в репозиторий:** `groupAdminEventRows`, `matchesRule`, `publicCatalogSessionsFast`, in-memory cache — это слой `services/` + `mappers/`.

---

## 13. Технический долг и roadmap

| Приоритет | Задача | Обоснование |
|-----------|--------|-------------|
| Критический | Разрезать `dto.js` | Поддерживаемость |
| Высокий | Materialized catalog / snapshot table | Cold perf 8s → <500ms |
| Высокий | Ускорить `/api/public/stats` | 600ms на каждой главной (исправлено частично для не-home) |
| Высокий | React Router или SSR (Next/Remix) | SEO, TTFB, deep links |
| Средний | Prisma Client фаза 1–2 | Типизация admin |
| Средний | Тексты для 16 Teplohod-событий без описания | Контент |
| Средний | `relatedVenues` по гео/типу, не top-by-city | UX локаций |
| Низкий | CDN для static + API edge cache | Latency регионов |
| Низкий | E2E smoke (Playwright) | CI |

---

## 14. Стандарты разработки

- **Язык UI:** русский.
- **Коммиты:** по запросу; не force-push main.
- **Секреты:** только `.env`, не в git.
- **Prod SQL:** через `docker exec … psql` или scripts с `NODE_PATH`.
- **Документация:** обновлять `Project.md` при архитектурных изменениях; прогресс — `Tasktracker.md`; решения — `Diary.md`.

---

## 15. Связанные документы

| Документ | Тема |
|----------|------|
| [mvp-spec.md](./mvp-spec.md) | Продуктовая спецификация |
| [deploy-timeweb.md](./deploy-timeweb.md) | Деплой |
| [integrations.md](./integrations.md) | Ticketscloud, Teplohod |
| [public-performance-snapshot.md](./public-performance-snapshot.md) | Perf baseline |
| [seo-public-mvp.md](./seo-public-mvp.md) | SEO |
| [Tasktracker.md](./Tasktracker.md) | Статус задач |
| [Diary.md](./Diary.md) | Технический дневник |
| [qa.md](./qa.md) | Открытые вопросы |
