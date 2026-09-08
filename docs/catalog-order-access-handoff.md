# Catalog handoff: buyer order access proof

Status: finance foundation implemented; enforcement remains off until the catalog BFF is deployed and smoked.

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

1. In `apps/web/app/checkout/actions/admission/route.ts`, read `order.orderAccessToken` from the finance create response.
2. Store `{ publicCode, token }` in a short-lived catalog cookie. The cookie must be `HttpOnly`, `Secure`, `SameSite=Lax`, scoped to `/checkout`, and expire after the payment/result window (recommended two hours).
3. Remove `orderAccessToken` from the JSON returned to browser JavaScript.
4. In the catalog order-result proxy, read the cookie, require its `publicCode` to equal the requested code, and forward the proof to finance as `x-daibilet-order-access`.
5. Keep the visible and YooKassa return URL unchanged: `https://daibilet.ru/checkout/result?order={publicCode}`.
6. If the cookie is absent, show a neutral order-verification state. Do not retry anonymously and do not reveal whether the code exists.

One cookie can hold the current `{publicCode, token}` pair. A list of per-order cookies is unnecessary for Stage 0; authenticated buyer account access is the long-term multi-order path.

## Cutover sequence

1. Deploy finance issuance with `DAIBILET_REQUIRE_ORDER_ACCESS=0`.
2. Deploy catalog BFF cookie + header forwarding.
3. Smoke embedded and redirect flows, including a page reload after returning from YooKassa.
4. Verify a direct anonymous finance lookup still works only during this compatibility window.
5. Set `DAIBILET_REQUIRE_ORDER_ACCESS=1` on finance and restart the API.
6. Verify: valid cookie 200; no cookie 404; token for another code 404; supplier/admin projections unchanged.

## Secrets

Finance reads `DAIBILET_ORDER_ACCESS_SECRET`; during migration it falls back to `USER_JWT_SECRET`. Use a dedicated random value of at least 32 characters before enforcement. Do not copy this secret to catalog: catalog stores only the per-order opaque proof returned by finance.
