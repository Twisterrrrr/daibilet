# Orders And Buyer Account Acceptance

Дата: 2026-07-13.

Цель: для первых продаж иметь понятное зеркало заказов из виджетов и простой buyer account без финконтура Daibilet.

## Product Contract

До фазы 2:

- деньги, чеки и основной возврат остаются на стороне Ticketscloud/Teplohod;
- Daibilet хранит факт покупки, покупателя, статус заказа и статус билетов;
- покупатель видит "Мои покупки" или проверку заказа по номеру;
- админ видит заказы, покупателя, событие, статус и может вручную добавить номер билета.

## Команды

Статическая проверка:

```bash
pnpm acceptance:orders
```

Live API с точным номером:

```bash
PUBLIC_BASE_URL=https://daibilet.ru \
ADMIN_BASE_URL=https://api.daibilet.ru \
ADMIN_EMAIL=admin@daibilet.ru \
ADMIN_PASSWORD='<password>' \
SMOKE_ORDER_LOOKUP='<order-or-ticket-number>' \
pnpm acceptance:orders -- --live-api
```

Если надо проверить, что в БД уже есть заказы:

```bash
pnpm acceptance:orders -- --live-api --require-orders
```

## Что Проверяется

- public buyer DTO скрывает `sourceOrderId`;
- fallback номер заказа генерируется как короткий 7-значный номер;
- buyer page не выводит слова `External` или `sourceOrderId`;
- admin orders используют `publicCode` и `displayStatus`;
- live admin orders имеют человекочитаемый номер;
- public lookup возвращает `displayStatus` и не отдает технический source order id.

## Блокеры

- покупатель видит технические `external/source` поля;
- номер заказа длинный и похож на внутренний id;
- статусы билета или заказа не имеют русской display-версии;
- админ не может открыть заказ;
- админ не может вручную добавить номер билета;
- заказ нельзя найти по номеру из письма.

## Допустимо До Первых Продаж

- orders list пустой;
- buyer list пустой;
- `SMOKE_ORDER_LOOKUP` не задан;
- аккаунт покупателя показывает пустой список, если email еще не встречался в заказах.

## Ручной Smoke

1. Создать тестовую покупку через виджет.
2. Дождаться sync заказа или запустить ручной import.
3. Открыть admin Orders.
4. Проверить короткий номер, событие, статус и покупателя.
5. При необходимости вручную добавить номер билета.
6. Открыть `/my-orders`.
7. Найти заказ по номеру.
8. Открыть `/account/purchases` под пользователем с тем же email.

## Что Не Делаем Сейчас

- YooKassa;
- внутренний checkout;
- фискализацию через Daibilet;
- supplier payouts;
- автоматические возвраты через Daibilet.
