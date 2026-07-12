# Catalog Acceptance

Дата: 2026-07-13.

Цель: быстро понять, можно ли продавать текущий каталог, не открывая руками десятки страниц.

## Команда

Локально:

```bash
pnpm acceptance:catalog -- --skip-admin
```

С backend/admin source health:

```bash
ADMIN_EMAIL=admin@daibilet.ru \
ADMIN_PASSWORD='<password>' \
pnpm acceptance:catalog -- \
  --public-url http://127.0.0.1:3000 \
  --admin-url http://127.0.0.1:4000
```

Production:

```bash
PUBLIC_BASE_URL=https://daibilet.ru \
ADMIN_BASE_URL=https://api.daibilet.ru \
ADMIN_EMAIL=admin@daibilet.ru \
ADMIN_PASSWORD='<password>' \
pnpm acceptance:catalog
```

## Что Проверяет

- `stats.events`, `stats.venues`, `stats.destinations/cities` больше 0;
- `stats.events` совпадает с `catalog.total`;
- карточки каталога имеют `slug`, `title`, город, площадку, категорию, цену и purchase entry;
- цена `priceFrom` не ниже 100 рублей;
- TC/Teplohod временные слоты не торчат отдельными карточками одного события;
- описание очищено от HTML;
- страница события содержит город, площадку, purchase entry, категории цен и не больше пяти ближайших сеансов;
- города и площадки отдаются в public API;
- лендинги не повторяют одну карточку полотном;
- Sources содержат Ticketscloud и Teplohod;
- source catalog sync не stale, если не передан `--allow-stale-sources`.

## Блокеры

- 0 событий, площадок или направлений;
- `catalog.total` расходится со `stats.events`;
- карточки без города, площадки, категории, цены или purchase entry;
- цена ниже 100 рублей в публичной выдаче;
- одинаковые карточки одного провайдера с тем же названием, городом и площадкой;
- на detail API больше пяти сеансов;
- stale catalog sync у TC/Teplohod перед запуском продаж.

## Допустимые Warnings

- возможный дубль между разными поставщиками;
- landings отсутствуют на раннем staging;
- source freshness не проверена, если нет admin credentials.

## Перед Запуском Продаж

1. Прогнать fresh sync TC.
2. Прогнать fresh sync Teplohod на сервере с белым IP.
3. Запустить `pnpm acceptance:catalog`.
4. Запустить `pnpm smoke:launch`.
5. Только после этого открывать трафик на новый public.
