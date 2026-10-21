# Event 404 ISR regression — 2026-10-21

## Production observation

After deploying production web build `a13b460d97e686267db5e14f04d037c666c8a5a1`, the deployment workflow's Googlebot smoke check received HTTP 500 for an event slug that was no longer in the catalog. The same response was reproducible on event PDP requests while that build was live. `/`, `/api/health`, and the static WebP derivative returned 200.

The server log identified the exception:

```text
Page changed from static to dynamic at runtime /events/[slug]
reason: revalidate: 0 fetch http://127.0.0.1:4000/api/public/events?limit=6
```

`apps/web/app/events/[slug]/not-found.tsx` rendered similar events using the default `cache: 'no-store'` helper inside a route that uses ISR. When `loadEventDto()` correctly classified an expired or deleted slug as a miss, that uncached fetch made Next.js change the static ISR response to dynamic and return 500 instead of the intended 404 page.

## Recovery and fix

- The deploy's atomic swap retained `apps/web/.next.prev`. The previous `.next` build was restored using the production incident runbook.
- After rollback: `/`, `/api/health`, and a live event PDP returned 200; web and API services were active.
- The static WebP files remain available from `/images/`; the page integration was rolled back with `.next`, so the image pilot is not currently active in rendered PDPs.
- The follow-up fix sets `revalidateSeconds: EVENT_PAGE_REVALIDATE` on the similar-events fetch. The 404 fallback now uses a cacheable API request that is compatible with the parent ISR route.
- Regression coverage verifies that this fallback no longer opts into `force-dynamic` or a bare no-store fetch.

## Release gate

Before the follow-up build is deployed, confirm the pipeline's production smoke test returns the intended non-500 result for an unknown/expired event slug. Then check an active event PDP, homepage, API health, and one Teplohod WebP PDP. Do not interpret this incident as an image-transform or WebP failure: the exception came from the event not-found fallback.

## Cline handoff

When adding data requests to `/events/[slug]` or its not-found boundary, use `next.revalidate` through `fetchPublicApiJson({ revalidateSeconds })` or a deliberate `unstable_cache`. A bare `cache: 'no-store'` request can turn an ISR-generated 404 into HTTP 500 at runtime.
