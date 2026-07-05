# Diary — технический дневник Дайбилет

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
