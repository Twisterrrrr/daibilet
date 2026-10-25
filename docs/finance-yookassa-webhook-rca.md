# Finance YooKassa Webhook RCA

Date: 2026-08-09

## Root Cause

`CheckoutOrder` remains `PENDING_PAYMENT` until finance applies a verified YooKassa `payment.succeeded` event through the webhook, or reconcile handles the order after local payment expiry.

## Evidence

- Create-payment writes a local order and payment row, then returns `confirmation_url`.
- `return_url` is only the buyer redirect target (`/checkout/result?order={publicCode}`); it does not confirm payment.
- `applyYooKassaPaymentObject` is the path that moves a checkout order to `CONFIRMED`.
- `reconcileExpiredYooKassaCheckouts` filters by `expiresAt`, so fresh pending orders are intentionally skipped.
- Public checkout order endpoints are read-only projections.

## Operational Decision

Register YooKassa HTTP notifications for finance checkout on:

```text
https://finance-api.daibilet.ru/api/checkout/yookassa/webhook
```

Do not use:

```text
https://api.daibilet.ru/api/checkout/yookassa/webhook
```

That host is the catalog API surface and is not the finance checkout webhook host on `.159`.

## Smoke Expectation

Create-payment smoke is green when it returns a YooKassa `confirmation_url`.

`CONFIRMED + ticketNumbers` requires one of:

- a real sandbox payment reaching remote `succeeded` and a webhook hitting `.159`;
- a verified webhook replay after the remote payment succeeds;
- expired-order reconcile as fallback, not as the primary async-confirm path.
