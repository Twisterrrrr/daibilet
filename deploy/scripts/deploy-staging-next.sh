#!/usr/bin/env bash
# F3 staging deploy: feat/next-monorepo → Next apps/web + legacy API
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/daibilet-staging}"
ADMIN_DIR="${ADMIN_DIR:-/var/www/daibilet/staging-admin}"
API_SERVICE="${API_SERVICE:-daibilet-api-staging}"
WEB_SERVICE="${WEB_SERVICE:-daibilet-web-staging}"
BRANCH="${BRANCH:-feat/next-monorepo}"

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

corepack enable 2>/dev/null || true
corepack prepare pnpm@11.7.0 --activate 2>/dev/null || true

pnpm install --frozen-lockfile 2>/dev/null || pnpm install

export NEXT_PUBLIC_TC_WIDGET_TOKEN="${NEXT_PUBLIC_TC_WIDGET_TOKEN:-$TICKETSCLOUD_WIDGET_TOKEN}"
export NEXT_PUBLIC_TEP_WIDGET_ID="${NEXT_PUBLIC_TEP_WIDGET_ID:-$TEP_WIDGET_ID}"

pnpm db:generate
pnpm db:deploy

# Legacy API (sync, admin backend, writes)
pnpm --filter @daibilet/backend build 2>/dev/null || true

# Admin Vite (until F4)
BUILD_NODE_ENV="${BUILD_NODE_ENV:-development}"
(
  export NODE_ENV="$BUILD_NODE_ENV"
  pnpm --filter @tours/admin build
)
mkdir -p "$ADMIN_DIR"
rsync -a --delete apps/admin/dist/ "$ADMIN_DIR/"

# Next public
pnpm web:build

if systemctl is-active --quiet "$API_SERVICE"; then
  systemctl restart "$API_SERVICE"
else
  echo "Warning: $API_SERVICE not active — start manually"
fi

if systemctl is-active --quiet "$WEB_SERVICE"; then
  systemctl restart "$WEB_SERVICE"
else
  echo "Warning: $WEB_SERVICE not active — install deploy/systemd/daibilet-web-staging.service"
fi

sleep 3
STAGING_PORT="${PORT:-4001}"
WEB_PORT="${DAIBILET_WEB_PORT:-3000}"

POST_DEPLOY_PUBLIC_BASE="${PUBLIC_SITE_URL:-https://staging.daibilet.ru}" \
POST_DEPLOY_INVARIANTS=1 \
PORT="$STAGING_PORT" \
bash scripts/post-deploy-check.sh || true

echo "Checking Next health on :$WEB_PORT..."
curl -fsS "http://127.0.0.1:${WEB_PORT}/api/health" >/dev/null && echo "Next /api/health OK"

WEB_BASE_URL="${PUBLIC_SITE_URL:-https://staging.daibilet.ru}" \
LEGACY_BASE_URL="http://127.0.0.1:${STAGING_PORT}" \
pnpm backend:next:parity 2>/dev/null || echo "Note: run backend:next:parity manually with DATABASE_URL"

echo "F3 staging deploy complete → ${PUBLIC_SITE_URL:-https://staging.daibilet.ru} (branch: $BRANCH, Next :$WEB_PORT, API :$STAGING_PORT)"
