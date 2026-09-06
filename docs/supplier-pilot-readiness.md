# Supplier pilot readiness

**Updated:** 2026-09-07  
**Scope:** finance `.159`, `apps/supplier`, one or two manually onboarded suppliers  
**Boundary:** [catalog-finance-projection.md](./catalog-finance-projection.md)

## Decision

The supplier portal is not a mock, but it is not ready for broad self-service onboarding.

- **Closed pilot:** allowed after the session/RBAC patch is deployed and the browser smoke below is green.
- **Broad access:** blocked until team invites, password recovery, complete edit requests and production payment/fiscal policy are ready.
- **Real settlements:** operator-assisted only. The current ledger/report views are not automatic bank payouts.

## What a pilot supplier can do

- sign in with an individually provisioned `SiteUser` linked through `SupplierUser`;
- see only their supplier, venues, events and admission products;
- understand sale readiness and blockers;
- submit legal and primary bank details for admin review;
- submit admission/event change requests for admin moderation;
- see internal checkout orders through `PurchaseProjection` without provider or database ids;
- see ledger, refund, report, settlement and document projections available for their supplier;
- keep a browser session through access-token expiry using the HttpOnly refresh cookie.

## Operator-assisted parts

- admin creates the initial supplier user and membership;
- admin approves or rejects legal/bank details;
- admin applies supplier catalog change requests;
- admin controls publication, commission rules and sale readiness;
- finance operator runs refunds, period close and payment/reconcile operations.

## Current safeguards

- production supplier query fallback is closed;
- anonymous and invalid-token requests fail with `401`;
- writes are authorized by membership role: `OWNER`/`ADMIN`, scoped `OPERATOR`, scoped `ACCOUNTANT`, read-only `VIEWER`;
- expired access tokens are refreshed once and concurrent requests share one refresh operation;
- engineering STUB/YooKassa purchase controls are not rendered in the supplier UI and their supplier routes fail closed in production unless an explicit temporary QA flag is enabled;
- purchase and public projections do not expose internal payment/provider identifiers.

## Browser smoke before giving access

1. Open `https://supplier.daibilet.ru` in a private window and confirm that no supplier data is visible before login.
2. Sign in as the pilot supplier and keep the tab open through a 15-minute access-token expiry.
3. Reload the page and confirm the session is restored without another login.
4. Open Dashboard, Readiness, Admissions, Orders, Finance, Documents, Profile and Integrations.
5. Confirm that Admissions has no STUB/YooKassa engineering actions.
6. Save legal/bank details and confirm the profile moves to admin review.
7. Submit one admission change request and approve/apply it in admin.
8. Complete one sandbox buyer checkout and confirm the order appears in supplier Orders.
9. Verify a `VIEWER` cannot submit writes and receives `403` from a direct API request.

## Blocking work for broad access

| Area | Current state | Broad-access requirement |
|---|---|---|
| Team | Read-only | Invite, deactivate and role-change flows with audit |
| Credentials | Manual provisioning | Forgot/reset/change password and email delivery |
| Catalog editing | Moderated create flow | Clear update flow for existing admissions/events and request history |
| Payments | Sandbox/controlled pilot | Production credentials, fiscalization and agreed merchant/agent contract |
| Money | Ledger/report projection | Reconciled payout process, downloadable documents and operator alerts |
| Support | No formal workflow | Supplier support contact, incident path and audit retention |

## Launch gate

The first supplier account may be issued when:

- the current patch is deployed to `.159`;
- the browser smoke is green;
- the account is created manually with the minimum required role;
- sandbox checkout and order projection are green for that supplier;
- the owner accepts operator-assisted onboarding and settlements for the pilot.
