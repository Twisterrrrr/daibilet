# Мой день - commercial checklist canon

**Дата:** 2026-08-02  
**Канон owner:** planner + commercial checklist (не swipe/Tinder). Паттерн близкий к Wanderlog по задаче «быстро собрать день», без копирования визуала 1:1.

## Product rules

- Хранилище: существующий `daibilet:dayRoute` localStorage; share `/d/{code}` → `/my-day?city=&items=`.
- `DAY_ROUTE_SOFT=10 / MAX=15`, `DAY_ROUTE_MIN=2` (UX «день сложился», не потолок add).
- Цены не выдумывать: только `ticketUrl` / event page / уже известные поля.
- Hyphen `-` в user copy (без длинного тире).

## Chip rules (priority)

1. `ticketBought` → **Билет отмечен**
2. timed (`startsAt` / `sessionLabel` → HH:MM) → **Сеанс HH:00**
3. есть checkout (`ticketUrl` / eventId/slug) без часов → kind `needs_ticket`, **без текста** (не писать «Билет оформляется…»; soft «Вечерний сеанс» для affiche stub OK)
4. иначе → без бейджа (не писать «Вход свободный»)

Venue-bound (площадка + прикреплённое событие, дата неизвестна): под карточкой ссылка на **страницу площадки** + «от N ₽» (`dayRouteOfferIsVenueBound`), не buy-pill конкретного события.

Карточка компактная (белый фон) + chip только для commerce + CTA «Купить билет от {цена}» при наличии URL/цены (event-as-stop).

Under-stop: nearby event chips («Поблизости») убраны из grid/list - upsell остаётся в «Свободное окно» и accordion matches. Desktop map: under list (`data-day-route-map-desktop`), не sticky split. Venue-bound: ссылка на площадку + «от N ₽».
Handoff-модалка «Оформили билет?» - off (`SHOW_DAY_TICKET_HANDOFF_MODAL=false`).
Trip tickets: блок «Ваши билеты в этой поездке» для `ticketBought` (QR из orders API - open, см. qa.md).

## Hot Picks («Выбор Дайбилет»)

Tabs (text, без emoji): **Советы** | **Культура** | **Еда и бары** - каждая ≤6 карточек (`HOT_PICKS_MAX`).
Карточки ~83vw mobile, `rounded-2xl`, one-liner hookFact (~110 символов).

Paid offer scenarios (trip date не форсируем):

| Scenario | When | Badge | CTA | Timeline | Code |
|---|---|---|---|---|---|
| 1 Affiche stub | matched event, entertainment / non-museum | «Каждый вечер» / «Вечерний сеанс» | **Выбрать дату и билеты** | **Вечер**, soft `sessionLabel`, без `startsAt` | `affiche` |
| 2 Open date | museum + event checkout | **Билет на любой день** | **Купить билет** (+ цена только из данных) | **День** | `open_date` |
| Free | landmark / park / gastro без checkout | category badge | **Добавить в план** | День (gastro soft → Вечер) | `free` |

Scenario 3 (nearest Fri/Sat) - backlog. Click paid CTA: add + `window.open(ticketUrl)` + handoff «Билет куплен».
Anatomy: H1 + Share (disabled <1) → Hot Picks → search → flat route list (↑↓) → collapsed catalog.

## Readiness %

```
pointsScore  = 0.65 * min(N/MIN,1) + 0.35 * min(N/SOFT,1)   # empty → 0; SOFT=10 guideline
ticketsScore = bought / needsTicket   # или 1 если билетов нет
timeScore    = timedSet / commerceStops  # или 1 если commerce нет
percent      = round(100 * (points + tickets + time) / 3)
```

Header UI (owner 2026-08-02): только `N точек из 10` (SOFT) + `M билетов` если unpaid > 0.
Percent / free-window / «Яндекс.Карты» в этой строке не показывать (карта - отдельная кнопка).
H1: «Собери свой день в {предложный}» через `inCityPrepositional`.

## Free window

Сегмент ≥ **1200 м** (~15 мин пешком) → блок «Свободное окно» с до 3 upsell (парк/свободный, музей, событие с билетом) из must-see / афиши города.

## Backlog (не в текущем ship)

| # | Тема | Приоритет | Примечание |
|---|------|-----------|------------|
| P4 | Free-time gap upsell polish (несколько окон, ETA) | Средний | MVP gap уже в slice |
| P5 | `hookFact` + mini description на карточках | Средний | ✅ 2026-08-02 picker preview |
| P6 | City «собрать за минуту» templates (variants) | Высокий | пресеты есть; варианты UI later |
| P7 | Commercial share for friend `/d/{code}` | Высокий | **не** возвращать soft purple «Вам поделились»; recipient = ready scenario (tickets CTA, map, paid highlights) |
| P8 | Flat route list + «Маршрут» / «N точек» (не Утро/День/Вечер) | Критический | ✅ `7a3de60` **BUILD_ID=`Ywy2ntkkoX6K__8CuMH3H`** |
| P9 | Carousels «Рядом / Можно купить» + Explore collections | Средний | ✅ MVP Hot Picks «Выбор Дайбилет» (tabs) |
| P10 | Native sales copy «Билеты от X» | Низкий | только при реальной цене в данных |

## Anti-goals

- Не строить Tinder/swipe UX.
- Не wide catalog CTA без запроса owner.
- Не force-push; deploy web только MSK-only canon.
