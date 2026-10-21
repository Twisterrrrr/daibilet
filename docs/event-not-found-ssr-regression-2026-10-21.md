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
- The first rollback restored the old `.next`, while the versioned static WebP derivatives remained available under `/images/`.
- The follow-up fix sets `revalidateSeconds: EVENT_PAGE_REVALIDATE` on the similar-events fetch. The 404 fallback now uses a cacheable API request that is compatible with the parent ISR route.
- Regression coverage verifies that this fallback no longer opts into `force-dynamic` or a bare no-store fetch.
- Build `8baf2e686b5fecf3a77ad33afba5aac88a64b930` was deployed after the fix; the deploy workflow completed successfully, including Googlebot public smoke.
- Post-deploy: unknown event slug with Googlebot returned 404; homepage, API health, and all five Teplohod PDPs returned 200. Sample WebP derivatives returned 200 with `Content-Type: image/webp` and a 30-day cache header. Web and API services were active, with no web error-level journal entries during the 10-minute post-deploy check.

## Release gate

For future deploys, keep the pipeline smoke check for an unknown/expired event slug and verify an active event PDP, homepage, API health, and one Teplohod WebP PDP. Do not interpret this incident as an image-transform or WebP failure: the exception came from the event not-found fallback.

## Cline handoff

When adding data requests to `/events/[slug]` or its not-found boundary, use `next.revalidate` through `fetchPublicApiJson({ revalidateSeconds })` or a deliberate `unstable_cache`. A bare `cache: 'no-store'` request can turn an ISR-generated 404 into HTTP 500 at runtime.
