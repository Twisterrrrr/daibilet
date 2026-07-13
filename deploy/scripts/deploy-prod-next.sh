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

pnpm db:generate
pnpm db:deploy

BUILD_NODE_ENV="${BUILD_NODE_ENV:-development}"
(
  export NODE_ENV="$BUILD_NODE_ENV"
  VITE_DAIBILET_API_URL="${VITE_DAIBILET_API_URL:-}" \
  VITE_DAIBILET_PUBLIC_URL="${PUBLIC_SITE_URL:-https://daibilet.ru}" \
  pnpm --filter @tours/admin build
)
mkdir -p "$ADMIN_DIR"
rsync -a --delete apps/admin/dist/ "$ADMIN_DIR/"

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