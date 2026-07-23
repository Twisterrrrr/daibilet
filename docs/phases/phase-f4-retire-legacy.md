# F4.5 — Rare ops in Next (taxonomy / ticket-link / ECR / Reviews)

**Статус:** ✅ pragmatic rare ops ported. Vite **не** hard-retire.

## Ported in F4.5 (Next)

| Route | Scope |
|-------|--------|
| `/admin/events/[id]` | + taxonomy (category / subcategory / tags) |
| `/admin/orders/[id]` | + ticket upsert + event candidate search |
| `/admin/landings/[slug]` | + candidates search → pin/hide/auto |
| `/admin/reviews` | list + approve / reject / hide |
| `/admin/change-requests` | ECR list |
| `/admin/change-requests/[id]` | ECR detail + approve / reject / apply |

Auth: server actions via `adminApiFetch` (Basic Auth forward), same as F4.3–F4.4.

## Remaining `/legacy` (full retire checklist)

- [ ] Events schedule / sales / source diagnostics tabs
- [ ] Landings **content blocks** editor
- [ ] Orders unarchive / delete ticket
- [ ] Buyers list
- [ ] Mapping inbox / audit-log (если используется)
- [ ] Any rare geo/advanced venue tools only in Vite

## Soft-retire policy

- nginx keeps `/legacy/` static; **deprecated**.
- Nav daily + rare ops path is Next; Vite links only for gaps above.
- **Do not** delete `apps/admin` or stop building Vite until checklist empty.
- Finance / checkout untouched.

## Vite hard-retire possible yet?

**No.** Schedule/sales tabs, landing content blocks, buyers, order unarchive/delete still operator-needed without Next replacement.

## Next

Optional F4.6: port remaining gaps **or** freeze Vite and accept `/legacy` for schedule/blocks/buyers until F5.
