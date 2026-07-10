#!/usr/bin/env bash
# F3 prod deploy: feat/next-monorepo → Next apps/web :3001 + legacy API :4000
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/daibilet}"
ADMIN_DIR="${ADMIN_DIR:-/var/www/daibilet/admin}"
API_SERVICE="${API_SERVICE:-daibilet-api}"
WEB_SERVICE="${WEB_SERVICE:-daibilet-web}"
BRANCH="${BRANCH:-feat/next-monorepo}"
WEB_PORT="${DAIBILET_WEB_PORT:-3001}"

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
grep -q "^DAIBILET_WEB_PORT=" .env 2>/dev/null || echo "DAIBILET_WEB_PORT=$WEB_PORT" >> .env
grep -q "^NEXT_PUBLIC_TEP_WIDGET_ID=" .env 2>/dev/null || echo "NEXT_PUBLIC_TEP_WIDGET_ID=${TEP_WIDGET_ID:-14208}" >> .env
if ! grep -q "^NEXT_PUBLIC_TC_WIDGET_TOKEN=" .env 2>/dev/null; then
  echo "NEXT_PUBLIC_TC_WIDGET_TOKEN=${TICKETSCLOUD_WIDGET_TOKEN:-}" >> .env
fi

pnpm db:generate
pnpm db:deploy

BUILD_NODE_ENV="${BUILD_NODE_ENV:-development}"
(
  export NODE_ENV="$BUILD_NODE_ENV"
  pnpm --filter @tours/admin build
)
mkdir -p "$ADMIN_DIR"
rsync -a --delete apps/admin/dist/ "$ADMIN_DIR/"

pnpm web:build

if systemctl is-active --quiet "$API_SERVICE"; then
  systemctl restart "$API_SERVICE"
fi

if systemctl is-enabled --quiet "$WEB_SERVICE" 2>/dev/null; then
  systemctl restart "$WEB_SERVICE"
else
  echo "Warning: enable $WEB_SERVICE after first install"
fi

sleep 4
curl -fsS "http://127.0.0.1:${WEB_PORT}/api/health" >/dev/null && echo "Next /api/health OK on :$WEB_PORT"

echo "F3 prod deploy complete → ${PUBLIC_SITE_URL:-https://daibilet.ru} (branch: $BRANCH, Next :$WEB_PORT)"
