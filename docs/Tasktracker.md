# Tasktracker — Дайбилет

Обновлено: **2026-07-09**. Источник требований: [Project.md](./Project.md). Handoff: [agent-handoff-2026-07-08.md](./agent-handoff-2026-07-08.md).

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
| ✅ | Ускорить `/api/public/stats` | precomputed cache, prod warm ~5 ms |
| ⏳ | Prisma Client фаза 0–1 (bootstrap + admin CRUD) | см. Project.md §12 |
| ⏳ | 16 Teplohod-событий без описания (Москва) | тексты не были в batch |
| ✅ | Institution-площадки (зоопарк, Третьяковки, Кремль, ВДНХ) | create-institution-venues.js на prod |
| ✅ | Relink квестов meeting point → institution | 1229 событий, 7 учреждений |
| ✅ | EventPage: адрес vs площадка, institution из заголовка | event-venue-context.js |
| ✅ | Venues catalog list: город + группировка по городам | InstitutionListRow.tsx |
| ✅ | Расширить INSTITUTIONS + relink оставшихся ~3500 квестов | +999 relink (Исаакий, Петропавловка, Петергоф…) |
| ✅ | Publish institution venues CANDIDATE → PUBLISHED | 18 площадок, isIndexable=true |
| ✅ | 141 institution: описания batch9–10 | apply-venue-manual-content + shortDescription backfill |
| ✅ | Блог vertical slice | API + public `/blog/:slug` + admin `/articles`, seed 4 статьи |

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
| ✅ | Blog/articles CMS | API + admin ArticlesPage + public BlogArticlePage |

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
| `/api/public/stats` | ~5 ms | <200 ms ✅ |
| Cold catalog после refresh | ~8 s | <1 s |
| HTML TTFB daibilet.ru | ~50 ms | <200 ms ✅ |

Замеры: `scripts/public-performance-snapshot.mjs`, prod curl.
