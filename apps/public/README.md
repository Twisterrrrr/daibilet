# Public

Next.js public web app for Daibilet: home page, catalog, event pages, city pages, venue pages, landings, buyer account and order lookup.

## Local Run

```bash
pnpm install
pnpm dev:public
```

URL:

```text
http://127.0.0.1:5178
```

By default the browser calls same-origin `/api/*`. Next proxies these requests to the legacy backend at `http://127.0.0.1:4000`.

Useful env vars:

```text
DAIBILET_BACKEND_API_URL=http://127.0.0.1:4000
NEXT_PUBLIC_DAIBILET_API_URL=
NEXT_PUBLIC_TC_WIDGET_TOKEN=
NEXT_PUBLIC_TEP_WIDGET_ID=14208
```

`NEXT_PUBLIC_DAIBILET_API_URL` should normally stay empty for the full-stack setup, so public pages use same-origin `/api`.

## Checks

```bash
pnpm --filter @daibilet/public typecheck
pnpm public:build
```

## Migration Note

The app is now on Next App Router. The current `/api/*` route is a compatibility bridge to the existing backend. The next migration steps are to replace individual proxy paths with Prisma-backed route handlers, starting with public read models:

1. `/api/public/stats`
2. `/api/public/home/preview`
3. `/api/public/events`
4. `/api/public/events/:slug`
5. city, venue and landing page DTOs
