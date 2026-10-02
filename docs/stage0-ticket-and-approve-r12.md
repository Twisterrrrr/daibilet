# Stage 0: issuance and legal approval (local implementation)

## S0.TKT.1 / S0.TKT.2

`CheckoutOrder.publicCode` identifies the order. An issued credential has a distinct
`TKT-{publicCode}-{ordinal}` number. `FulfillmentItem` remains the state of a
checkout line; `IssuedTicket` is a child row per quantity unit. A unique index on
`ticketNumber` supports a manual number lookup and future scan API. A second unique
index on `(fulfillmentItemId, ordinal)` prevents duplicate issuance when webhook
notifications are repeated. The existing `providerData.ticketNumbers` mirror is
kept for old consumers. QR and print can use the stable ticket number from the
issued rows; no name is embedded in it. External partner codes are unchanged.

For previously paid sandbox orders, inspect `FulfillmentItem.providerData` first.
Run `pnpm --filter @daibilet/backend checkout:tickets:backfill -- --public-code=CODE`
for a dry run, then repeat with `--apply`. The script handles one succeeded,
confirmed order at a time; it uses stored ticket numbers or the existing
`buildInternalTicketNumbers` function. Re-running it leaves matching rows intact.
This has not been run on `.159`.

## S0.SUP.3

The admin Suppliers page and legal approve/reject actions already existed. The
previous review history was inside mutable `SupplierLegalProfile.metaJson` and
could be overwritten. Each review now also appends a full legal/bank snapshot
and SHA-256 digest to `SupplierLegalReviewSnapshot` in the same transaction as
the status change. PostgreSQL rejects UPDATE and DELETE on that table. It has no
foreign key to mutable supplier/profile rows, so later profile deletion cannot
erase the evidence. Only admin paths write review records; public DTOs do not
select the table. The existing admin role is reused for this narrow action.
Production YooKassa admission checkout and public `canSell` now require
`SupplierLegalProfile.status=VERIFIED`; rejected or missing approval blocks
sale. Controlled nonproduction STUB tests retain their prior behavior.

Operator acceptance still requires deploying the migrations and checking the
admin route and supplier readiness on the finance host. No deployment is part
of this change.
