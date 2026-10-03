# F4.6 — Hard-retire Vite `/legacy`

**Статус:** ✅ Vite `/legacy` hard-retired for operator daily/rare ops. Code `apps/admin` may remain in monorepo but is **not** built/served on admin.

## Ported in F4.6 (Next)

| Route | Scope |
|-------|--------|
| `/admin/events/[id]` | + schedule / sales / source diagnostics |
| `/admin/landings/[slug]` | + content blocks preview (write API never existed in Vite either) |
| `/admin/buyers` | list + jump to orders by contact |
| `/admin/orders/[id]` | + unarchive + hard delete (ticket DELETE only with order) |

Plus F4.1–F4.5: dashboard, events override/taxonomy, landings SEO/matches/candidates, orders list/ticket-link, venues/cities, reviews, ECR, articles, sources, settings.

## Hard-retire actions

- nginx admin block: **no** `/legacy/` static locations (`patch-prod-admin-next.py`, `daibilet.conf.example`)
- deploy: **skip** Vite `@tours/admin` build/rsync to `/var/www/daibilet/legacy`
- Next middleware: `/legacy` → redirect `/admin`
- Nav: no Vite deep-links for ported screens

## Not operator-critical (documented)

- Mapping inbox / audit-log were already stubs (`Navigate to /`) in Vite - not ported, not blocking retire
- Landing **blocks write** API still absent (Vite had preview only) - future enhancement if needed
- Finance / checkout untouched

## Vite hard-retire possible yet?

**Yes** for served `/legacy` SPA. Monorepo may keep `apps/admin` source for reference until F5 cleanup.
