# Фаза B — Импорт sync → БД

**Дата закрытия:** 2026-07-10  
**Ветка:** `integrate/mvp-launch`  
**Статус:** ✅ Закрыта (код + docs; прогон на prod — после deploy)

---

## Цель фазы

Один вызов sync обновляет данные поставщика в PostgreSQL, синхronизирует `ProviderLink`, возвращает diff stats. Без потери связи event → session → offer → widget URL.

---

## Что сделано

| # | Задача | Файл / endpoint |
|---|--------|-----------------|
| B1 | TC: fetch JSON → upsert БД | `scripts/tc-import-catalog.js` |
| B2 | TC: chain в admin API | `POST /api/v1/tc/sync` → full-sync + import |
| B3 | ProviderLink после импорта | `scripts/lib/provider-link-sync.js` |
| B4 | TEP: ProviderLink + diff stats | `scripts/tep-import-fixtures.js` |
| B5 | npm scripts | `tc:import`, `tc:sync`, `tep:sync` |
| B6 | `widgetUrl` на TC offers | `TICKETSCLOUD_WIDGET_TOKEN` + `event` param |

---

## Поток данных

### Ticketscloud

```
POST /api/v1/tc/sync
  → tc-full-sync.js          (gRPC → catalog.public.json)
  → tc-import-catalog.js     (JSON → PostgreSQL, транзакция)
  → syncProviderLinksForSource(src_ticketscloud)
  → invalidatePublicCaches()
```

Локально:

```bash
npm run tc:sync          # fetch + import
npm run tc:import        # только import из JSON
```

### Teplohod

```
POST /api/v1/tep/sync
  → tep-import-fixtures.js   (fixtures/API → PostgreSQL)
  → syncProviderLinksForSource(src_teplohod)
  → invalidatePublicCaches()
```

Auto-sync TEP (server.js) — тот же `runTeplohodSync()`.

---

## Stats в ответе sync (`SourceSyncRun.stats`)

### TC import

| Поле | Смысл |
|------|--------|
| `sourceEvents` | строк в JSON каталоге |
| `eventsBefore` / `eventsAfter` | EventSourceLink до/после |
| `importedEvents` | обработано upsert |
| `sessions`, `offers` | записано |
| `offersWithWidgetUrl` | offers с widgetUrl |
| `eventsWithoutWidgetUrl` | события без token (нет env) |
| `missingFromCatalog` | в БД, но нет в текущем JSON |
| `providerLinks` | строк ProviderLink после sync |
| `durationMs` | время импорта |

### TEP import

Те же `eventsBefore/After`, `missingFromCatalog`, `providerLinks` + `openDateEvents`, `withoutEventTimes`.

---

## Env для widget URL (TC)

```env
TICKETSCLOUD_WIDGET_TOKEN=   # или TC_WIDGET_TOKEN
TICKETSCLOUD_WIDGET_BASE_URL=https://ticketscloud.org/v1/widgets/common
DATABASE_URL=
```

Без token: import пройдёт, но `offersWithWidgetUrl=0` → фаза A `check:widgets` может FAIL на новых событиях.

---

## Exit criteria

| Критерий | Статус |
|----------|--------|
| TC admin sync = fetch + DB | ✅ код |
| TEP import обновляет ProviderLink | ✅ |
| Diff stats в SourceSyncRun | ✅ |
| Shared module provider-link-sync | ✅ |
| Prod deploy + live sync smoke | ⏳ после push/deploy |

---

## Риски / ограничения

1. **TEP full replace sessions:** перед импортом удаляются sessions/offers всех TEP-событий; события из `missingFromCatalog` остаются без сеансов.
2. **TC не удаляет** события из БД — только upsert + счётчик `missingFromCatalog`.
3. **Shared DB** staging/prod — sync на staging меняет prod-каталог.
4. **Импорт TC ~5k events** — долгий прогон; первый deploy лучше на staging.

---

## Проверка после deploy

```bash
# Admin (с auth)
curl -X POST https://staging.daibilet.ru/api/v1/tc/sync
curl -X POST https://staging.daibilet.ru/api/v1/tep/sync

# Widget fields не сломались
npm run check:widgets -- --base https://staging.daibilet.ru
```

SQL:

```sql
select id, status, stats, "finishedAt"
from "SourceSyncRun"
order by "startedAt" desc
limit 5;
```

---

## Следующая фаза

**Фаза C — целостность:** nightly инварианты, алерт на `missingFromCatalog`, защита admin overrides при upsert.

См. [README.md](./README.md)
