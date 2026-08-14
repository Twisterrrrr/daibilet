# Контракт данных для виджетов

Дата: **2026-07-10**  
Проверка: `npm run check:widgets` (`scripts/widget-readiness-check.mjs`)

## Цепочка

```
Импорт (TC/TEP) → БД (Event, EventSession, EventOffer)
  → API dto.js (buildProviderWidgetPayload, purchaseUrl)
  → Public SPA (TcWidget.tsx, TeplohodWidget.tsx)
  → Скрипт поставщика (tcwidget.js / widget.js)
```

## Ticketscloud

### API (`GET /api/public/events/{slug}`)

| Поле | Обязательно | Назначение |
|------|-------------|------------|
| `widgetProvider` | да | `"TICKETSCLOUD"` |
| `widgetPayload.provider` | да | `"TICKETSCLOUD"` |
| `widgetPayload.tcEventId` | да | ID события у TC (hex) |
| `purchaseUrl` | да* | URL виджета с `token=` и `event=` |
| `purchaseReady` | да | `true` для активной покупки |
| `externalId` | да | fallback для tcEventId |

\* Либо `purchaseUrl` на event, либо на purchasable session.

### Sessions

| Поле | Обязательно | Назначение |
|------|-------------|------------|
| `purchaseUrl` | для слота | `https://ticketscloud.org/v1/widgets/common?token=…&event=…` |
| `purchaseReady` | да | `true` если можно купить |
| `vacant` | желательно | `0` → слот blocked (кроме TEP) |

### Frontend

| Env / источник | Назначение |
|----------------|------------|
| `VITE_TC_WIDGET_TOKEN` | JWT для `data-tc-token` (build public) |
| token в `purchaseUrl` | fallback если env пуст |
| `data-tc-event` | = `tcEventId` без префикса `r:` у token |

### Backend (fallback URL)

| Env | Назначение |
|-----|------------|
| `TICKETSCLOUD_WIDGET_TOKEN` / `TC_WIDGET_TOKEN` | построение widgetUrl в offers |
| `TICKETSCLOUD_WIDGET_BASE_URL` | default `https://ticketscloud.org/v1/widgets/common` |

## Teplohod

### API

| Поле | Обязательно | Назначение |
|------|-------------|------------|
| `widgetProvider` | да | `"TEPLOHOD"` |
| `widgetPayload.tepEventId` | да | числовой ID (`826`) |
| `widgetPayload.tepWidgetId` | да | ID виджета (default `14208`) |
| `purchaseUrl` | да | `https://teplohod.info/event/{id}` |
| `purchaseReady` | да | `true` |

### Frontend

| Env | Назначение |
|-----|------------|
| `VITE_TEP_WIDGET_ID` | `data-id` на embed (default `14208`) |
| `data-event-id` | = `tepEventId` |

### Backend

| Env | Назначение |
|-----|------------|
| `TEP_WIDGET_ID` | в `widgetPayload.tepWidgetId` |
| `TEP_WIDGET_BASE_URL` | default `https://teplohod.info` |

## Критерии FAIL (автопроверка)

- TC: нет `tcEventId`, нет `token=` или `event=` в purchaseUrl, `purchaseReady=false`
- TEP: `tepEventId` не число, нет `tepWidgetId`, URL не `teplohod.info/event/`

## Browser smoke (ручной чеклист)

После API OK — hard refresh (Ctrl+Shift+R):

1. Открыть event detail эталона
2. Нажать «Купить билет»
3. TC: модал / iframe ticketscloud; TEP: модал teplohod
4. Консоль: нет 404 на `/assets/*`, нет CORS на API

Эталонные slug: [widget-etalon-slugs.md](./widget-etalon-slugs.md)
