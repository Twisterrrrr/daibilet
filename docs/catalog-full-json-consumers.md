# Catalog full-JSON consumers (INC.504.26)

**Locked:** 2026-08-09  
**Disk artifact:** `/opt/daibilet/var/cache/public-catalog-dto.json` (~16MB, v2 = sessions + indexes)

## Owner hypothesis

«Любая страница сразу грузит весь JSON» — **частично верно**.

| Surface | Full sessions JSON on request? | Notes |
|---------|--------------------------------|-------|
| `/venues`, `/locations` list | **Нет** | Lean SQL hub + `counts=0` shell; counts via `/event-counts` |
| `/venues/[slug]`, `/locations/[slug]` PDP | **Было да → fixed** | Раньше `getPublicCatalogSessions()` + full scan; теперь index-scoped + soft 2.5s + SQL hero |
| City hub `/api/public/cities/*` | **Было да → mitigated** | Soft timeout + `destinationIndex` scoped |
| Destinations | Soft / stale-first | Не блокирует HTML list hubs |
| `/api/public/events` | Memory Soft-SWR | Response = page slice; cold promote parses disk once (stat-gated after) |
| `/events` HTML SSR | Default limit **50** | `?limit=100` только client/API; SSR не ждёт URL limit |
| my-day events fetch | Was 100 → **48** | Не нужен fat page для chips |
| Sitemap events chunk | Yes (batch job) | OK — не request path UI |
| Catalog Worker timer | Writes disk | Isolated process; API `REBUILD_MODE=off` |

## Already OK (INC.504.5c)

- Catalog Worker пишет disk v2 (sessions + indexes)
- API Soft-SWR + **stat-gate** (mtime unchanged → no re-parse)
- `DAIBILET_CATALOG_REBUILD_MODE=off` on MSK API
- Venues/locations catalog SSR already `counts: false` (shell)

## Still needs full sessions blob (in memory)

- `/api/public/events` filter/sort/facets (page slice out)
- Index hydration (byId map over sessions) — unavoidable until Redis/split files (504.5d)

## Ops guards (504.26)

- `deploy/cron/api-healthcheck.sh` — TTFB `/api/health` → SIGKILL+start
- `MemorySwapMax=512M` on `daibilet-api` — stop host-wide swap thrash
