# Мой день - commercial checklist canon

**Дата:** 2026-08-02  
**Канон owner:** planner + commercial checklist (не swipe/Tinder). Паттерн близкий к Wanderlog по задаче «быстро собрать день», без копирования визуала 1:1.

## Product rules

- Хранилище: существующий `daibilet:dayRoute` localStorage; share `/d/{code}` → `/my-day?city=&items=`.
- `DAY_ROUTE_MAX=10`, `DAY_ROUTE_MIN=2` (UX «день сложился», не потолок add).
- Цены не выдумывать: только `ticketUrl` / event page / уже известные поля.
- Hyphen `-` в user copy (без длинного тире).

## Chip rules (priority)

1. `ticketBought` → **Билет отмечен**
2. timed (`startsAt` / `sessionLabel` → HH:MM) → **Сеанс HH:00**
3. есть checkout (`ticketUrl` / eventId/slug) → **Нужен билет**
4. иначе → **Вход свободный**

Карточка нейтральная (белый фон) + chip + CTA «Купить билет» при наличии URL.

## Readiness %

```
pointsScore  = 0.65 * min(N/MIN,1) + 0.35 * min(N/MAX,1)   # empty → 0
ticketsScore = bought / needsTicket   # или 1 если билетов нет
timeScore    = timedSet / commerceStops  # или 1 если commerce нет
percent      = round(100 * (points + tickets + time) / 3)
```

UI: «День собран на X%» + subline `N точек · M билетов · K свободное окно` (+ hint Яндекс.Карты).

## Free window

Сегмент ≥ **1200 м** (~15 мин пешком) → блок «Свободное окно» с до 3 upsell (парк/свободный, музей, событие с билетом) из must-see / афиши города.

## Backlog (не в текущем ship)

| # | Тема | Приоритет | Примечание |
|---|------|-----------|------------|
| P4 | Free-time gap upsell polish (несколько окон, ETA) | Средний | MVP gap уже в slice |
| P5 | `hookFact` + mini description на карточках | Средний | |
| P6 | City «собрать за минуту» templates (variants) | Высокий | пресеты есть; варианты UI later |
| P7 | Commercial share for friend `/d/{code}` | Высокий | **не** возвращать soft purple «Вам поделились»; recipient = ready scenario (tickets CTA, map, paid highlights) |
| P8 | Timeline Утро/День/Вечер | Средний | |
| P9 | Carousels «Рядом / Можно купить» + Explore collections | Средний | сейчас один «Рекомендуемые» |
| P10 | Native sales copy «Билеты от X» | Низкий | только при реальной цене в данных |

## Anti-goals

- Не строить Tinder/swipe UX.
- Не wide catalog CTA без запроса owner.
- Не force-push; deploy web только MSK-only canon.
