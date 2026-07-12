# Admin Launch QA

Дата: 2026-07-13.

Цель: перед запуском продаж убедиться, что админка является операторским инструментом, а не набором моков.

## Команды

Статическая проверка структуры:

```bash
pnpm qa:admin
```

С typecheck/build:

```bash
pnpm qa:admin -- --run-typecheck --run-build
```

Production API:

```bash
ADMIN_EMAIL=admin@daibilet.ru \
ADMIN_PASSWORD='<password>' \
pnpm qa:admin -- \
  --live-api \
  --api-url https://api.daibilet.ru
```

Production page:

```bash
pnpm qa:admin -- \
  --live-page \
  --admin-page-url https://admin.daibilet.ru
```

## Что Проверяется

- admin package существует и называется `@daibilet/admin`;
- есть `typecheck` и `build`;
- admin использует `@daibilet/contracts`;
- основные маршруты подключены:
  - dashboard;
  - events;
  - change requests;
  - orders;
  - buyers;
  - venues;
  - cities;
  - landings;
  - sources;
- соответствующие page-файлы существуют;
- `index.html` не грузит legacy `data.js/app.js`;
- live admin API требует basic auth;
- live admin endpoints возвращают JSON без 500/404.

## Ручной Сценарий Для Оператора

Проверить в браузере:

1. Dashboard: счетчики не нулевые и не выглядят моками.
2. Sources: есть Ticketscloud и Teplohod, catalog sync и orders sync разделены.
3. Events: список открывается, фильтры работают, карточки сгруппированы по событию, а не по слотам.
4. Event detail: вкладки контент, медиа, SEO, расписание, продажи доступны или явно запланированы.
5. Orders: нет технических `source id`, покупатель без данных отображается как `-`, статусы на русском.
6. Buyers: список не падает при пустых данных.
7. Venues: таблица площадок открывается.
8. Cities: таблица городов/регионов открывается.
9. Landings: таблица лендингов открывается, нет повторов одного события полотном.
10. Change Requests: пустая очередь не выглядит ошибкой.

## Launch Blockers

- admin доступен без auth на production;
- `/api/admin/sources` не содержит Ticketscloud или Teplohod;
- Events, Orders, Sources или Landings возвращают 500/404;
- админка показывает fallback/mock как реальные данные;
- оператор не может открыть заказ или добавить номер билета вручную;
- в заказах пользователю/оператору показываются технические source ids.

## Known Warnings

- `apps/admin/data.js` и `apps/admin/app.js` пока могут лежать как legacy prototype files. Это warning, если `index.html` их не грузит.
- Англоязычный label `Sync health` допустим до финальной полировки, но перед продажами лучше заменить на `Состояние синхронизации`.
