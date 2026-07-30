# Finance .159 smoke runbook

Дата: 2026-07-30  
Канон: [catalog-finance-projection.md](./catalog-finance-projection.md)

## Граница

- `.184` catalog: TC/TEP import, widgets, ExternalOrder mirror.
- `.159` finance: INTERNAL_SALES, AdmissionProduct, checkout, supplier LC, projection API.
- Catalog не ходит в finance DB напрямую. Только HTTPS projection.
- Finance не хранит TC/TEP secrets и не пишет в catalog DB без отдельного sync-контракта.
- AdmissionProduct не является event slot.

## DNS / TLS

Owner side:

- `checkout.daibilet.ru` A -> `85.193.80.159`
- `supplier.daibilet.ru` A -> `85.193.80.159`
- `finance-api.daibilet.ru` A -> `85.193.80.159`

После DNS:

- выпустить TLS на `.159`;
- проверить `https://finance-api.daibilet.ru/api/public/admission-products?limit=1`;
- не трогать nginx/deploy на `.184`.

## Finance env

Обязательное:

```dotenv
NODE_ENV=production
PORT=4100
DATABASE_URL=postgresql://...
DAIBILET_REQUIRE_ADMIN_AUTH=1
ADMIN_EMAIL=admin@daibilet.ru
ADMIN_PASSWORD_HASH=sha256:...
USER_JWT_SECRET=...
DAIBILET_FINANCE_PROJECTION_TOKEN=...
```

Пока sandbox не пройден:

```dotenv
DAIBILET_STUB_CHECKOUT=1
DAIBILET_YOOKASSA_CHECKOUT=0
DAIBILET_YOOKASSA_VERIFY_WEBHOOK=1
YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=
```

Запрещено на `.159`:

```dotenv
TICKETSCLOUD_API_TOKEN=
TICKETSCLOUD_WIDGET_TOKEN=
TEP_API_URL=
TEP_WIDGET_ID=
```

## Projection smoke

Без m2m token в dev:

```bash
curl -fsS "http://127.0.0.1:4100/api/public/admission-products?limit=3"
curl -fsS "http://127.0.0.1:4100/api/public/finance/admission-products?limit=3"
curl -fsS "http://127.0.0.1:4100/api/public/venues/phase-g-test-museum/admission-products"
curl -fsS "http://127.0.0.1:4100/api/public/suppliers/phase-g-test-museum"
```

С m2m token:

```bash
TOKEN="..."
curl -fsS -H "Authorization: Bearer $TOKEN" "https://finance-api.daibilet.ru/api/public/admission-products?limit=3"
curl -fsS -H "x-daibilet-projection-token: $TOKEN" "https://finance-api.daibilet.ru/api/public/finance/admission-products?limit=3"
```

Ожидания:

- только `PUBLISHED` AdmissionProduct от `ACTIVE` supplier;
- `purchaseFlow` = `PLATFORM`;
- `checkoutPath` есть только если `canSell === true`;
- нет `paymentMode`, provider ids, source ids, checkout/internal order ids;
- `Cache-Control` публичный short-cache через `sendPublicJson`.

## STUB smoke

Seed:

```bash
pnpm backend:checkout:seed-stub-admission -- --reset-capacity
```

Создать/переиграть STUB order:

```bash
pnpm backend:checkout:seed-stub-admission -- --order
```

Последний принятый smoke: `publicCode=7649542` на `.159`.

Проверить, что заказ виден:

```bash
curl -fsS -u "admin@daibilet.ru:***" "https://finance-api.daibilet.ru/api/admin/orders?q=7649542"
curl -fsS "https://finance-api.daibilet.ru/api/supplier/orders?supplier=phase-g-test-museum"
```

## YooKassa sandbox gate

Не включать:

```dotenv
DAIBILET_YOOKASSA_CHECKOUT=1
```

пока не выполнены все условия:

- sandbox `YOOKASSA_SHOP_ID` и `YOOKASSA_SECRET_KEY` стоят на `.159`;
- webhook URL зарегистрирован в LC YooKassa;
- STUB order виден в admin, supplier LC и buyer account;
- projection contract smoke зелёный;
- catalog CTA всё ещё gated по `canSell && checkoutPath`;
- владелец подтверждает тестовый платеж и отмену/возврат.
