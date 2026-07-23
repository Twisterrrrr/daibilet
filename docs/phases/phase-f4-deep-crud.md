# F4.3 — Port Events override + Landings matches to Next

**Статус:** ✅ MVP (2 working screens). Full retire `/legacy` - ещё нет.

## Перенесено в Next

| Screen | Path | Actions |
|--------|------|---------|
| Event edit | `/admin/events/[id]` | Content override, SEO override, media imageUrl, moderation status |
| Landing edit | `/admin/landings/[slug]` | SEO/content PATCH, Pin / Hide / Auto matches |

Admin Sources/Articles/Dashboard без регрессии. Deep-links с list → Next (Vite только для gaps).

## Ещё на `/legacy`

- Events: taxonomy, schedule, sales, source diagnostics
- Landings: candidates search, content blocks editor
- Orders / Buyers / Venues / Cities CRUD
- ECR / Mapping inbox / Reviews

## API (без изменений контракта)

- `PATCH /api/admin/events/:id/override`
- `PATCH /api/admin/events/:id/moderation`
- `PATCH /api/admin/landings/:slug`
- `PATCH /api/admin/landings/:slug/matches/:eventId`

## Next step

**F4.4** (или продолжение F4.3b): Venues/Cities SEO CRUD **или** Orders list read-only → затем путь к retire Vite `/legacy` когда daily hot path 100% в Next.
