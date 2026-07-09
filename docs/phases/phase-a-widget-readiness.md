# Фаза A — Цепочка «данные → виджет»

**Дата закрытия:** 2026-07-10  
**Ветка:** `integrate/mvp-launch`  
**Статус:** ✅ Закрыта (API-автоматизация; browser smoke — чеклист для ручной проверки)

---

## Цель фазы

Убедиться, что для эталонных событий API отдаёт все поля, необходимые для открытия виджетов TC и Teplohod, без потери ID и purchase URL.

Продажи и ExternalOrder **не в scope**.

---

## Что сделано

| # | Задача | Результат |
|---|--------|-----------|
| A1 | Контракт полей API | [widget-data-contract.md](../widget-data-contract.md) |
| A2 | Эталонные slug (4 шт.) | [widget-etalon-slugs.md](../widget-etalon-slugs.md) |
| A3 | Автопроверка API | `scripts/widget-readiness-check.mjs`, `npm run check:widgets` |
| A4 | Проверка prod + staging | 4/4 OK на обоих контурах |
| A5 | Доступность скриптов виджетов | HTTP 200: tcwidget.js, teplohod widget.js |

---

## Результаты прогона (2026-07-10)

### Prod (`https://daibilet.ru`)

```
checked: 4, failed: 0
```

| Slug | Provider | tcEventId / tepEventId | sessions |
|------|----------|------------------------|----------|
| `tc-6a266b49465e94f72b4ef8f6-interaktivnaya-vystavka-nyuton-park` | TC | `6a266b49465e94f72b4ef8f6` | 5 |
| `tc-6a3582f0bbd948da83dece6e-kombo-kvest` | TC | `6a3582f0bbd948da83dece6e` | 5 |
| `progulka-ot-prichala-kitai-gorod-do-prichala-kievskii-826` | TEP | `826` | 5 |
| `centralnaya-krugovaya-rechnaya-progulka-ot-parka-zaryade-ves-centr-za-chas-683` | TEP | `683` | 5 |

### Staging (`https://staging.daibilet.ru`)

```
checked: 4, failed: 0
```

Те же slug — идентичные widget fields (shared DB).

### Stats API (prod)

```json
{ "events": 2386, "destinations": 41, "venues": 1057, "landings": 14 }
```

---

## Exit criteria

| Критерий | Статус |
|----------|--------|
| Эталоны зафиксированы в docs | ✅ |
| Автопроверка API без браузера | ✅ |
| Prod: все эталоны green | ✅ |
| Staging: все эталоны green | ✅ |
| Browser smoke (модал TC/TEP) | ⏳ Ручной чеклист в widget-data-contract.md |

---

## Не входило в фазу A

- TC import в БД одним шагом → **Фаза B**
- ProviderLink после sync → **Фаза B**
- Sync diff / инварианты → **Фаза C**
- Deploy скриптов на сервер → **Фаза D**

---

## Команды

```bash
npm run check:widgets
npm run check:widgets -- --base https://staging.daibilet.ru
npm run check:widgets -- --discover 30
```

---

## Следующая фаза

**Фаза B — Импорт:** `tc-import-catalog.js`, chain в `POST /api/v1/tc/sync`, ProviderLink после TEP/TC sync.

См. [README.md](./README.md)
