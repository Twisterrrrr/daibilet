# Places PDP: supplier, admin, and finance boundaries

Status: backend/API flow verified on staging, 2026-11-11. Production was not changed.

## Supplier provisioning

- A supplier is provisioned by an authenticated administrator; there is no public supplier signup.
- New suppliers are created as `DRAFT`. Provisioning accepts only public contact fields and never accepts legal or bank credentials.
- An existing active `SiteUser` is assigned a supplier role. The account-to-supplier assignment and place links are recorded in `AdminAuditLog`.
- `SupplierVenue` links can be soft-disabled. Supplier accounts can be paused or archived without deleting their history.
- A supplier cannot write directly to `Venue` or `PdpDocument`. They submit `CREATE` or `UPDATE` requests; an editor reviews, applies, and can roll back the approved revision.
- Applying a `CREATE` request creates a `CANDIDATE` venue with `isIndexable=false`, and links it to the submitting supplier so it appears in that supplier's workspace.
- Applying an `UPDATE` preserves the existing PDP status. Rollback restores only fields that still match the applied revision and stops if a later edit would be overwritten.

## Admin/editor boundary

- Existing admin routes/pages handle PDP editing and supplier place-request review. Provisioning is available through authenticated `/api/admin/suppliers` routes.
- The new supplier provisioning endpoints are API-only; an admin supplier-management screen has not been built. This keeps the current API work separable from the UX prototype being tested in Cline.
- Readiness indicators are guidance. Creating or editing a PDP does not itself publish or index it; editor decisions for `pageStatus` and `isIndexable` remain explicit.

## Finance boundary

- Supplier/place admin list and supplier place workspace do not return bank accounts, payout credentials, tax/legal profile, ledger, or payment configuration.
- Place content approval is not a finance approval. It creates no admission product, checkout offer, order, ledger movement, or payout.
- Public ticket/admission purchase actions remain governed by the finance projection contract: only published products with `readiness.canSell === true` can expose a purchase CTA.
- Catalog must not read the finance database directly or accept ad-hoc finance writes. Use the documented API/projection contract when a place later receives sales.

## Staging verification

On staging, an ephemeral SiteUser and DRAFT supplier were provisioned through the HTTP APIs. The test submitted and applied a candidate, confirmed it appeared in the supplier workspace and remained non-indexable, submitted and applied an update, and rolled that update back. The test supplier membership and venue link were then disabled and the supplier archived. Audit history and the hidden, noindex candidate remain as staging test evidence. No production data or finance data was changed.
