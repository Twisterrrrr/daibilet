# Яндекс.Метрика - цели воронки (CV.2b-e, CV.2f)

**Обновлено:** 2026-08-07  
**Счётчик:** `106786540` (`NEXT_PUBLIC_YANDEX_METRIKA_ID`)  
**Код:** `apps/web/src/lib/catalog-analytics.ts`  
**GTM:** опционально (дублирует `dataLayer.push`)  
**Owner 2026-08-07:** цели в кабинете **сделаны ранее**; пустые отчёты = нет трафика (не открытый TODO).

---

## Сводка: код vs маркетолог

| Goal id | Смысл | Код шлёт? | Где wired | Маркетолог |
|---------|-------|-----------|-----------|------------|
| `product_card_click` | Клик карточки → страница события | ✅ | `EventCard`, `EventCardHorizontal` | ✅ цель создана (owner) |
| `select_tickets` | Клик «Купить» / открытие виджета TC или Teplohod | ✅ | `TcWidgetButton`, `TeplohodWidgetButton`, `CatalogPurchaseTrigger` | ✅ цель создана (owner) |
| `catalog_interstitial_click` | Клик interstitial-баннера в `/events` | ✅ | `CatalogResults` → `trackCatalogBannerClick` | ✅ цель + GTM (owner) |
| `purchase_success` | Факт оплаты | ❌ **не шлём** | helper `trackPurchaseSuccess` готов, вызовов нет | ✅ цель опц. создана; ждём callback |

**Важно:** id целей **case-sensitive**, ровно как в таблице.

---

## 1. `product_card_click` (CV.2c)

**Когда:** пользователь кликает карточку события (переход на `/events/[slug]`).

**Параметры в reachGoal (опционально):** `eventId`, `slug`, `source`.

**Метрика UI:**

1. [metrika.yandex.ru](https://metrika.yandex.ru/) → счётчик `106786540`.
2. **Настройки** → **Цели** → **Добавить цель**.
3. Тип: **JavaScript-событие**.
4. Идентификатор: `product_card_click`
5. Сохранить.

**GTM (опционально):**

- Trigger: Custom Event `product_card_click`
- Tag: Yandex Metrika reachGoal или GA4 event

---

## 2. `select_tickets` (CV.2d)

**Когда:** intent к оплате - клик CTA «Купить билет», открытие Ticketscloud или Teplohod checkout. **Не** означает успешную оплату.

**Параметры:** `eventId`, `slug`, `provider` (`ticketscloud` | `teplohod`), `source`.

**Источники `source` (примеры):** `teplohod_widget_button`, `tc_widget_button`, `catalog_purchase_trigger`.

**Метрика UI:** цель → JavaScript-событие → `select_tickets`

---

## 3. `catalog_interstitial_click` (CV.2b)

**Когда:** клик по баннеру-подборке каждые 8 карточек на `/events`.

**Параметр:** `target` (`rooftops`, `river`, `weekend`, `blog`, …).

**Метрика UI:** JavaScript-событие → `catalog_interstitial_click`

**GTM:** Custom Event trigger `catalog_interstitial_click` + тег на цель.

---

## 4. `purchase_success` (CV.2e)

**Статус кода:** **НЕ вызывается.** Покупка уходит во внешний виджет; thank-you page и стабильный client callback отсутствуют. Fake goal на redirect запрещён.

**Когда появится проводка (engineering):**

- callback Ticketscloud / Teplohod widget success, или
- thank-you URL на нашем домене, или
- server webhook → pixel / `reachGoal` с сервера.

**Маркетолог сейчас:** может создать пустую цель `purchase_success` заранее - конверсии не будет до проводки.

---

## 5. Webvisor SOP (CV.2f)

**Процесс маркетолога, не код.**

1. Первый месяц после запуска целей: **10-15 мин/день**.
2. Метрика → **Вебвизор** → фильтр: зашли на `/events` или главную.
3. Смотреть цепочку: **карточка** → **Купить** → **виджет открылся**.
4. Фиксировать: где отваливаются (медленный виджет, пустой лендинг, мобильный layout).
5. Раз в неделю - короткая заметка владельцу (без правок кода из Webvisor).

---

## 6. Проверка что push работает (dev/prod)

В консоли браузера на `daibilet.ru` (после клика по карточке):

```javascript
// dataLayer
window.dataLayer?.filter((e) => e.event === 'product_card_click').slice(-1)

// ym (если счётчик загружен)
typeof window.ym
```

Или Метрика → **Отчёты** → **Цели** → реальное время (после создания целей).

---

## 7. Связанные задачи Tasktracker

| ID | Статус |
|----|--------|
| CV.2b `catalog_interstitial_click` | ✅ код + кабинет (2026-08-07) |
| CV.2c `product_card_click` | ✅ код + кабинет (2026-08-07) |
| CV.2d `select_tickets` | ✅ код + кабинет (2026-08-07) |
| CV.2e `purchase_success` | ✅ цель в кабинете; код ❌ ждёт callback |
| CV.2f Webvisor SOP | процесс ⏳ |
| SEO.IN4 счётчик на сайте | ✅ не трогать код |
