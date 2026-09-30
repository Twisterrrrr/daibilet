# PDP Wave 1 — baseline URLs (до push / deploy)

**Baseline ещё НЕ снят** (обновлено 2026-09-30). URL-строки проверены, цифр нет.

## Что мерить

Отчёт: **Веб-аналитика → Страницы** (не «Источники трафика»).
Период: **4 недели** от даты снятия. Фильтр: путь, список 12 URL ниже.

| Метрика | Идентификатор цели |
|---------|--------------------|
| Просмотры страницы | — |
| Клик по CTA (покупка) | **`select_tickets`** |

`select_tickets` — единственная цель, которая шлётся с кнопки покупки
(`TcWidgetButton`, `TeplohodWidgetButton`, `CatalogPurchaseTrigger`; см.
`metrika-goals-checklist.md`). Идентификатор case-sensitive.

**`purchase_success` не использовать:** цель создана, но код её не шлёт —
ждёт callback от провайдера. Замер «до/после покупки» технически
недоступен.

## Почему снимать только сейчас

Счётчик `106786540` не переподключали при переезде СПб → МКС
(cutover 2026-07-30) и не собирал данные в июле-августе. В БД за тот период
есть оплаченные заказы, значит визиты были — просто не считались.
Подробнее: `docs/traffic-2026-summary.md`.

**Данные до 2026-09 для baseline непригодны.**

## Окно и его честный предел

Фактическая посещаемость — **~32 визита/нед** на весь сайт (сентябрь: 136
за месяц). Прежняя оценка «~43 визита/нед» в этом документе не подтверждается
и исправлена.

Следствие, которое надо принять до замера: на 12 страницах за 4 недели
наберётся порядка **20–40 просмотров**. Разница в 2–3 клика CTA окажется
внутри шума. Такой baseline даёт **отправную точку**, а не доказательство
эффекта. Убедить в результате можно будет только на всём трафике каталога.

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
- `moscow-mht-im-chehova` / `moscow-lenkom`: `/venues/…` → **308** на `/locations/…` — в Metrika считать канон `/locations/…`.
- Скрины baseline: 1–2 PDP (Пушкинский + один pier/парк) — до выката Wave 1.
- Скриншоты делать в тот же день, что и выгрузку цифр, и хранить рядом с этим
  файлом: через месяц сравнивать будет не с чем.
- Оценка «~43 визита/нед», стоявшая здесь раньше, **не подтвердилась** —
  фактически ~32/нед. Окно 4 недели оставлено, его предел описан выше.
