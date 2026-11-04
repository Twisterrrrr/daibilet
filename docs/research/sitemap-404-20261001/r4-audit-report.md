# R4: производственные площадки, коллизии URL, карта городов — 02.10.2026

## 1. Проверка фикстур
- Production Venue: 4 304 строк; публичный hub: 3 842. Семь подозрительных префиксов публичного slug дают 463 записи: `dk` 93, `klub` 93, `bar` 86, `dvorec` 58, `dom` 51, `restoran` 81, `stage` 1. 460 имеют связанный источник TICKETSCLOUD, 1 — TEPLOHOD, 2 пока без source-link и без событий. Префикс не является признаком теста.
- `stage-standup-club-krasnyi-zal`: реальный TC venue `venue_670feefad4ced7a4e82991a8`, адрес в Санкт-Петербурге, 236 связанных событий. Live detail 200, есть в `venues.xml` и в HTML `/cities/sankt-peterburg`.
- Подтверждена одна служебная Venue: `ven_phase_g_test_museum_catalog` / `phase-g-test-museum`. Создана `scripts/ensure-phase-g-test-museum-venue.js` для finance smoke. `PUBLISHED`, `isIndexable=false`, событий 0; находится в public hub (позиция 3521/3842), прямой detail отвечает 200 с `noindex, follow`, в `venues.xml` и текущем HTML `/cities/moskva` отсутствует.
- В прежнем замере 165 исключений: 46 записей с этими естественными префиксами, 0 подтверждённых служебных Venue. Поэтому очищенная оценка остаётся 1 542 → 1 377, потеря 165 записей; источник данных не загрязнён массовыми фикстурами.
- Без согласования DB не менялась. Для служебной Venue: перенести smoke в staging или отдельный закрытый контур; затем после проверки finance-проекции поставить `pageStatus=HIDDEN` либо убрать публичный route. Перед изменением сохранить строку Venue и зависимые finance-связи; откат — восстановить прежние значения по ID из снимка. Массовый DELETE не предлагается.

## 2. Коллизии публичного slug
- `publicVenueSlug` удаляет 20+ символьный ID-суффикс из raw `Venue.slug`. Реальные одноимённые площадки разных городов превращаются в один URL. В 3 842 hub-записях: 97 совпадающих путей, 246 строк, 149 лишних строк на один URL; 60 путей пересекают города (172 строки, 112 лишних).
- Live `venues.xml`: 1 378 записей, 1 286 уникальных URL; 55 URL повторяются, 92 лишние записи. Это отдельный SEO-дефект помимо 404.
- Из 9 URL, которые HTTP отдаёт как 200: 8 при свежем detail резолвятся в другую Venue, 1 (`prichal-na-naberezhnoi-reki-fontanki-d-71`) свежим detail не находится и, вероятно, удерживается кэшем. 10 строк в отчёте r3 соответствуют 9 URL из-за двойного `dk-rossiya`.

| URL | Исключённые ID | ID свежего detail | Записей с тем же публичным slug |
|---|---|---|---:|
| /venues/ruki-vverh-bar | venue_657414a00f5c3de0af16b51a | venue_619fb565307459ca4cf50994 | 18 |
| /venues/dk-zheleznodorozhnikov | venue_5a6f0800d35286001fa55974 | venue_567e7aec9cb53834fc856431 | 6 |
| /locations/prichal-na-naberezhnoi-reki-fontanki-d-71 | venue_64ca285357eaafa76c712577 | нет | 1 |
| /venues/klub-12 | venue_685d6aa091edda6a11447a48 | venue_5bedde942172ec000cfb7f26 | 2 |
| /venues/dk-rossiya | venue_577b63a09cb5380595b54be2;venue_62148e23b2f3e2b0500e05b8 | venue_5daaf73759e939205a06fde4 | 3 |
| /venues/dk-im-lenina | venue_6a9c515b4842d75d33f71190 | venue_5d5eca0ec64e8b3cf8a6741d | 2 |
| /venues/dk-yubileinyi | venue_691d8b1152938b8bd6eb1cfb | venue_63899dd178d0cd8e461e78bc | 3 |
| /venues/zheleznodorozhnyi-vokzal | venue_675268eb6c22678f7b3ea08d | venue_65072389dbb47a1398bbde30 | 2 |
| /venues/fabrika | venue_6a99d041b8369580977e0ff3 | venue_5d55270bb294d92e013e6376 | 3 |

Решение: не расширять гейт. Для 60 межгородских путей оставить текущий URL за записью, которую detail уже разрешает; остальные реальные площадки получить уникальные публичные slug (город + при необходимости короткий ID). Для 37 внутригородских путей сначала сверить физическую идентичность: настоящий дубль объединять, разные площадки разводить. Максимум 149 записей требуют нового адреса, но это верхняя граница до ручной классификации.
Перед apply: dry-run соответствия `(id, oldSlug, newSlug, canonicalPath)`, проверка уникальности всех новых публичных путей и обратного резолва detail. Сохранить эти четыре поля и версии `updatedAt`; менять в транзакции с повторной проверкой ID/slug, затем обновить каталог и проверить sitemap/detail/city links. Откат — транзакционно восстановить сохранённые slug/canonicalPath по ID и пересобрать кэши. TC import при `on conflict(id)` не обновляет slug, но остальные импортеры нужно проверить отдельно.

## 3. Карта контента
Live `cities.xml` содержит 74 географические страницы (58 городов, 16 регионов) и 58 `/places/c/*`, а не 73/57. Полная таблица и распределение по батчам — `r4-city-content-tiers.md` / CSV. Tier 1 = 14, Tier 2 = 21, Tier 3 = 39. Контент не создавался.

## Файлы
- `r4-city-content-tiers.md` — полная карта 74 страниц.
- `r4-city-content-tiers.csv` — те же данные и дополнительные DB READY-строки.
- `r4-collision-paths.csv` — 97 совпадающих путей.
- `r4-nine-url-diagnosis.csv` — 9 спорных URL и ID.
