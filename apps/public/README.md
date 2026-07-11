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

By default the browser calls same-origin `/api/*`. Prisma-backed public handlers are served by Next directly; the catch-all API route still proxies legacy/admin/sync paths to the backend at `http://127.0.0.1:4000`.

Useful env vars:

```text
DAIBILET_BACKEND_API_URL=http://127.0.0.1:4000
DAIBILET_SITE_URL=http://127.0.0.1:5178
NEXT_PUBLIC_DAIBILET_API_URL=
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:5178
NEXT_PUBLIC_TC_WIDGET_TOKEN=
NEXT_PUBLIC_TEP_WIDGET_ID=14208
```

`NEXT_PUBLIC_DAIBILET_API_URL` should normally stay empty for the full-stack setup, so public pages use same-origin `/api`.

## Production Preview

Production runs public as a Next server, not as a copied Vite/static `dist`:

```bash
PUBLIC_PORT=3000 pnpm --filter @daibilet/public preview
```

On the server this is managed by `deploy/systemd/daibilet-public.service`. Nginx should proxy `daibilet.ru` to this service, while `admin.daibilet.ru` remains a static admin build with backend API proxying.

## Checks

```bash
pnpm --filter @daibilet/public typecheck
pnpm public:build
```

## Migration Note

The app is now on Next App Router. The main public read routes are already Prisma-backed Next handlers:

1. `/api/public/stats`
2. `/api/public/home/preview`
3. `/api/public/events`
4. `/api/public/events/:slug`
5. city, venue and landing page DTOs

The catch-all bridge remains for routes that intentionally still live in the backend, especially admin, source sync and older integration endpoints.
