# Finance E2E Foundation Roadmap

Дата: 2026-08-09  
Scope: MVP finance contour for first art-object pilot, without supplier payouts automation and without wide catalog CTA.

## Где мы сейчас

- Finance runtime `.159`: YooKassa create-payment smoke reached `confirmationUrl`; reconcile timer installed and active.
- Buyer path: admission checkout page and result page are code-ready; full browser payment depends on YooKassa webhook delivery or reconcile fallback.
- Admin orders: unified list has external TC/Teplohod mirror plus internal Daibilet checkout orders.
- Supplier LC: shell, auth bridge, admissions, orders, readiness and requests are present; supplier order filters are fixed.
- This slice adds the missing admin order detail foundation for internal finance state: payments, fulfillment, ledger, refunds, receipts and operation readiness.

## MVP end-to-end contour

1. Product setup
   - Admin creates or approves supplier venue admission product.
   - Supplier legal/payment profile is reviewed and marked ready.
   - Saleable projection exposes only safe public fields.

2. Buyer sale
   - Public checkout creates `CheckoutOrder`, `CheckoutItem`, `Payment`.
   - YooKassa redirects buyer to hosted confirmation.
   - `payment.succeeded` via webhook or reconcile confirms local order.
   - Fulfillment issues platform ticketNumbers for the buyer account and result page.

3. Operator control in admin
   - Order detail shows buyer, product, status, payment, fulfillment and ledger in one place.
   - Blockers explain why an order cannot be refunded, reported or closed.
   - External TC/Teplohod orders remain source-mirror records with ticket linking, not platform finance records.

4. Supplier LC
   - Supplier sees only own admissions, orders and readiness.
   - Next views must add finance summaries by period: sold, refunds, commission, net payable.
   - Reviews by supplier venues/events/admission products must be visible from LC as a separate quality tab.

## Next PR-sized steps

1. Admin refund foundation
   - Create/list `RefundRequest` from internal order detail.
   - Keep refund action gated by payment status, fulfillment status and existing refund state.
   - Store provider ids/statuses but do not expose secrets or raw provider payloads in UI.

2. Admin sales ledger and reconcile screen
   - Period filters by supplier, product, status and payout readiness.
   - Show gross, commission, refund, payout and net from `SupplierLedgerEntry`.
   - Add a dry-run reconcile endpoint before any mutating close action.

3. Supplier finance read views
   - Supplier sees orders, period totals, pending refunds, upcoming payout estimate and documents.
   - No manual payout controls in supplier LC for MVP.

4. Supplier reports and settlements
   - Generate `SupplierReport` snapshots from ledger for a period.
   - Close `SupplierSettlement` only when blockers are empty.
   - Add `SupplierDocument` draft/issued/accepted statuses for agent report and closing docs.

5. Fiscal receipts
   - Show `FiscalReceipt` status in admin order detail and period report.
   - Add retry/escalation only after receipt provider integration is selected.

6. Reviews in Supplier LC
   - Filter reviews by supplier-owned venue/event/admission product.
   - Show rating, verification source, moderation status and unresolved feedback.
   - Keep response/moderation actions separate from finance actions.

## Not in this MVP slice

- Wide catalog checkout CTA.
- Automatic supplier bank payouts.
- Redis catalog rebuild changes.
- Finance host secrets or YooKassa credentials in repo/docs.
