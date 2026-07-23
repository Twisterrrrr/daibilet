# F4.4 — Remaining legacy → soft-retire Vite `/legacy`

**Статус:** ✅ soft-retire path (Vite **не** удалён). Full retire = **нет** пока gaps без замены.

## Ported in F4.4 (Next)

| Route | Scope |
|-------|--------|
| `/admin/orders` | list + filters + Sync TC + bulk archive |
| `/admin/orders/[id]` | detail read + archive; tickets table |
| `/admin/venues` | list |
| `/admin/venues/[id]` | SEO / kind / pageStatus save |
| `/admin/cities` | list |
| `/admin/cities/[id]` | title/slug/SEO/intro save |

Plus earlier F4.1–F4.3: dashboard, events override, landings SEO/matches, articles, sources, settings.

## Remaining `/legacy` (full retire checklist)

- [ ] Events taxonomy / schedule / sales / source diagnostics
- [ ] Landings candidates search + content blocks editor
- [ ] Orders ticket link / manual ticket upsert / unarchive / delete
- [ ] Buyers list
- [ ] ECR / Mapping inbox / Reviews admin
- [ ] Any rare geo/advanced venue tools only in Vite

## Soft-retire policy

- nginx keeps `/legacy/` static; comment marks **deprecated**.
- Nav daily path is Next; Vite links only for gaps.
- **Do not** delete `apps/admin` or stop building Vite until checklist empty.
- Finance / checkout untouched.

## Vite retire possible yet?

**No.** Ticket linking, taxonomy, landing candidates and ECR still operator-needed without Next replacement.

## Next

Optional F4.5: port ticket-link + taxonomy **or** freeze Vite and accept legacy for rare ops until F5.
