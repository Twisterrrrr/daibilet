# Catalog handoff: buyer order access proof

Status: finance proof foundation and catalog BFF bridge are implemented in `codex/ai-rewrite-rbac-integration`; production enforcement remains off until both sides are released and smoke-tested.

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

1. `apps/web/app/checkout/actions/admission/route.ts` and the direct YooKassa BFF read the proof from the finance create response.
2. Store `{ publicCode, token }` in two short-lived cookies: `HttpOnly`, `Secure` in production, `SameSite=Lax`, max age two hours. The result cookie is scoped to `/checkout`; the polling cookie is scoped to `/api/public/checkout/orders`.
3. Remove `orderAccessToken` from JSON returned to browser JavaScript.
4. The catalog result and payment-poll proxies require the cookie's `publicCode` to match the requested code and forward the proof as `x-daibilet-order-access`.
5. The buyer email worker reads the order through the server-authenticated purchases-by-email projection; it does not depend on a browser cookie or public order number.
6. Keep the visible and YooKassa return URL unchanged: `https://daibilet.ru/checkout/result?order={publicCode}`.
7. If the cookie is absent, the result proxy returns a neutral empty state. It does not retry anonymously or reveal whether the code exists.

One cookie can hold the current `{publicCode, token}` pair. A list of per-order cookies is unnecessary for Stage 0; authenticated buyer account access is the long-term multi-order path.

## Cutover sequence

1. Configure a dedicated finance `DAIBILET_ORDER_ACCESS_SECRET` of at least 32 characters and verify finance returns an order proof; do not expose the secret to catalog.
2. Deploy finance issuance with `DAIBILET_REQUIRE_ORDER_ACCESS=0` only for the short migration window.
3. Deploy catalog BFF cookie + header forwarding.
4. Smoke embedded and redirect flows, including a page reload after returning from YooKassa and ticket email delivery.
5. Set `DAIBILET_REQUIRE_ORDER_ACCESS=1` on finance and restart the API immediately after smoke.
6. Verify: valid cookie 200; no cookie 404; token for another code 404; supplier/admin projections unchanged. Keep first-payment gate closed until this cutover is complete.

## Secrets

Finance reads `DAIBILET_ORDER_ACCESS_SECRET`; during migration it may fall back to `USER_JWT_SECRET`. Use a dedicated random value of at least 32 characters before enabling checkout. Do not copy this secret to catalog: catalog stores only the per-order opaque proof returned by finance.
