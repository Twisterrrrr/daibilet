# Фаза C — Целостность данных

**Дата закрытия:** 2026-07-10  
**Ветка:** `integrate/mvp-launch`  
**Статус:** ✅ Закрыта (код + docs; прогон на prod — после deploy)

---

## Цель фазы

После sync видно, что данные согласованы: связи source → event → session → offer → widget URL, admin-правки не затираются, отклонения фиксируются автоматически.

---

## Что сделано

| # | Задача | Артефакт |
|---|--------|----------|
| C1 | Автопроверка инвариантов БД | `scripts/sync-invariants-check.js` |
| C2 | npm script | `npm run check:sync-invariants` |
| C3 | Защита Event при import | `scripts/lib/event-import-guard.js` |
| C4 | TC + TEP upsert с guard | slug и status не перезаписываются при модерации |
| C5 | Порог `missingFromCatalog` | env `SYNC_MISSING_WARN_THRESHOLD` (default 50) |

---

## Инварианты (`check:sync-invariants`)

| ID | Проверка | FAIL если |
|----|----------|-----------|
| `tc_events_without_source_link` | TC offer без EventSourceLink | count > 0 |
| `tep_events_without_source_link` | TEP offer без EventSourceLink | count > 0 |
| `tc_offers_without_widget_url` | TC offer без widgetUrl | count > 0 |
| `tep_offers_without_deeplink` | TEP offer без deeplink/widget URL | count > 0 |
| `tc_provider_links` | ProviderLink для TC | count < 1 |
| `tep_provider_links` | ProviderLink для TEP | count < 1 |
| `tc_sessions_without_external_id` | TC session без externalId | count > 0 |
| `tep_events_without_sessions` | TEP event без сеансов (orphan) | count > 0 |
| `tc_last_sync_failed` | последний TC sync | status = FAILED |
| `tep_last_sync_failed` | последний TEP sync | status = FAILED |
| `tc_missing_from_catalog` | stats последнего успешного TC sync | > порога |
| `tep_missing_from_catalog` | stats последнего успешного TEP sync | > порога |
| `hidden_events_with_ready_status_conflict` | Event не HIDDEN, override HIDDEN | count > 0 (warn) |

Выход: JSON + exit code 1 при любом FAIL.

```bash
npm run check:sync-invariants
SYNC_MISSING_WARN_THRESHOLD=100 npm run check:sync-invariants
```

Рекомендуется после каждого sync и в nightly cron на сервере.

---

## Защита admin-правок при import

Модуль `event-import-guard.js` — SQL для `ON CONFLICT DO UPDATE`:

| Поле | Поведение при update |
|------|----------------------|
| `slug` | **не меняется** (URL стабилен) |
| `status` | **не меняется**, если `HIDDEN` или есть `EventOverride` с контентом/editorStatus |

`EventOverride` таблица import **не трогает** — SEO/тексты из override по-прежнему через dto.js.

TEP upsert переведён с `ON CONFLICT (slug)` на `ON CONFLICT (id)` — согласовано с TC.

---

## Workflow после sync

```bash
npm run tc:sync && npm run check:sync-invariants && npm run check:widgets
npm run tep:sync && npm run check:sync-invariants
```

На сервере (staging перед prod):

```bash
curl -X POST .../api/v1/tc/sync
npm run check:sync-invariants
npm run check:widgets -- --base https://staging.daibilet.ru
```

---

## Exit criteria

| Критерий | Статус |
|----------|--------|
| Скрипт инвариантов | ✅ |
| Import guards slug/status | ✅ |
| Документация + npm script | ✅ |
| Prod baseline прогон | ⏳ после deploy фазы B+C |
| Отдельная staging БД | ⏳ ops (фаза D / infra) |

---

## Известные ограничения

1. **TEP orphan events:** события в `missingFromCatalog` могут остаться без sessions после fixture sync — инвариант `tep_events_without_sessions` это ловит.
2. **TC offers без token:** если на сервере нет `TICKETSCLOUD_WIDGET_TOKEN`, `tc_offers_without_widget_url` будет > 0 — это конфиг, не баг import.
3. **Shared DB:** инварианты на staging = prod до разделения БД.

---

## Следующая фаза

**Фаза D — deploy / parity:** выкат B+C на сервер, CI hook, typed stack parity на staging.

См. [README.md](./README.md)
