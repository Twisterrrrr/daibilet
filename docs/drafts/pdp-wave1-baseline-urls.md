# PDP Wave 1 — baseline URLs (до push / deploy)

> **Решение owner 2026-09-30:** Wave 1 — **не эксперимент**, а UX-улучшение
> под будущий трафик. Замер «до/после» на выбранке из 12 URL отменён как
> недостоверный (см. «Почему 12 URL не подходят»). Общая точка отсчёта снимается
> по **топ-100 URL каталога**, она же служит baseline для следующих волн.

## Почему 12 URL не подходят

Выгрузка «Страницы» за 4 недели: **431 просмотр на весь сайт, ноль на все 12.**
Мой прежний прогноз «20–40 просмотров» оказался оптимистичным вдвое.

Проверка мета-тегов на проде выявила причину — **7 из 12 помечены `noindex, follow`:**

| URL | robots | в sitemap |
|-----|--------|-----------|
| /venues/moscow-gmii-imeni-pushkina | noindex | **да** ← дефект |
| /venues/moscow-muzey-garazh | noindex | **да** ← дефект |
| /venues/moscow-novaya-tretyakovka | noindex | нет |
| /venues/moscow-bol-shoy-teatr | noindex | нет |
| /venues/moscow-sovremennik | noindex | **да** ← дефект |
| /locations/moscow-mht-im-chehova | noindex | нет |
| /locations/moscow-vdnh | noindex | **да** ← дефект |
| /locations/moscow-izmaylovskiy-park | noindex | нет |
| /locations/krymskii-most-11 | index | да |
| /locations/kievskii-sektor-a-14 | index | да |
| /locations/kitai-gorod-ustinskii-sektor-a-9 | index | да |
| /locations/moscow-park-gorkogo | index | да |

**Найденный дефект (передано в задачи индексации):** 4 страницы помечены
`noindex`, но при этом **публикуются в `sitemaps/venues.xml`**. Поисковик
получает противоречивый сигнал и тратит краул-бюджет впустую. `noindex`
задаётся данными (`Venue.pageStatus` / `isIndexable`), а не префиксом маршрута:
`moscow-mht-im-chehova` лежит в `/locations/`, но тоже `noindex`.

**Если страницы не в индексе — это не провал Wave 1, а задача индексации**
(канон, `isVenuePublic`, 190 битых URL). Передаётся в приоритеты Codex.

## Точка отсчёта: топ-100 каталога

Отчёт: **Веб-аналитика → Страницы**, период **30 дней**, сортировка по
просмотрам, взять **первые 100 URL**. Это реальный срез трафика, не гипотеза.

| Метрика | Идентификатор цели |
|---------|--------------------|
| Просмотры страницы | — |
| Клик по CTA (покупка) | **`select_tickets`** |

`select_tickets` — единственная цель, которая шлётся с кнопки покупки
(`TcWidgetButton`, `TeplohodWidgetButton`, `CatalogPurchaseTrigger`; см.
`metrika-goals-checklist.md`). Идентификатор case-sensitive.

**`purchase_success` не использовать:** цель создана, но код её не шлёт —
ждёт callback от провайдера. Замер «до/после покупки» технически недоступен.

## Почему счётчик можно доверять только с сентября

Счётчик `106786540` не переподключали при переезде СПб → МКС
(cutover 2026-07-30) и не собирал данные в июле-августе. В БД за тот период
есть оплаченные заказы, значит визиты были — просто не считались.
Подробнее: `docs/traffic-2026-summary.md`.

**Данные до 2026-09 для baseline непригодны.** Окно измерения — от 2026-09.

Фактическая посещаемость — **~32 визита/нед** на весь сайт (сентябрь: 136).
Прежняя оценка «~43 визита/нед» в этом документе не подтверждается.

## Что осталось за кадром

Список URL ниже сохранён как **покрытие UX-типов** (музей / театр / пир / парк
по три), а не как измеряемая выборка.

## Канонические URL (200, без редиректа)

| # | Тип | URL |
|---|-----|-----|
| 1 | museum | https://daibilet.ru/venues/moscow-gmii-imeni-pushkina |
| 2 | museum | https://daibilet.ru/venues/moscow-muzey-garazh |
| 3 | museum | https://daibilet.ru/venues/moscow-novaya-tretyakovka |
| 4 | theater | https://daibilet.ru/venues/moscow-bol-shoy-teatr |
| 5 | theater | https://daibilet.ru/venues/moscow-sovremennik |
| 6 | theater | https://daibilet.ru/locations/moscow-mht-im-chehova |
| 7 | pier | https://daibilet.ru/locations/krymskii-most-11 |
| 8 | pier | https://daibilet.ru/locations/kievskii-sektor-a-14 |
| 9 | pier | https://daibilet.ru/locations/kitai-gorod-ustinskii-sektor-a-9 |
| 10 | park | https://daibilet.ru/locations/moscow-park-gorkogo |
| 11 | park | https://daibilet.ru/locations/moscow-vdnh |
| 12 | park | https://daibilet.ru/locations/moscow-izmaylovskiy-park |

Заметки:
- `moscow-mht-im-chehova` / `moscow-lenkom`: `/venues/…` → **308** на `/locations/…` — в Метрике считать канон `/locations/…`.
- Скриншоты: 1–2 PDP (Пушкинский + один пир/парк) — **до выката Wave 1**.
  Снимать в тот же день, что и топ-100, и хранить рядом с этим файлом.
- Оценка «~43 визита/нед», стоявшая здесь раньше, **не подтвердилась** —
  фактически ~32/нед.
