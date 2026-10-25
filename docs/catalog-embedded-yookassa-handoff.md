# Catalog handoff: embedded YooKassa admission checkout

Status: finance backend deployed on `85.193.80.159` at `f931c50f`.

Owner boundary:

- Finance owns payment creation, provider state, webhook/reconcile and `publicCode`.
- Catalog owns the buyer page and the `/checkout/result?order={publicCode}` route.
- Do not copy the old finance-branch checkout page into `feat/next-monorepo`; port the protocol into its current `AdmissionCheckoutForm.client.tsx`.
- TC/Teplohod widgets and `ExternalOrder` are out of scope.

## Finance contract

`POST /api/checkout/yookassa` accepts:

```json
{
  "admissionProductSlug": "phase-g-test-museum-entry",
  "admissionOfferId": "...",
  "quantity": 1,
  "buyer": { "email": "buyer@example.com" },
  "returnUrl": "https://daibilet.ru/checkout/result",
  "confirmationMode": "embedded"
}
```

For embedded mode the successful response contains:

```json
{
  "order": {
    "publicCode": "1234567",
    "payment": {
      "confirmationMode": "embedded",
      "confirmationToken": "ct_...",
      "confirmationUrl": null
    }
  }
}
```

Redirect remains the backward-compatible default. If `confirmationToken` is absent and `confirmationUrl` exists, catalog must keep the redirect flow.

## Minimal catalog port

Current catalog reference: `feat/next-monorepo` at `c8e0c568`.

1. `apps/web/src/server/finance-checkout-client.ts`
   - Add `confirmationMode?: 'redirect' | 'embedded'` to submit input.
   - Pass it through `buildYookassaBody`.
   - Parse and return `confirmationToken` and `confirmationMode` from `order.payment`.
   - Accept a caller-provided idempotency key; do not generate a fresh key on an ambiguous retry of the same payload.
2. `apps/web/app/checkout/actions/admission/route.ts`
   - Accept `confirmationMode` and pass it to `submitAdmissionCheckout`.
   - Return `confirmationToken` and `confirmationMode` to the client.
3. `apps/web/src/components/AdmissionCheckoutForm.client.tsx`
   - Submit `confirmationMode: 'embedded'`.
   - Load only the official script: `https://yookassa.ru/checkout-widget/v1/checkout-widget.js`.
   - Mount `new window.YooMoneyCheckoutWidget({ confirmation_token, ... })` inside the current compact payment card.
   - Do not pass a widget `return_url`; navigation is controlled by catalog after verified order state.
   - Poll the existing `/checkout/actions/order?order={publicCode}` sequentially every 2 seconds. Each request must have an 8 second abort timeout; stop on unmount or after 30 minutes.
   - Navigate to `/checkout/result?order={publicCode}` when the projection reaches a terminal state (`CONFIRMED`, `FULFILLED`, `CANCELLED`, `CANCELED`, `FAILED`, `EXPIRED`, `REFUNDED`).
   - Widget `success` should trigger an immediate projection read, not issue a ticket or mark the order paid locally. Finance order state remains the source of truth.
   - Keep the `publicCode` and a visible link to the result page when the script/widget fails.
4. `apps/web/src/components/CheckoutResultPage.client.tsx`
   - The current component performs one lookup only. While the returned order is pending, repeat `/checkout/actions/order?order={publicCode}` with the same sequential/abortable polling policy.
   - Stop on terminal state, unmount or deadline. A transport error must keep the pending UI and retry; it must not become a failed payment.
   - This is required for redirect rollback too: YooKassa may return the buyer before its webhook is visible to the catalog projection.
5. Tests
   - Same checkout payload reuses the same idempotency key after network ambiguity.
   - Polling is sequential, abortable and stops on terminal state.
   - Missing token falls back to provider redirect.
   - A result page opened while the order is pending updates after a later `CONFIRMED` response.

Reference implementation only (do not copy its UI):

- `apps/web/src/components/CheckoutAdmissionPage.client.tsx`
- `apps/web/src/lib/checkout-payment.ts`
- `apps/web/src/lib/checkout-payment.test.ts`

## Acceptance smoke

1. Open `/checkout/admissions/phase-g-test-museum-entry`.
2. Submit buyer email; the YooKassa form must open inline without leaving Daibilet.
3. Complete one sandbox payment.
4. Catalog must move to `/checkout/result?order={publicCode}` as soon as the finance projection confirms the payment; no dependency on YooKassa's ten-second success screen.
5. The result page must show `CONFIRMED` and `ticketNumbers`.
6. Opening the result page before the webhook arrives must transition from pending to confirmed without a manual refresh.
7. The same order must be visible in admin and supplier purchase projections.
8. Redirect mode must still work as rollback.

Do not enable a wide catalog CTA until this smoke is green. No production credentials belong in the repository or handoff logs.
