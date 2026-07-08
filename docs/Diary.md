# Diary — технический дневник Дайбилет

---

## 2026-07-09

### Наблюдения

- Спринт 1–2 недели: institution relink (топ аудита), publish CANDIDATE, блог, лёгкий `/stats`.
- На prod institution relink уже был выполнен ранее (`relinked: 0`); 18 institution в `PUBLISHED`.
- `/api/public/stats` после precomputed cache: **~5 ms** warm (было ~600 ms).
- Скрипты на prod требуют `NODE_PATH=/opt/daibilet/packages/db/node_modules` для `require('pg')`.

### Решения

- **Stats:** `publicStatsCache` в `dto.js`, счётчик events из `publicCatalogSessions` (groupKey), HTTP cache через `withPublicResponseCache('stats')`.
- **Блог:** `GET /api/public/articles`, `GET /api/public/articles/:slug`, admin CRUD; public `BlogArticlePage`, admin `ArticlesPage`; `seed-blog-articles.js` — 4 статьи.
- **Venues list:** fallback `shortDescription` из `description` в `mapPublicVenueListItem`; backfill 174 venues.
- **Institution:** расширен `INSTITUTIONS` (Исаакий, Петергоф, Русский музей, Юсуповский, Мариинский, Спас на Крови, Кунсткамера и др.); auto-publish при apply.
- Ссылки на главной `/blog#slug` → `/blog/:slug`.
- Batch10: последние 33 institution без описания.

### Проблемы

- Prisma/NextJS redesign — отдельная задача Codex, не в этом спринте.
- Cold catalog ~8 s — snapshot/MV всё ещё в backlog.

---

## 2026-07-08

### Наблюдения

- Квесты Ticketscloud часто привязаны к `MEETING_POINT` с адресом вместо institution; в заголовке часто есть «квест по Пушкинскому музею / зоопарку / Третьяковке».
- Аудит institution-context: ~9710 meeting point/адрес; ~4768 с учреждением в заголовке; relink скриптом покрыл 1229 (7 учреждений в `INSTITUTIONS`).
- В каталоге `/venues` API отдаёт `city`, но list view показывал только улицу — `formatStreetAddress` вырезает город.
- Длинные сессии агента тормозят из-за контекста (SSH, JSON-аудиты, summary), не из-за регрессии API.

### Решения

- `scripts/create-institution-venues.js` — создание institution + relink + hide meeting points; fix порядка `promoteVenueIds` до regex.
- `event-venue-context.js` + поля `institutionVenue*` в API и на EventPage.
- EventPage: адрес отдельно от площадки, убран «Смотрите также».
- Batch8 описаний venues (123 шт.) → 219 без описания.
- InstitutionListRow: город в строке; группировка по городам при «Все города».
- Handoff: [agent-handoff-2026-07-08.md](./agent-handoff-2026-07-08.md).

### Проблемы

- ~3263 события с institution в заголовке без карточки в БД — нужно расширять `INSTITUTIONS`.
- Эрмитаж в БД с kind `CONCERT_HALL` (исторический мусор).
- Workspace `DAIBILET` vs код в `daibilet-repo` — путаница путей.

---

## 2026-07-05

### Наблюдения

- Production API на `213.171.7.16`, ~1809 saleable-событий, прогрев кэша ~11 с.
- Runtime БД — **только `pg` Pool**; Prisma Client в приложении не подключён, хотя schema и migrations актуальны.
- `dto.js` (~8000 строк) — единственная точка сборки public catalog, venue hub, landings; in-memory кэши живут в процессе Node.
- Страница локации (причал Фонтанки): API ~2 ms, но UX «критично долго» из-за waterfall SPA (main bundle + lazy VenuePage + hydratePublicStats на всех страницах).
- Split city API на `/cities/:slug` + `/cities/:slug/venues` **ухудшил** UX — откатили к одному запросу.
- Stage StandUp Club был 3 карточки (залы) — merge по `canonicalVenueMergeTitle`.

### Решения

- **Perf public:** venueIndex, catalogFacets, warm venue lists, Cache-Control, localStorage caches, lazy routes.
- **Venue/location pages:** prefetch API в index.html; stats/home preview только на `/`; shell hero до расписания.
- **Venue merge:** отрезание `| Основной зал`, `| Красный зал` и т.п. в merge key; override в venue-address-overrides.json.
- **Event content:** batch EventOverride через JSON + script, ~1702 записи на prod.
- **Документация:** создан комплект docs/Project.md, Tasktracker, Diary, qa.

### Проблемы

- `/api/public/stats` остаётся ~600 ms — кандидат на materialized counter или отдельный лёгкий endpoint.
- Cold rebuild каталога 8–10 s после `?refresh=1` — нужна snapshot-таблица или MV.
- `relatedVenues` для pier возвращал institution (Stage StandUp) — добавлен фильтр по template.
- SSH на prod периодически unstable — деплой retry вручную.

---

## 2026-06-29

### Наблюдения

- Добавлена модель SiteUser (migration `20260629150000_site_user`).
- Public SPA без SSR — SEO зависит от meta в client JS.

### Решения

- Client-side applyCityMeta / applyVenueMeta для title/description.

### Проблемы

- —

---

## 2026-06-20

### Наблюдения

- Первый deploy на Timeweb Cloud по [deploy-timeweb.md](./deploy-timeweb.md).
- Репозиторий GitHub: Twisterrrrr/daibilet.

### Решения

- Структура `/opt/daibilet` + `/var/www/daibilet/{public,admin}`.
- systemd unit `daibilet-api`.

### Проблемы

- Сосуществование со старой версией сайта до полного cutover.

---

## 2026-06-19

### Наблюдения

- Baseline perf: cold catalog ~2 s locally, HTTP catalog warm <100 ms ([public-performance-snapshot.md](./public-performance-snapshot.md)).
- На prod с полной БД cold значительно выше.

### Решения

- Индексы migration `20260617130000_public_catalog_indexes`.

### Проблемы

- `buildPublicHome` cold >1 s — нужен preview endpoint (реализован позже).

---

## Шаблон новой записи

```markdown
## YYYY-MM-DD

### Наблюдения
- ...

### Решения
- ...

### Проблемы
- ...
```
