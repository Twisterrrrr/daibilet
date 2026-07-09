#!/usr/bin/env bash
# Staging deploy: /opt/daibilet-staging → staging.daibilet.ru
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/daibilet-staging}"
PUBLIC_DIR="${PUBLIC_DIR:-/var/www/daibilet/staging}"
ADMIN_DIR="${ADMIN_DIR:-/var/www/daibilet/staging-admin}"
SERVICE_NAME="${SERVICE_NAME:-daibilet-api-staging}"
BRANCH="${BRANCH:-integrate/mvp-launch}"

cd "$APP_DIR"

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only "origin/$BRANCH"

npm install
npm --prefix packages/db ci
npm --prefix apps/backend ci
npm --prefix apps/public ci
npm --prefix apps/admin ci

npm run db:generate
npm run db:migrate

PUBLIC_API_URL="${PUBLIC_API_URL:-https://api.daibilet.ru}"
PUBLIC_SITE_URL="${PUBLIC_SITE_URL:-https://staging.daibilet.ru}"
ADMIN_API_URL="${ADMIN_API_URL:-/api}"
TEP_WIDGET_ID="${TEP_WIDGET_ID:-14208}"

VITE_DAIBILET_API_URL="$PUBLIC_API_URL" \
VITE_TEP_WIDGET_ID="$TEP_WIDGET_ID" \
npm run public:build

VITE_DAIBILET_API_URL="$ADMIN_API_URL" \
VITE_DAIBILET_PUBLIC_URL="$PUBLIC_SITE_URL" \
npm run admin:build

mkdir -p "$PUBLIC_DIR" "$ADMIN_DIR"
rsync -a --delete apps/public/dist/ "$PUBLIC_DIR/"
rsync -a --delete apps/admin/dist/ "$ADMIN_DIR/"

if systemctl is-active --quiet "$SERVICE_NAME"; then
  systemctl restart "$SERVICE_NAME"
else
  echo "Warning: $SERVICE_NAME not active — start manually after first install"
fi

STAGING_PORT="${PORT:-4001}"
curl -fsS "http://127.0.0.1:${STAGING_PORT}/api/health" >/dev/null
echo "Staging deploy complete → $PUBLIC_SITE_URL (branch: $BRANCH)"
