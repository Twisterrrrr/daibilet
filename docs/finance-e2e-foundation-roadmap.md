# Finance E2E Foundation Roadmap

Дата: 2026-08-09  
Scope: MVP finance contour for first art-object pilot, without supplier payouts automation and without wide catalog CTA.

## Где мы сейчас

- Finance runtime `.159`: YooKassa create-payment smoke reached `confirmationUrl`; reconcile timer installed and active.
- Buyer path: admission checkout page and result page are code-ready; full browser payment depends on YooKassa webhook delivery or reconcile fallback.
- Admin orders: unified list has external TC/Teplohod mirror plus internal Daibilet checkout orders.
- Supplier LC: shell, auth bridge, admissions, orders, readiness, requests, finance, documents and reviews are present; supplier order filters are fixed.
- This slice adds admin refund foundation, admin ledger/reconcile screen and supplier finance/docs read views for refunds, reports, settlements and documents.

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

1. Document acknowledgement and signature status
   - Supplier sees issued documents and can acknowledge receipt.
   - Admin tracks delivered/signed/failed states.
   - File generation/storage remains separate from record issuance.

2. Refund execution
   - Move `RefundRequest` from CREATED/APPROVED to PROCESSING/COMPLETED.
   - Integrate provider refund only after YooKassa refund policy and receipt rules are fixed.
   - Write `SupplierLedgerEntry` REFUND and `FiscalReceipt` REFUND records from the same operation.

3. Admin sales ledger enhancements
   - Add product/status filters and CSV export.
   - Add conflict markers for missing receipts, negative net, unclosed refunds and duplicate reports.
   - Keep reconcile actions dry-run first.

4. Supplier finance actions
   - Supplier acknowledges reports and sees document delivery/signature status.
   - No manual payout controls in supplier LC for MVP.

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
