# Daibilet DB

Local Postgres runs through Docker Compose.

```bash
docker compose up -d postgres
export DATABASE_URL="postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet"
pnpm db:validate
pnpm db:migrate
pnpm db:smoke
```

На production применяются только уже созданные миграции:

```bash
pnpm db:deploy
```

## Runtime client

Application code should import the shared Prisma bridge through the workspace package.

The bridge creates a Prisma 7 client with `@prisma/adapter-pg` and uses `DATABASE_URL`, falling back to local Docker Postgres:

```ts
import { prisma } from '@daibilet/db';

const events = await prisma.event.count();
```

`db:smoke` verifies the client against the live database by reading counts for events, sessions, offers, venues, cities, landings, external orders and tickets.

`ProviderLink` is the additive source identity layer. `EventSourceLink` remains during the migration, but new import/read-model work should prefer `ProviderLink` when it needs to resolve a provider-owned event, session, offer or venue id.

## Current contour

The active MVP runtime still uses a widget-first sales model:

- imported sources and raw records;
- provider links for source-owned event, session, offer and venue identities;
- catalog events, sessions, offers;
- categories, subcategories, tags;
- cities, regions, venues;
- SEO landings and content blocks;
- future articles;
- external order/ticket mirrors for purchases made in provider widgets;
- buyer account through `SiteUser`.

## Phase 2-4 foundation

The schema now includes an additive foundation for the next marketplace phases. These tables are present so we can evolve without rebuilding the DB shape later, but they are not active in the MVP checkout flow yet.

Phase 2, YooKassa and supplier account:

- `Supplier`, `SupplierUser`, `SupplierVenue`, `SupplierEvent`;
- `SupplierCommissionRule`;
- `Payout`, `PayoutItem`;
- `FiscalReceipt`.

Phase 3, internal Daibilet checkout:

- `CheckoutOrder`;
- `CheckoutItem`;
- `Payment`;
- optional bridge from `CheckoutOrder` to `ExternalOrder`, so widget-era purchases and future internal purchases can coexist.

Phase 4, trip planner and unified voucher:

- `TripPlan`;
- `TripPlanItem`;
- `TripVoucher`;
- `TripVoucherItem`.

Important boundary: adding these models does not mean Daibilet starts accepting payments through itself. Production behavior remains widget-first until the YooKassa/fiscalization code and operator process are implemented and tested.

## Phase 2.0 commerce contracts

The next additive migration extends the marketplace foundation without switching runtime payments on:

```text
prisma/migrations/20260709223000_phase2_commerce_supplier_contracts/migration.sql
```

It adds the contracts we need before wiring YooKassa and supplier self-service:

- `PurchaseFlow` to keep provider widgets (`EXTERNAL`) and Daibilet checkout (`PLATFORM`) separate;
- `FulfillmentItem` for per-ticket/order-item fulfillment;
- `RefundRequest` for controlled refunds before provider or PSP integration;
- `PaymentEventLog`, `ProcessedWebhookEvent`, `IdempotencyKey` for webhook audit and duplicate protection;
- supplier legal profile, bank accounts, ledger, reports, settlements, documents and disputes;
- review models for internal reviews, supplier replies, moderation/disputes and imported external reviews.

Operational boundary: this is a contract layer only. Do not create real YooKassa payments, fiscal receipts, payouts or supplier balances from these tables until the state machines, sandbox checkout and support process are implemented.

## Phase 2.0b event management and buyer account contracts

The next additive migration extends supplier/event operations and buyer purchase history:

```text
prisma/migrations/20260710110000_phase2_event_management_buyer_account/migration.sql
```

It adds:

- `EventManagementMode` for source-managed imports, Daibilet-managed supplier events, supplier drafts and future self-service;
- direct optional `Event.supplierId`, `Event.purchaseFlow`, moderation fields and schedule/open-date metadata;
- `EventChangeRequest` for supplier drafts and admin review;
- `EventChangeLog` for audit trail when admin acts on behalf of a supplier;
- supplier event edit permissions (`canEditContent`, `canEditSchedule`, `canEditOffers`, etc.);
- slot and ticket category fields for future schedule/offer operations;
- buyer account links from `ExternalOrder` to `SiteUser`.

Operational boundary: this does not make supplier self-service live. Imported TC/Teplohod schedules stay read-only. The public buyer UX remains "Мои покупки" and must hide technical source ids.

## Phase 2.1 backend guards

The schema contracts are now backed by pure TypeScript domain guards before HTTP/API wiring:

- `apps/backend/src/event-change-request-state.ts` controls allowed status transitions, actor gates, supplier permissions and source-managed read-only rules.
- `apps/backend/src/event-change-request-payload.ts` validates `EventChangeRequest.payload` per request type.
- Draft validation is intentionally softer than apply validation; DB writes must use apply mode.
- Schedule and offer changes are not allowed through generic `UPDATE`; they use `SCHEDULE_UPDATE` and `OFFER_UPDATE`.
- `OFFER_UPDATE` requires explicit operation semantics (`UPSERT_LIST` or `REPLACE_ALL`).
- Existing-event apply payloads require `baseSnapshot.eventUpdatedAt`.
- Server-owned create fields (`supplierId`, `purchaseFlow`, `managementMode`) must be derived by API/applier context, not accepted from supplier JSON.
- Recurring schedule apply requires generated sessions until a dedicated recurrence expansion service exists.

The first transactional applier is also present:

- `apps/backend/src/event-change-request-applier.ts` applies approved existing-event requests in one Prisma transaction.
- It writes `EventOverride`, `Event`, `EventSession`, `EventOffer`, `EventChangeRequest` and `EventChangeLog` as needed.
- `apps/backend/src/admin-event-change-requests.dto.ts` exposes a safe admin list DTO with filters, facets, available actions and `payloadKeys`.
- `apps/backend/src/event-change-request-review.ts` handles approve/reject review transitions and audit logging.
- `GET /api/admin/event-change-requests` lists requests for admin moderation.
- `POST /api/admin/event-change-requests/:id/approve`, `/reject` and `/apply` expose admin review/apply actions through the typed backend entrypoint.
- `apps/admin/src/pages/EventChangeRequestsPage.tsx` provides the first operator UI for the request queue.

These guards and the applier do not apply migrations or enable supplier self-service by themselves. They are the safety layer for the next admin/supplier moderation screens.
