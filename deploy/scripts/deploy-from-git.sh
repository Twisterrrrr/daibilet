#!/usr/bin/env bash
# LEGACY: deploys Vite apps/public — do NOT use for Next cutover. Use deploy-prod-next.sh instead.
set -euo pipefail

echo "WARNING: deploy-from-git.sh is legacy (Vite public). For production Next use deploy/scripts/deploy-prod-next.sh" >&2

APP_DIR="${APP_DIR:-/opt/daibilet}"
PUBLIC_DIR="${PUBLIC_DIR:-/var/www/daibilet/public}"
ADMIN_DIR="${ADMIN_DIR:-/var/www/daibilet/admin}"
SERVICE_NAME="${SERVICE_NAME:-daibilet-api}"
BRANCH="${BRANCH:-integrate/mvp-launch}"

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

npm install
npm --prefix packages/db ci
npm --prefix apps/backend ci

npm run db:generate
npm run db:deploy

PUBLIC_API_URL="${PUBLIC_API_URL:-https://daibilet.ru}"
PUBLIC_SITE_URL="${PUBLIC_SITE_URL:-https://daibilet.ru}"
ADMIN_API_URL="${ADMIN_API_URL:-/api}"
TEP_WIDGET_ID="${TEP_WIDGET_ID:-14208}"
BUILD_NODE_ENV="${BUILD_NODE_ENV:-development}"

(
  export NODE_ENV="$BUILD_NODE_ENV"
  cd apps/public && npm ci
  VITE_DAIBILET_API_URL="$PUBLIC_API_URL" \
  VITE_TEP_WIDGET_ID="$TEP_WIDGET_ID" \
  npm run build
)
(
  export NODE_ENV="$BUILD_NODE_ENV"
  cd apps/admin && npm ci
  VITE_DAIBILET_API_URL="$ADMIN_API_URL" \
  VITE_DAIBILET_PUBLIC_URL="$PUBLIC_SITE_URL" \
  npm run build
)

mkdir -p "$PUBLIC_DIR" "$ADMIN_DIR"
rsync -a --delete apps/public/dist/ "$PUBLIC_DIR/"
rsync -a --delete apps/admin/dist/ "$ADMIN_DIR/"

systemctl restart "$SERVICE_NAME"
systemctl reload nginx

sleep 2
POST_DEPLOY_PUBLIC_BASE="${PUBLIC_SITE_URL:-https://daibilet.ru}" \
POST_DEPLOY_INVARIANTS=1 \
PORT=4000 \
bash scripts/post-deploy-check.sh

echo "Daibilet deploy complete"
