# Catalog handoff: buyer order access proof

Status: finance token issuance and catalog BFF handoff are implemented in code; production enforcement remains off until compatible deployments and browser smoke are complete.

## Why

`publicCode` stays a seven-digit buyer-facing order number. It must not also authorize anonymous access to buyer contacts, payment data and issued ticket numbers.

## Finance contract

`POST /api/checkout/yookassa` and `POST /api/checkout/stub` add one optional field to the existing response:

```json
{
  "order": {
    "publicCode": "4717674",
    "orderAccessToken": "oa1_<opaque-hmac>"
  }
}
```

- The token is deterministic for the order code and active finance secret, so an idempotency replay returns the same proof.
- The token contains no order code or buyer data.
- Finance accepts the token only in `x-daibilet-order-access` for `GET /api/public/checkout/orders/{publicCode}`.
- `DAIBILET_REQUIRE_ORDER_ACCESS=0` keeps the existing anonymous lookup temporarily compatible.
- When enforcement is enabled, a missing, invalid or mismatched proof returns the same `404 checkout_order_not_found` response as an unknown order.

## Catalog BFF work

Do not add the proof to `return_url`, query parameters, client logs or analytics.

1. **Done in code:** the catalog checkout BFF reads `order.orderAccessToken` from the finance response.
2. **Done in code:** it stores `{ publicCode, token }` in a `HttpOnly`, production-`Secure`, `SameSite=Lax` cookie scoped to `/api/public/checkout/orders`. The cookie lasts 30 days so the buyer can revisit the ticket result; the proof is bound to one exact public code.
3. **Done in code:** the BFF removes `orderAccessToken` from JSON returned to browser JavaScript.
4. **Done in code:** the order-result proxy requires an exact code match before forwarding the proof as `x-daibilet-order-access`.
5. The visible and YooKassa return URL remains unchanged: `https://daibilet.ru/checkout/result?order={publicCode}`.
6. **Verify before enforcement:** when no matching cookie exists, the finance endpoint must return its neutral not-found response; do not retry anonymously or reveal whether the code exists. Confirm the checkout UI presents a neutral verification state.

One cookie holds the most recently created `{publicCode, token}` pair. Starting another checkout replaces it; authenticated buyer account access is the long-term multi-order path.

## Cutover sequence

1. Deploy finance issuance with `DAIBILET_REQUIRE_ORDER_ACCESS=0`.
2. Deploy catalog BFF cookie + header forwarding.
3. **Pending:** smoke embedded and redirect flows, including a page reload after returning from YooKassa; confirm the token never appears in browser JSON, URLs, or logs.
4. Verify a direct anonymous finance lookup still works only during this compatibility window.
5. Set `DAIBILET_REQUIRE_ORDER_ACCESS=1` on finance and restart the API.
6. Verify: matching cookie 200; no cookie 404; cookie proof for another code 404; supplier/admin projections unchanged.

## Secrets

Finance reads `DAIBILET_ORDER_ACCESS_SECRET`; during migration it falls back to `USER_JWT_SECRET`. Use a dedicated random value of at least 32 characters before enforcement. Do not copy this secret to catalog: catalog stores only the per-order opaque proof returned by finance.
