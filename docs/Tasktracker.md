# Tasktracker — Дайбилет

Обновлено: **2026-07-05**. Источник требований: [Project.md](./Project.md).

Легенда: ✅ Готово · 🔄 В работе · ⏳ Запланировано · ❌ Отменено

---

## Критический приоритет

| Статус | Задача | Комментарий |
|--------|--------|-------------|
| ✅ | Public catalog saleable + группировка дублей | groupKey, слоты в EventCard |
| ✅ | Prod deploy Timeweb MVP | daibilet.ru live |
| ✅ | Ticketscloud + Teplohod import pipeline | scripts + auto-sync TEP |
| ⏳ | Разрезать `dto.js` на services/repositories | Техдолг, блокирует Prisma migration |
| ⏳ | Catalog snapshot / materialized view | Cold 8s → target <500ms |

---

## Высокий приоритет

| Статус | Задача | Комментарий |
|--------|--------|-------------|
| ✅ | Perf: venueIndex, slugIndex, destinationIndex | dto.js in-memory |
| ✅ | Perf: HTTP Cache-Control public JSON | server.js |
| ✅ | Perf: lazy routes public SPA | App.tsx |
| ✅ | Perf: localStorage SWR caches | city, venue, catalog, event, landing |
| ✅ | Perf: venue catalog warm lists | institution/location на старте API |
| ✅ | Perf: страница локации (prefetch, no stats on subpages) | index.html + main.tsx |
| ✅ | TZ: локальное время города | city-timezone.js, datetime.ts |
| ✅ | Merge Stage StandUp Club | canonicalVenueMergeTitle + override |
| ✅ | EventOverride batch ~1700 описаний | apply-event-manual-content.js |
| ⏳ | Ускорить `/api/public/stats` | ~600ms warm |
| ⏳ | Prisma Client фаза 0–1 (bootstrap + admin CRUD) | см. Project.md §12 |
| ⏳ | 16 Teplohod-событий без описания (Москва) | тексты не были в batch |

---

## Средний приоритет

| Статус | Задача | Комментарий |
|--------|--------|-------------|
| ✅ | CityPicker: scroll всех городов | CityPicker.tsx |
| ✅ | CitiesCatalogPage: «по всей территории России» | UI copy |
| ⏳ | relatedVenues по типу площадки (pier→pier) | частично в dto.js |
| ⏳ | Venue SEO тексты (batch 1–7) | scripts/data |
| ⏳ | React Router или SSR | SEO deep links |
| ⏳ | E2E smoke Playwright | CI |
| ⏳ | Admin: managed landings UI polish | admin-lovable plan |

---

## Низкий приоритет

| Статус | Задача | Комментарий |
|--------|--------|-------------|
| ⏳ | CDN edge cache | Cloudflare / nginx proxy_cache |
| ⏳ | Meilisearch / FTS | поиск >2 символов |
| ⏳ | SPB Boats extraction | spbboats-mvp-extraction-plan.md |
| ⏳ | Blog/articles CMS | schema есть, UI минимален |

---

## Завершённые блоки (2026-06 — 2026-07)

- MVP public: главная, каталог, событие, город, площадка, локация, лендинги
- Admin dashboard: events, venues, orders, landings, taxonomy
- Site user auth (register/login/orders)
- External order mirror
- Public performance iteration (2 волны)
- Content overrides (events + venues)

---

## Метрики для закрытия perf-эпика

| Метрика | Сейчас (prod warm) | Цель |
|---------|-------------------|------|
| `/api/public/venues?family=institution` | ~3 ms | <50 ms ✅ |
| `/api/public/cities/:slug` | ~10 ms | <100 ms ✅ |
| `/api/public/stats` | ~600 ms | <200 ms |
| Cold catalog после refresh | ~8 s | <1 s |
| HTML TTFB daibilet.ru | ~50 ms | <200 ms ✅ |

Замеры: `scripts/public-performance-snapshot.mjs`, prod curl.
