# Эталонные slug для проверки виджетов

Дата: 2026-07-10

Используются в `npm run check:widgets` (`scripts/widget-readiness-check.mjs`).

## Ticketscloud

| Slug | Что проверяем |
|------|----------------|
| `tc-6a266b49465e94f72b4ef8f6-interaktivnaya-vystavka-nyuton-park` | recurring, много слотов, purchaseUrl с token+event |
| `tc-6a3582f0bbd948da83dece6e-kombo-kvest` | TC, Санкт-Петербург |

## Teplohod

| Slug | Что проверяем |
|------|----------------|
| `progulka-ot-prichala-kitai-gorod-do-prichala-kievskii-826` | сеансы, widgetPayload.tepEventId |
| `centralnaya-krugovaya-rechnaya-progulka-ot-parka-zaryade-ves-centr-za-chas-683` | TEP, Москва |

## Критерии OK (API)

**TC:** `widgetPayload.tcEventId`, `purchaseUrl` с `token=` и `event=`, `purchaseReady !== false`.

**TEP:** `widgetPayload.tepEventId` (число), `tepWidgetId`, `purchaseUrl` → `teplohod.info/event/{id}`.

## Команды

```bash
npm run check:widgets
npm run check:widgets -- --base https://staging.daibilet.ru
npm run check:widgets -- --discover 30
```

Browser smoke (ручной): hard refresh → «Купить» → модал TC / TEP widget.
