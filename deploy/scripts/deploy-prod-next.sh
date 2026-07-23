#!/usr/bin/env bash
# F3 prod deploy: feat/next-monorepo -> Next apps/web :3001 + legacy API :4000
#
# Deploy discipline (CPU/RAM on 3.8Gi):
# - One controlled restart sequence only: stop web -> restart api -> start web.
# - Do NOT batch-restart unrelated units (staging, docker stacks, timers) in the same pass.
# - Avoid back-to-back deploys that re-trigger TEP startup sync; prefer TEP_AUTO_SYNC_ENABLED=0 + cron.
#
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/daibilet}"
ADMIN_DIR="${ADMIN_DIR:-/var/www/daibilet/admin}"
ADMIN_LEGACY_DIR="${ADMIN_LEGACY_DIR:-/var/www/daibilet/legacy}"
API_SERVICE="${API_SERVICE:-daibilet-api}"
WEB_SERVICE="${WEB_SERVICE:-daibilet-web}"
BRANCH="${BRANCH:-feat/next-monorepo}"
WEB_PORT="${DAIBILET_WEB_PORT:-3001}"
APPLY_ADMIN_NGINX_PATCH="${APPLY_ADMIN_NGINX_PATCH:-1}"

cd "$APP_DIR"

if [[ -f ".env" ]]; then
  sed -i 's/^ADMIN_AUTH_REALM=Daibilet admin/ADMIN_AUTH_REALM="Daibilet admin"/' .env 2>/dev/null || true
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

# Re-exec after pull so post-build steps (cache clear / revalidate) match the
# version on the branch — bash otherwise keeps running the pre-pull script body.
if [[ "${DAIBILET_DEPLOY_REEXEC:-}" != "1" ]]; then
  export DAIBILET_DEPLOY_REEXEC=1
  exec bash "$APP_DIR/deploy/scripts/deploy-prod-next.sh" "$@"
fi

corepack enable 2>/dev/null || true
corepack prepare pnpm@11.7.0 --activate 2>/dev/null || true

pnpm install --frozen-lockfile 2>/dev/null || pnpm install

export NEXT_PUBLIC_TC_WIDGET_TOKEN="${NEXT_PUBLIC_TC_WIDGET_TOKEN:-$TICKETSCLOUD_WIDGET_TOKEN}"
export NEXT_PUBLIC_TEP_WIDGET_ID="${NEXT_PUBLIC_TEP_WIDGET_ID:-$TEP_WIDGET_ID}"
grep -q "^DAIBILET_WEB_PORT=" .env 2>/dev/null || echo "DAIBILET_WEB_PORT=$WEB_PORT" >> .env
grep -q "^NEXT_PUBLIC_TEP_WIDGET_ID=" .env 2>/dev/null || echo "NEXT_PUBLIC_TEP_WIDGET_ID=${TEP_WIDGET_ID:-14208}" >> .env
if ! grep -q "^NEXT_PUBLIC_TC_WIDGET_TOKEN=" .env 2>/dev/null; then
  echo "NEXT_PUBLIC_TC_WIDGET_TOKEN=${TICKETSCLOUD_WIDGET_TOKEN:-}" >> .env
fi
# F4.1c: deep CRUD Vite under admin.daibilet.ru/legacy
if ! grep -q "^NEXT_PUBLIC_VITE_ADMIN_URL=" .env 2>/dev/null; then
  echo "NEXT_PUBLIC_VITE_ADMIN_URL=https://admin.daibilet.ru/legacy" >> .env
fi
if ! grep -q "^NEXT_PUBLIC_ADMIN_URL=" .env 2>/dev/null; then
  echo "NEXT_PUBLIC_ADMIN_URL=https://admin.daibilet.ru" >> .env
fi
# Keep DAIBILET_ADMIN_API_URL for server-side admin fetches (default 127.0.0.1:4000).
if ! grep -q "^DAIBILET_ADMIN_API_URL=" .env 2>/dev/null; then
  echo "DAIBILET_ADMIN_API_URL=http://127.0.0.1:4000" >> .env
fi

pnpm db:generate
pnpm db:deploy

BUILD_NODE_ENV="${BUILD_NODE_ENV:-development}"
(
  export NODE_ENV="$BUILD_NODE_ENV"
  # Vite admin as /legacy/ SPA for deep CRUD after Next cutover.
  VITE_ADMIN_BASE="/legacy/" \
  VITE_DAIBILET_API_URL="/api" \
  VITE_DAIBILET_PUBLIC_URL="${PUBLIC_SITE_URL:-https://daibilet.ru}" \
  pnpm --filter @tours/admin build
)
mkdir -p "$ADMIN_LEGACY_DIR"
rsync -a --delete apps/admin/dist/ "$ADMIN_LEGACY_DIR/"
# Keep previous static root as rollback mirror (optional).
mkdir -p "$ADMIN_DIR"
rsync -a --delete apps/admin/dist/ "$ADMIN_DIR/" || true

pnpm web:build

# Stop web before clearing Next cache so workers don't serve half-deleted artifacts.
if systemctl is-active --quiet "$WEB_SERVICE" 2>/dev/null; then
  systemctl stop "$WEB_SERVICE"
fi
rm -rf apps/web/.next/cache
echo "Cleared apps/web/.next/cache"

if systemctl is-active --quiet "$API_SERVICE"; then
  systemctl restart "$API_SERVICE"
fi

if systemctl is-enabled --quiet "$WEB_SERVICE" 2>/dev/null; then
  systemctl start "$WEB_SERVICE"
else
  echo "Warning: enable $WEB_SERVICE after first install"
fi

sleep 4
curl -fsS "http://127.0.0.1:${WEB_PORT}/api/health" >/dev/null && echo "Next /api/health OK on :$WEB_PORT"

# F4.1c nginx: admin.daibilet.ru → Next + /legacy Vite
if [[ "$APPLY_ADMIN_NGINX_PATCH" == "1" && -f "$APP_DIR/deploy/nginx/patch-prod-admin-next.py" ]]; then
  if python3 "$APP_DIR/deploy/nginx/patch-prod-admin-next.py"; then
    if nginx -t 2>/dev/null; then
      systemctl reload nginx && echo "nginx reloaded (admin Next cutover)"
    else
      echo "Warning: nginx -t failed after admin patch — not reloading"
    fi
  else
    echo "Warning: patch-prod-admin-next.py failed"
  fi
fi

# Admin smoke (Host rewrite + Basic Auth). Prefer ADMIN_PASSWORD; skip if missing.
ADMIN_SMOKE_USER="${ADMIN_EMAIL:-${ADMIN_USER:-}}"
ADMIN_SMOKE_PASS="${ADMIN_PASSWORD:-}"
if [[ -n "$ADMIN_SMOKE_USER" && -n "$ADMIN_SMOKE_PASS" ]]; then
  code="$(curl -sS -o /dev/null -w '%{http_code}' -u "${ADMIN_SMOKE_USER}:${ADMIN_SMOKE_PASS}" \
    -H "Host: admin.daibilet.ru" "http://127.0.0.1:${WEB_PORT}/" || true)"
  echo "Admin host rewrite smoke HTTP $code (expect 200)"
  code_legacy="$(curl -sS -o /dev/null -w '%{http_code}' -u "${ADMIN_SMOKE_USER}:${ADMIN_SMOKE_PASS}" \
    -H "Host: admin.daibilet.ru" "http://127.0.0.1:${WEB_PORT}/admin/events" || true)"
  echo "Admin /admin/events smoke HTTP $code_legacy (expect 200)"
else
  echo "Warning: ADMIN_EMAIL/PASSWORD missing — skip admin Basic Auth smoke"
fi

# Drop nginx HTML proxy cache so browsers don't get pre-deploy RSC/HTML pointing at deleted chunks.
if [[ -d /var/cache/nginx/daibilet ]]; then
  rm -rf /var/cache/nginx/daibilet/* || true
  echo "Cleared nginx proxy cache /var/cache/nginx/daibilet"
fi

# Bust ISR / unstable_cache after deploy (same tags/paths as backend revalidate-next-home).
REVALIDATE_SECRET="${DAIBILET_NEXT_REVALIDATE_SECRET:-}"
if [[ -z "$REVALIDATE_SECRET" && -f .env ]]; then
  REVALIDATE_SECRET="$(grep -E '^DAIBILET_NEXT_REVALIDATE_SECRET=' .env | cut -d= -f2- | sed 's/^["'\'']//;s/["'\'']$//' || true)"
fi
if [[ -n "$REVALIDATE_SECRET" ]]; then
  curl -fsS -X POST "http://127.0.0.1:${WEB_PORT}/api/internal/revalidate" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${REVALIDATE_SECRET}" \
    -d '{"tags":["home-page","catalog-page"],"paths":["/","/events","/cities/sankt-peterburg","/cities/moscow","/rechnye-progulki","/avtobusnye-ekskursii","/api/public/stats"]}' \
    && echo "Post-deploy revalidate OK" \
    || echo "Warning: post-deploy revalidate failed"
else
  echo "Warning: DAIBILET_NEXT_REVALIDATE_SECRET missing — skip revalidate"
fi

echo "F3 prod deploy complete → ${PUBLIC_SITE_URL:-https://daibilet.ru} (branch: $BRANCH, Next :$WEB_PORT)"