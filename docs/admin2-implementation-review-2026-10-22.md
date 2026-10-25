# Admin center mock: implementation review

Date: 2026-10-22. Reference: owner-supplied `deepseek_html_20261022_71e4aa.html`. The HTML is a visual prototype with local data and simulated permissions, not a production client.

## Adopt

- Grouped operator navigation, attention queue, compact registry filters with URL state, seven-part order detail, clear loading/empty/error/403 states, and restrained financial status language.
- Start the transfer with the unified order registry and detail because working admin order DTOs already exist. Preserve channel semantics for external, internal, and supplier API sales.
- Keep event/Place/city workbenches as separate operator flows. The prototype's tables are navigation shells, not replacements for schedule, source override, Place linking, hub editing, and moderation controls.

## Correct during transfer

1. The mock's `orderData` contains full buyer names and email addresses in browser JavaScript, then `can('orders.pii.read')` masks them during rendering. Production must use a server-selected masked DTO and a separate audited disclosure path. The existing buyer registry (`admin-buyers.ts` / `BuyersPage.tsx`) already provides server masking; do not replace it with this local role switch.
2. The API-gateway example makes the gateway the payment provider and partner the receipt issuer. `Supplier.integrationMode` and `Supplier.paymentMode` are separate; payment, ticket issuance, and receipt source must be resolved independently for each supplier/order.
3. The internal order sample claims `receipt.issued` under a temporary fiscal mode. Show a receipt only when the fiscal provider has returned a real receipt fact; pending/unknown must stay explicit.
4. Mock `roleViews` and `canDo` are only presentation. The actual server permission contract must gate route, DTO fields, exports, refunds, publication, and payouts. A front-end 403 screen is not proof of authorization.
5. `OpsHealthDTO`, `RefundChainDTO`, `ReceiptConfigDTO`, and ten-way `AdminFinanceDTO` in the accompanying table are proposed contracts, not currently shipped names. Map existing `AdminOrderDetailDto`, supplier summaries, refund/ledger projections, and request DTOs before adding fields.
6. The attention queue has no common backend aggregator yet. Until it exists, only show sections whose existing APIs can provide counts and direct links; error/unknown must not be rendered as zero.

## First implementation slice

1. Choose the production admin entry point (Next `/admin` versus the Vite `apps/admin` finance/operator surface) and one permission source before restyling duplicate screens.
2. Apply the visual shell and registry pattern to the real unified order list; retain URL filters and back navigation, existing DTO mapping, and masked contacts.
3. Add the seven-section detail layout using actual available facts. Unknown receipt, settlement, and service-confirmation data remain unknown, with no simulated success event.
4. Verify one paid, one pending, one refunded, and one external order in the browser and directly against API; test masked versus privileged responses at the API boundary.

The mock's “missing” list is a design backlog, not an audit of existing code. In particular, unified buyer projection, masked buyer DTO, event change-request diff and approval flow, and parts of the order/refund state machine already exist in this branch.
