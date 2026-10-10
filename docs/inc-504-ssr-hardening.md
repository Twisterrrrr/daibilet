# INC.504 SSR hardening

Date: 2026-08-02

Branch: `codex/ssr-hang-hardening`

## Problem

The production symptom was not just a slow catalog response. The public Next.js process could stop returning HTML first byte while `api.daibilet.ru`, admin, and finance stayed reachable. Restart/healthcheck is the operational recovery, but the code-level root cause is that `apps/web` still executed heavy public DTO/database work inside the same process that renders HTML.

Before this change, multiple web SSR paths and public route handlers imported `@daibilet/backend/public-read` directly. That made the Next process own Prisma/DTO work for pages such as home, catalog, city hubs, event pages, venue pages, landings, and blog sidebars.

Soft timeouts reduce bad UX when an async operation is slow, but they do not save a blocked event loop. If synchronous DTO work, Prisma pressure, or cache stampede blocks the loop, the `Promise.race` timer does not tick and the request can still hang with 0B TTFB.

## Decision

Use a hybrid boundary for Phase 1:

- `apps/web` renders SSR/RSC and SEO HTML.
- `apps/backend` remains the public read/data composition service.
- Web SSR and web `/api/public/*` handlers call backend over HTTP with `AbortSignal.timeout`.
- Heavy Prisma/DTO work is removed from the HTML hot path in `apps/web`.

This keeps the migration small: no rewrite of catalog DTOs, no finance/catalog boundary changes, and no deployment coupling to the finance host.

## Implemented

- Added `apps/web/src/server/public-api-client.ts`.
  - Resolves backend base from `DAIBILET_PUBLIC_API_INTERNAL_URL`, `DAIBILET_API_INTERNAL_URL`, `DAIBILET_API_URL`, or `http://127.0.0.1:4000`.
  - Allows only `/api/public/*` and `/api/health`.
  - Uses `cache: 'no-store'` and hard abort timeouts.
- Added `apps/web/src/server/public-api-proxy.ts`.
  - Proxies Next public API handlers to backend with a bounded timeout.
  - Returns fast JSON `504` instead of letting a web route handler run DTO work.
- Switched public SSR cached helpers to HTTP reads:
  - home data
  - catalog data
  - city data
  - event data
  - venue data
  - landing data
  - blog article data
  - venue map tip data
- Switched public API handlers for articles, cities, destinations, event detail, landings, orders, search, stats, and venues to backend proxy.
- Bounded remaining homepage-only web reads:
  - hero banners fall back after 700 ms.
  - blog article promo falls back after 1200 ms.
- Left two known non-HTML-hot-path imports for later:
  - `apps/web/src/lib/sitemap-data.ts`
  - `apps/web/app/api/internal/revalidate/route.ts`

## Why this should reduce 504/hang risk

The web process now has a narrow job: render HTML and call bounded HTTP data endpoints. If backend DTO work is slow, the web request can time out or render a fail-soft shell. It should not spend the same event loop doing large DTO composition.

This does not replace ops controls:

- systemd healthcheck still needs to restart a hung process.
- warm jobs should stay off until measured safe.
- RSS, heap, TTFB, and journal errors should be watched during deploy.

## Smoke plan

Local or staging with backend running:

```powershell
$env:DAIBILET_PUBLIC_API_INTERNAL_URL="http://127.0.0.1:4000"
pnpm --filter @daibilet/web dev
curl.exe -sS -o NUL -w "home %{http_code} %{time_starttransfer} %{time_total}`n" http://127.0.0.1:3001/
curl.exe -sS -o NUL -w "events %{http_code} %{time_starttransfer} %{time_total}`n" http://127.0.0.1:3001/events
curl.exe -sS -o NUL -w "cities %{http_code} %{time_starttransfer} %{time_total}`n" http://127.0.0.1:3001/cities
curl.exe -sS -o NUL -w "api events %{http_code} %{time_starttransfer} %{time_total}`n" "http://127.0.0.1:3001/api/public/events?limit=50"
```

Parallel smoke:

```powershell
1..20 | ForEach-Object -Parallel {
  curl.exe -sS -o NUL -w "%{http_code} %{time_starttransfer} %{time_total}`n" http://127.0.0.1:3001/events
} -ThrottleLimit 8
```

Backend down/slow smoke:

```powershell
$env:DAIBILET_PUBLIC_API_INTERNAL_URL="http://127.0.0.1:4999"
pnpm --filter @daibilet/web dev
curl.exe --max-time 6 -sS -o NUL -w "events %{http_code} %{time_starttransfer} %{time_total}`n" http://127.0.0.1:3001/events
curl.exe --max-time 6 -sS -o NUL -w "api %{http_code} %{time_starttransfer} %{time_total}`n" "http://127.0.0.1:3001/api/public/events?limit=50"
```

Expected result: failure is fast and observable; no endless 0B TTFB.

Production read-only smoke after deploy:

```powershell
curl.exe --max-time 8 -sS -o NUL -w "home %{http_code} %{time_starttransfer} %{time_total}`n" https://daibilet.ru/
curl.exe --max-time 8 -sS -o NUL -w "events %{http_code} %{time_starttransfer} %{time_total}`n" https://daibilet.ru/events
curl.exe --max-time 8 -sS -o NUL -w "api events %{http_code} %{time_starttransfer} %{time_total}`n" "https://daibilet.ru/api/public/events?limit=50"
```

## Follow-ups

- Move sitemap generation off direct `public-read` or make it call backend with larger bounded timeout.
- Keep `/api/internal/revalidate` internal-only; if it starts running heavy DTO work, move it to backend/admin tooling.
- Add an HTTP load smoke script to CI/staging for `/`, `/events`, `/cities`, `/venues`, and `/api/public/events?limit=50`.
- After deploy, compare web RSS and TTFB with warm disabled and backend API timings enabled.
