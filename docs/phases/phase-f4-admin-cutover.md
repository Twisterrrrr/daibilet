# F4.1c — admin.daibilet.ru → Next cutover

**Статус:** implemented in repo (nginx patch + middleware + deploy). Prod apply via `deploy-prod-next.sh`.

## Схема (вариант B)

```
admin.daibilet.ru
  ├─ nginx auth_basic (htpasswd)
  ├─ /api/*          → legacy API :4000  (Authorization forwarded)
  ├─ /legacy/*       → Vite SPA static (/var/www/daibilet/legacy, base=/legacy/)
  └─ /*              → Next :3001 (Host: admin.daibilet.ru)
                         middleware Basic Auth (ADMIN_*)
                         rewrite / → /admin, /events → /admin/events, …
```

`daibilet.ru/admin` остаётся доступен на public host (тот же Next `/admin`).

## Gaps (ещё на Vite `/legacy`)

- Events: override / moderation / taxonomy sheet
- Landings: pin/exclude matches, SEO blocks editor
- Orders / Buyers / Venues / Cities full CRUD (Next lists могут появиться позже)
- ECR page (flag)

Ported on Next: Dashboard, Events list, Landings list+sample, Articles CRUD, Sources+sync, Settings read-only.

## Auth

- Nginx htpasswd и `ADMIN_EMAIL`/`ADMIN_PASSWORD` (или SHA256) должны совпадать - браузер шлёт один Basic Auth на UI и API.
- Next middleware проверяет ADMIN_* даже за nginx.

## Deploy

1. `deploy/scripts/deploy-prod-next.sh` (sets `NEXT_PUBLIC_VITE_ADMIN_URL=…/legacy`, builds Vite with `VITE_ADMIN_BASE=/legacy/`)
2. `APPLY_ADMIN_NGINX_PATCH=1` → `deploy/nginx/patch-prod-admin-next.py` + `nginx -t` + reload
3. Smoke: `scripts/smoke-admin-next-cutover.sh` или curl с `Host: admin.daibilet.ru`

Rollback: restore previous admin server block to `root /var/www/daibilet/admin` (копия dist ещё синхронится в `ADMIN_DIR`).

## Env

```
NEXT_PUBLIC_ADMIN_URL=https://admin.daibilet.ru
NEXT_PUBLIC_VITE_ADMIN_URL=https://admin.daibilet.ru/legacy
DAIBILET_ADMIN_API_URL=http://127.0.0.1:4000
ADMIN_EMAIL=…
ADMIN_PASSWORD=…   # must match htpasswd
```
