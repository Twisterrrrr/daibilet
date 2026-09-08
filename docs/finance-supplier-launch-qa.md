# Finance and supplier portal launch QA

Updated: 2026-09-07  
Scope: finance host `.159`, `apps/backend`, `apps/supplier`, finance-owned parts of `apps/admin`, and the HTTP boundary with catalog `.184`.

UX note: the supplier portal uses the approved Replit operational shell as a visual reference, while all counters, readiness states, orders and requests remain backed by the finance API. The shell must not introduce mock data or client-side substitutions for unavailable backend responses.

## 1. Purpose

This document answers three separate questions:

1. Can a supplier be given access to a closed pilot?
2. Can Daibilet accept the first real internal payment?
3. Which functions are foundations only and may safely remain incomplete during the pilot?

The catalog, TC/TEP widgets and catalog deploy on `.184` remain outside finance ownership. They are included only where an HTTP contract or customer journey crosses the boundary.

## 2. Status and gates

Implementation status:

- `REAL` - backed by API and database, not a mock.
- `PARTIAL` - useful read model or narrow happy path exists, but the full operation is not closed.
- `READ_ONLY` - production data is shown, but the user cannot manage it.
- `MISSING` - no usable product path yet.
- `UNVERIFIED_LIVE` - code exists, but the current production deployment/browser path has not been confirmed.

Launch gates:

- `G0` - blocks giving any external supplier an account.
- `G1` - blocks a closed supplier pilot with one museum/gallery.
- `G2` - blocks the first real internal payment.
- `G3` - may be completed during or after the closed pilot.

## 3. Executive verdict

The finance contour is not a UI mock. The database already contains separate supplier, admission, checkout, payment, fulfillment, ledger, report, settlement, document, review and integration models. Supplier authentication, read models, requisites, admission requests, purchase projection, STUB checkout and the YooKassa backend path are implemented.

It is nevertheless too early to call the supplier portal production-complete:

- the main admin lives on catalog `.184`, while finance admin actions live in the finance branch; the operator path must be bridged or exposed as an explicitly protected finance-admin surface;
- event creation requests can be submitted, but admin apply for `CREATE Event` returns `501`;
- the public order lookup exposes buyer contacts and ticket numbers using only a seven-digit `publicCode`; this requires hardening before real customer data;
- a completed embedded YooKassa sandbox browser payment remains unverified end to end.

Closed pilot readiness: **yellow; authentication, invite migration and supplier read paths are live, while role/browser acceptance and operator access still need closure**.

First real internal payment readiness: **red until order lookup security, paid sandbox E2E and receipt policy are closed**.

## 4. Product surface matrix

| Area | Current source of truth | Current capability | Status | Gate / unresolved work |
|---|---|---|---|---|
| Login | `SiteUser`, `SupplierUser`, JWT + refresh cookie | Login, logout, session restore, supplier membership selection | REAL / LIVE | G0: expiry rotation is covered by client tests; repeat full 15-minute browser acceptance before external pilot |
| Initial access | `SupplierUser.inviteTokenHash`, `inviteExpiresAt` | Admin issues 48h single-use invite; supplier sets password | REAL / LIVE FOUNDATION | G0: verify expired/reused/concurrent token behavior through the operator-facing invite path |
| Roles | `SupplierRole` | OWNER/ADMIN full writes; ACCOUNTANT requisites; OPERATOR requests; VIEWER read-only | REAL | G1: role-aware UI implemented; verify every role through HTTP and browser before external pilot |
| Password lifecycle | `SiteUser.passwordHash`, refresh hash | Initial password through invite | PARTIAL | G1: change password; G3: forgot/reset email, forced session revoke, optional 2FA |
| Dashboard | supplier portal DTO | Orders, sales, reviews, readiness, next operational steps | REAL | G1: live data/empty/error/mobile smoke |
| Readiness | listing health + legal/profile state | Actionable blockers and links to the relevant section | REAL | G1: verify `canSell` changes after legal approval and product correction |
| Events list | `SupplierEvent`, `Event`, sessions/offers | Read supplier events, schedule summary, price and issues | READ_ONLY | G1 only if pilot supplier sells events; 20-row server pagination implemented |
| Event request | `EventChangeRequest` | Supplier can submit a basic new open-date event request | PARTIAL | G1 for event pilot: admin cannot apply CREATE; no full slot editor; no edit-existing form |
| Event moderation | admin request API and applier | Approve/reject/apply updates, schedule, offers, content/SEO subsets | PARTIAL | G1: CREATE unsupported; gallery/content blocks unsupported; recurrence must be materialized as sessions |
| Admissions list | `AdmissionProduct`, `AdmissionOffer` | Real list, validity, offers, price and listing health | REAL | G1: pagination and role-aware create action implemented; search/detail UX remains |
| Admission request | `EventChangeRequest` with `ADMISSION_PRODUCT` payload | Supplier creates a museum/gallery/open-date product proposal | REAL narrow path | G1: edit-existing UX, multiple offers, richer validity/image/description fields |
| Admission moderation | admin request API and applier | Approve/reject/apply CREATE and UPDATE, replace offers | REAL | G1: smoke from supplier form through admin apply to public projection |
| Requests | `EventChangeRequest` | Supplier sees status, admin comment and timestamps | REAL read + create | G1: detail/diff; G3: withdraw, duplicate, correct-and-resubmit |
| Orders | `CheckoutOrder` / `CheckoutItem` through PurchaseProjection | Supplier sees only its items, buyer, status, amount, expected payout and issued ticket numbers | REAL | G1: 20-row pagination and compact order drawer implemented; multi-supplier isolation/PII verification remains |
| Ticket fulfillment | `FulfillmentItem` | Ticket numbers/status can reach order projections | PARTIAL | G2: paid E2E must show issued ticket consistently; define resend/support operation |
| Ledger | `SupplierLedgerEntry` | Supplier reads sales, commission, refunds and balance | REAL read model | G2: reconcile totals against a paid order; immutable accounting invariants |
| Refunds | `RefundRequest` | Admin can create a guarded request; supplier sees status | PARTIAL | G2/G3: actual YooKassa refund execution, fulfillment cancellation and ledger reversal are not closed |
| Reports | `SupplierReport`, lines | Read reports; admin can close a period | PARTIAL | G3: validate accounting basis, correction/versioning and operator permissions |
| Settlements | `SupplierSettlement` | Admin close-period produces settlement state | PARTIAL | G3: this is not a real payout or bank reconciliation |
| Payouts | `Payout`, `PayoutItem` | Supplier can read recorded payouts | READ_ONLY | G3: payout request/approval/export/payment/reconciliation workflow missing |
| Documents | report/settlement/document projections | Supplier sees document metadata and counts | PARTIAL | G3: no dependable PDF/file generation, download, delivery or signature flow |
| Reviews | `Review`, supplier response models | Supplier reads review queue and response state | READ_ONLY | G3: response draft/moderation and dispute flow not wired in supplier UI |
| Requisites | `SupplierLegalProfile`, bank accounts | Supplier edits legal and primary bank details; state returns to review | REAL | G1: stronger INN/KPP/OGRN/BIK/account validation; audit diff; sensitive-data policy |
| Legal moderation | admin supplier API | Approve/reject with comment; approval requires complete primary account | REAL | G1: bridge into the operator's actual admin on `.184`; verify re-edit resets approval |
| Team | `SupplierUser` | Supplier reads users and roles; admin issues initial invite | PARTIAL | G1: show invite state accurately; G3: deactivate, role change, re-invite, audit log |
| Integrations | `SupplierIntegration`, runs, issues | Mode/capability/venue information is visible | READ_ONLY foundation | G3: API credentials, routes, dry run, run history, retry and issue resolution are missing |
| Public admission projection | finance public API | List/detail/venue/supplier projection with `canSell` and `checkoutPath` | REAL | G2: m2m token or explicit network policy; contract regression with catalog `.184` |
| STUB checkout | checkout/payment/fulfillment/ledger | Repeatable internal test purchase | REAL | Keep available only for controlled test; supplier smoke endpoints must fail closed in production |
| YooKassa redirect | finance checkout | Create payment, idempotency, canonical return with `publicCode` | REAL backend | G2: browser paid sandbox E2E and return/result smoke |
| YooKassa embedded | confirmation token path | Backend foundation and catalog handoff exist | PARTIAL | G2: completed widget payment, close/return behavior and polling smoke |
| Webhook | payment event log + processed event | Replay dedupe, provider id guard, status application | REAL backend | G2: live sandbox delivery/replay/out-of-order tests and alerting |
| Reconcile/reaper | CLI + systemd timer definition | Applies remote terminal state and expires orphan reservations | REAL foundation | G2: confirm timer live after current deploy; alert on repeated failure |
| Buyer account | PurchaseProjection | Internal and external purchase projection foundation | PARTIAL cross-host | G2: confirm catalog UI and identity rules; do not query purchases by email from an anonymous public route |
| Admin supplier control | finance admin DTO/API/UI | Suppliers, readiness, legal review, invite, orders, finance | PARTIAL cross-host | G0/G1: operator-accessible deployment/bridge and consistent admin auth |

## 5. Detailed QA suites

### 5.1 Authentication, invitation and session

| ID | Scenario | Expected result | Gate |
|---|---|---|---|
| AUTH-01 | Open supplier portal without a session | Login form; no supplier data request succeeds | G0 |
| AUTH-02 | Correct supplier login | Portal opens only memberships assigned to this `SiteUser` | G0 |
| AUTH-03 | Wrong password | Generic 401, no account enumeration, no stale session | G0 |
| AUTH-04 | More than configured login attempts from one IP | 429; retry works after window | G0 |
| AUTH-05 | Reload after access token expires but refresh cookie is valid | One refresh request, new access token, current page restored | G0 |
| AUTH-06 | Two API calls receive 401 simultaneously | Single-flight refresh; both retry once | G0 |
| AUTH-07 | Refresh token invalid/revoked | Session cleared and login shown | G0 |
| AUTH-08 | Logout | Refresh token revoked, cookie cleared, protected API returns 401 | G0 |
| AUTH-09 | Valid invite, new account, password >=10 chars | Invite accepted once, membership active, automatic login succeeds | G0 |
| AUTH-10 | Expired, malformed or reused invite | 410/422/409 without data leakage | G0 |
| AUTH-11 | Two simultaneous accept requests | Exactly one succeeds | G0 |
| AUTH-12 | OWNER/ADMIN/ACCOUNTANT/OPERATOR/VIEWER write matrix | Allowed actions succeed; all other writes return 403 | G1 |
| AUTH-13 | User manually changes `?supplier=` to another supplier | Backend resolves membership and denies foreign supplier access | G0 |
| AUTH-14 | Production request with query fallback and no bearer | 401; `DAIBILET_SUPPLIER_QUERY_FALLBACK` must be off | G0 |
| AUTH-15 | Production engineering purchase endpoint | 404/403 unless an explicit controlled smoke flag is enabled | G0 |

### 5.2 Onboarding and requisites

| ID | Scenario | Expected result | Gate |
|---|---|---|---|
| ONB-01 | New supplier opens requisites | Empty but usable form; current status explained | G1 |
| ONB-02 | Save valid legal details | Data persists; status becomes review-required; readiness changes | G1 |
| ONB-03 | Save primary bank account | Account is linked only to current supplier and masked on read | G1 |
| ONB-04 | Try to update another supplier's account id | 404/403 and no write | G0 |
| ONB-05 | Admin approves complete details | `VERIFIED`, timestamp/reviewer audit, `canSell` recalculated | G1 |
| ONB-06 | Admin rejects with comment | Supplier sees a clear correction request | G1 |
| ONB-07 | Supplier edits an approved profile | Approval is reset and sales/readiness policy behaves as agreed | G1 |
| ONB-08 | Invalid INN/KPP/OGRN/BIK/account formats | Field-level errors; no partial corrupt write | G1 |
| ONB-09 | ACCOUNTANT edits requisites; OPERATOR/VIEWER try | ACCOUNTANT allowed, others 403 | G1 |

### 5.3 Admissions and offers

| ID | Scenario | Expected result | Gate |
|---|---|---|---|
| ADM-01 | Supplier submits museum admission with one offer | `SUBMITTED` request visible to supplier and admin | G1 |
| ADM-02 | Venue is not linked to supplier | 403; no request/product is created | G0 |
| ADM-03 | Admin rejects request | Comment appears in supplier requests | G1 |
| ADM-04 | Admin approves and applies request | Product + offer created once; request `APPLIED` | G1 |
| ADM-05 | Apply same request again | No duplicate product/offer | G1 |
| ADM-06 | Public projection after apply | Product appears only when publish/readiness policy allows it | G1 |
| ADM-07 | `canSell=false` product | Catalog must not render active checkout CTA | G2 |
| ADM-08 | Multiple ticket categories and minimum price | Correct active offers and minimum eligible price | G2 |
| ADM-09 | Limited stock purchase | Atomic decrement; concurrent orders never make stock negative | G2 |
| ADM-10 | Expired/cancelled pending payment | Reservation released exactly once | G2 |
| ADM-11 | Open-date validity | Ticket shows correct validity window after purchase | G2 |
| ADM-12 | Edit existing admission | Supplier form, moderation diff and apply update only owned product | G1; currently missing in UI |

### 5.4 Events, schedules and drafts

| ID | Scenario | Expected result | Gate |
|---|---|---|---|
| EVT-01 | Supplier event list | Only linked events, correct schedule/price/readiness | G1 for event suppliers |
| EVT-02 | Submit open-date event request | Request is created, but UI clearly labels it a draft proposal | G1 |
| EVT-03 | Admin applies new event request | Event, supplier link, offers and schedule are created atomically | G1; currently unsupported |
| EVT-04 | Submit concrete slots | Timezone, capacity and end time preserved; max 100 validated | G1 |
| EVT-05 | Update existing schedule | Stale base snapshot is rejected; active reservations protected | G1 |
| EVT-06 | Imported SOURCE_MANAGED event update | Supplier cannot overwrite source schedule/offers without capability | G0 |
| EVT-07 | Open-date event | No fake sessions required; validity fields drive checkout | G2 |
| EVT-08 | More than 50 events | Pagination controls load subsequent pages | G3; currently UI stops at first page |

### 5.5 Orders, buyer data and fulfillment

| ID | Scenario | Expected result | Gate |
|---|---|---|---|
| ORD-01 | Internal purchase appears in supplier LC | Only supplier-owned items and supplier amounts are shown | G1 |
| ORD-02 | Multi-supplier order | Each supplier sees only its items, no foreign amounts/tickets | G0 |
| ORD-03 | Order statuses | Pending, paid, confirmed, cancelled, refunded labels are understandable and consistent | G1 |
| ORD-04 | Paid order fulfillment | Ticket numbers appear in admin, supplier and buyer projections | G2 |
| ORD-05 | No buyer name | UI shows `-`, not technical fallback | G1 |
| ORD-06 | More than 50 orders | Pagination/search/status/date filters work without loading all rows | G1/G3 |
| ORD-07 | Public order lookup by guessed seven-digit code | Must not expose email, phone, confirmation URL or reusable ticket identifiers | G2; current DTO is unsafe |
| ORD-08 | Buyer purchases lookup by email | Anonymous callers cannot enumerate a buyer's purchases | G2 |
| ORD-09 | Support resend/reissue | Audited operator action and customer notification | G3; missing |

Recommended fix for `ORD-07`: keep the human-friendly seven-digit `publicCode` as display/reference, but require a separate high-entropy `publicAccessToken` in the result/ticket URL. The anonymous response before proof should contain only status and generic order summary. Do not turn `publicCode` itself back into a long technical order number.

### 5.6 YooKassa, webhook and reconcile

| ID | Scenario | Expected result | Gate |
|---|---|---|---|
| PAY-01 | Same idempotency key + same payload | Same local/provider payment; no duplicate charge | G2 |
| PAY-02 | Same idempotency key + changed payload | 409; no second payment | G2 |
| PAY-03 | Redirect checkout | YooKassa return URL is `/checkout/result?order={publicCode}` | G2 |
| PAY-04 | Embedded checkout | Confirmation token opens widget and successful payment reaches result immediately | G2 |
| PAY-05 | `payment.succeeded` webhook | Order/payment/item/fulfillment/ledger change once | G2 |
| PAY-06 | Exact webhook replay | 200/idempotent result, no duplicate ledger or tickets | G2 |
| PAY-07 | Webhook provider payment id mismatch | Rejected and logged | G2 |
| PAY-08 | Canceled payment | Order terminal state and stock release applied once | G2 |
| PAY-09 | Webhook missed | Reconcile obtains provider state and closes order | G2 |
| PAY-10 | YooKassa timeout/error | Customer sees recoverable state; same idempotency key can safely resume | G2 |
| PAY-11 | Reconcile timer failure | Non-zero service state and operator-visible alert/log | G2 |
| PAY-12 | Production mode | Live credentials cannot be enabled accidentally; sandbox/live shop mismatch is detected operationally | G2 |
| PAY-13 | Receipt data | Fiscal policy, VAT, supplier/agent attributes and receipt responsibility match the active contract | G2 before real money |

### 5.7 Ledger, refunds, reports, settlements and payouts

| ID | Scenario | Expected result | Gate |
|---|---|---|---|
| FIN-01 | Successful sale | `SALE` and `COMMISSION` entries balance to supplier net | G2 |
| FIN-02 | Duplicate webhook/reconcile | No duplicate ledger entries | G2 |
| FIN-03 | Refund request exceeds refundable amount | Rejected before provider call | G2 |
| FIN-04 | Actual full/partial refund | Provider result, payment, fulfillment, ledger and capacity remain consistent | G3; execution missing |
| FIN-05 | Close period | Only reconciled entries included; second close is idempotent or versioned | G3 |
| FIN-06 | Report/settlement totals | Match source ledger exactly | G3 |
| FIN-07 | Document file | Download is authorized to supplier and immutable after issue | G3 |
| FIN-08 | Payout | Approval, export/payment reference, paid state and reconciliation are audited | G3; missing |

### 5.8 Reviews and integrations

| ID | Scenario | Expected result | Gate |
|---|---|---|---|
| REV-01 | Supplier opens reviews | Only reviews for its products/events, correct counters | G3 |
| REV-02 | Supplier response | Draft -> moderation -> published, with audit and rejection comment | G3; missing UI/write path |
| REV-03 | Review dispute | Supplier can report a review without hiding it directly | G3; missing UI/write path |
| INT-01 | Imported ticketing supplier | Read-only catalog mode; no internal write controls | G1 when enabled |
| INT-02 | Internal-sales supplier | Admission/event request and platform checkout capabilities shown | G1 |
| INT-03 | API-sync supplier | Integration status/runs/issues visible | G3 |
| INT-04 | API credentials and routes | Secret references only, encrypted/managed secret storage, test connection and retry | G3; missing |

### 5.9 Cross-contour and admin operations

| ID | Scenario | Expected result | Gate |
|---|---|---|---|
| XHOST-01 | `.184` reads admission projection from `.159` | HTTP only, bounded timeout, no finance DB connection | G2 |
| XHOST-02 | Projection auth enabled | Catalog sends m2m bearer; public clients cannot call protected aggregate endpoints | G2 recommended |
| XHOST-03 | Finance unavailable | Catalog venue/city pages fail soft; TC/TEP widgets remain unaffected | G2 |
| XHOST-04 | Admin issues invite/reviews legal/request | Operator can perform finance action from the actual admin workflow | G0/G1; bridge/deployment unresolved |
| XHOST-05 | Catalog result polls finance order | Pending -> confirmed transition works without leaking protected data | G2 |
| XHOST-06 | Finance attempts catalog write | Forbidden by architecture; use projection/event contract only | G0 |

### 5.10 UX, accessibility and resilience

| ID | Scenario | Expected result | Gate |
|---|---|---|---|
| UX-01 | Every page loading/error/empty state | No mock flash; retry is available; errors are in Russian | G1 |
| UX-02 | Mobile 360-430px | Navigation, tables/forms and primary actions remain usable | G1 |
| UX-03 | Keyboard-only | Visible focus, logical tab order, forms/submission usable | G1 |
| UX-04 | Screen reader basics | Labels, headings, status text and errors are announced | G1 |
| UX-05 | Role without write permission | Forbidden buttons are hidden/disabled with explanation | G1 |
| UX-06 | Slow API / timeout | Request terminates, error shown, duplicate submit prevented | G1 |
| UX-07 | More than 50 rows | User can page through results; current silent truncation is removed | G1 orders / G3 other lists |
| UX-08 | Destructive or financial action | Explicit confirmation and audit reference | G2/G3 |

## 6. Security and privacy findings

### P0 before real customer data

1. **Public order enumeration.** `GET /api/checkout/orders/{publicCode}` has no authentication or rate limit, while `PublicCheckoutOrderDto` contains email, phone, ticket numbers, totals and provider confirmation URL. A seven-digit code is not sufficient authorization. Add a high-entropy access token or authenticated buyer session and return a minimized DTO.
2. **Admin boundary.** Finance admin routes use Basic auth and are not automatically the same surface as the production admin on `.184`. Document and enforce where Basic credentials terminate; prefer a server-to-server finance proxy from admin rather than exposing credentials to browser JavaScript.
3. **Role UX.** Backend RBAC exists, but the portal renders the same write forms for every role. Hide unauthorized actions and test 403 as defense in depth.
4. **Production flags.** Confirm supplier query fallback and supplier checkout smoke flags are off in production.

### P1 during closed pilot

1. Access token is stored in `localStorage`; this increases impact of XSS. Keep CSP strict and plan a same-origin BFF/HttpOnly session for a later hardening pass.
2. Auth rate limiting is in process memory. Multiple API processes/restarts reset it; move to Redis/Postgres or reverse-proxy limits before broad onboarding.
3. Add audit records for invite issued/reissued, role changed, user deactivated, requisites changed and finance operations.
4. Validate and protect bank/legal data according to backup, access and retention policy. Supplier reads must remain masked.

## 7. What remains, in priority order

### P0 before the first supplier receives access

- Deploy `1e53bf0b` and `55be2407` to `.159` and apply migration `20260907120000_supplier_user_invites`.
- Restore SSH/operator access to `.159`; confirm API, supplier static app, Nginx and reconcile timer.
- Run browser invite -> password -> login -> reload/refresh -> logout.
- Run the five-role RBAC matrix and hide forbidden UI actions.
- Decide the operator path for finance admin actions from the real admin on `.184`.
- Correct the Team copy/state and verify no engineering checkout controls or query fallback are visible in production.

### P0 before the first real internal payment

- Deploy the implemented finance order-access proof, add the catalog HttpOnly-cookie bridge, then enable enforcement and rate limiting.
- Complete one embedded YooKassa sandbox card payment in a browser.
- Verify webhook, missed-webhook reconcile, stock release, ticket numbers and PurchaseProjection in admin/supplier/buyer views.
- Verify catalog result polling and failure states on `.184`.
- Fix and document fiscal receipt/VAT/agent responsibility for the currently active `SINGLE_MERCHANT` contract.
- Confirm backup and restore for finance Postgres before storing real legal/payment data.

### P1 during the closed pilot

- Add admission edit-existing flow and multiple ticket categories.
- Implement event CREATE apply and usable schedule/slot editor before onboarding an event-selling supplier.
- Add supplier support contact/action to the implemented paginated order workspace.
- Add role change, deactivate and re-invite; add password change/reset.
- Add operator alerting for failed webhook/reconcile/fulfillment.

### P2 after the pilot

- Actual YooKassa refund execution and partial-refund lifecycle.
- Real payout workflow and bank reconciliation.
- Generated downloadable closing documents and delivery/signature states.
- Supplier review responses/disputes.
- Full API_SYNC credentials, mapping, runs, retries and issue management.
- Agent/cloud-cashbox transition and supplier contract migration.

## 8. Closed-pilot smoke script

Use a dedicated test supplier and sandbox payment only.

1. Admin creates or opens the test supplier and links one museum/gallery venue.
2. Admin issues an OWNER invite to a new test email.
3. Supplier opens the link, sets a password, lands in the correct supplier account.
4. Reload the browser after access-token expiry or forced expiry; session recovers once.
5. Supplier fills legal and bank details; readiness says that review is required.
6. Admin rejects once with a comment; supplier sees it and corrects the fields.
7. Admin approves; readiness reflects verified requisites.
8. Supplier submits one admission product with an adult offer.
9. Admin reviews diff, approves and applies it.
10. Public finance projection returns the admission; `canSell` and `checkoutPath` match readiness.
11. Catalog venue page shows admission CTA only when `canSell=true`.
12. Make a STUB purchase; verify order, fulfillment, stock and ledger in admin and supplier LC.
13. Make a YooKassa sandbox purchase; verify redirect/embedded completion and catalog result page.
14. Confirm webhook produces one payment transition, one set of ledger entries and ticket numbers.
15. Replay the webhook; totals and tickets do not change.
16. Create a pending order without delivering webhook; reconcile closes it according to provider state.
17. Log in as OPERATOR, ACCOUNTANT and VIEWER; verify the role matrix and foreign supplier isolation.
18. Export evidence: public codes, timestamps, statuses and screenshots without secrets or full buyer data.

Pass condition for supplier access: steps 1-10 and 17 are green.  
Pass condition for first real payment: all 18 steps are green plus the security and receipt gates above.

## 9. Automated checks

Current baseline on branch `codex/stage0-admission-ticket-core`:

- backend DB-aware suite: 146 tests green;
- supplier/admin typecheck and build green;
- Prisma schema validation green;
- CI for `55be2407` green.

Required additions:

- HTTP integration test for anonymous public order minimization/token proof;
- browser test for invite/login/refresh/logout and RBAC visibility;
- browser sandbox checkout test up to the external YooKassa boundary, with manual payment completion;
- contract test between catalog `.184` client and finance `.159` projection;
- timer/health smoke for reconcile and finance database backup.

## 10. Live verification record

On 2026-09-07:

- `daibilet-msk` SSH works as `deploy`; catalog branch `feat/next-monorepo` at `c8e0c568`; web/API/Nginx are active.
- the local `id_ed25519` key opens `deploy@85.193.80.159`; adding a `daibilet-finance` alias remains optional convenience work;
- finance branch on `.159` was deployed to `f1f590ec`; migration `20260907120000_supplier_user_invites` is applied and all 22 migrations report up to date;
- `daibilet-finance-api.service`, Nginx and `daibilet-finance-yookassa-reconcile.timer` are active;
- finance API correctly listens on `127.0.0.1:4100`; local health is about 12 ms, admission projection about 106 ms;
- from `.159`, `supplier.daibilet.ru`, `finance-api.daibilet.ru` and `pay.daibilet.ru` answer over TLS in about 80-100 ms;
- anonymous supplier dashboard returns 401;
- reconcile's latest scheduled run exited successfully;
- supplier login, dashboard, access-token refresh, logout and refresh-cookie clearing passed live browser smoke;
- the Replit UX pass was checked locally against the live finance API on dashboard, readiness, admissions, requests, orders, finance and requisites without transport/fallback errors.
- finance and supplier portal were fast-forwarded to `c0847c7`; role-aware controls, 20-row pagination and the order drawer are live;
- production supplier smoke opened confirmed order `4717674` and displayed issued ticket `TKT-4717674-01` without technical ids.

The earlier Prisma `P1000` from the manual CLI probe was caused by launching Prisma from `packages/db` without loading the repository root `.env`; the running API, migrations and reconcile use the correct service `EnvironmentFile`.
