#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/daibilet}"
PUBLIC_DIR="${PUBLIC_DIR:-/var/www/daibilet/public}"
ADMIN_DIR="${ADMIN_DIR:-/var/www/daibilet/admin}"
SERVICE_NAME="${SERVICE_NAME:-daibilet-api}"

cd "$APP_DIR"

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

git fetch origin main
git checkout main
git pull --ff-only origin main

if ! command -v pnpm >/dev/null 2>&1; then
  corepack enable
  corepack prepare pnpm@11.7.0 --activate
fi

pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:deploy
pnpm typecheck
pnpm test
pnpm test:integration
pnpm --filter @daibilet/backend build

PUBLIC_API_URL="${PUBLIC_API_URL:-https://api.daibilet.ru}"
PUBLIC_SITE_URL="${PUBLIC_SITE_URL:-https://daibilet.ru}"
ADMIN_API_URL="${ADMIN_API_URL:-/api}"
TEP_WIDGET_ID="${TEP_WIDGET_ID:-14208}"

VITE_DAIBILET_API_URL="$PUBLIC_API_URL" \
VITE_TEP_WIDGET_ID="$TEP_WIDGET_ID" \
pnpm --filter @daibilet/public build

VITE_DAIBILET_API_URL="$ADMIN_API_URL" \
VITE_DAIBILET_PUBLIC_URL="$PUBLIC_SITE_URL" \
pnpm --filter @daibilet/admin build

mkdir -p "$PUBLIC_DIR" "$ADMIN_DIR"
rsync -a --delete apps/public/dist/ "$PUBLIC_DIR/"
rsync -a --delete apps/admin/dist/ "$ADMIN_DIR/"

systemctl restart "$SERVICE_NAME"
systemctl reload nginx

curl -fsS http://127.0.0.1:4000/api/health >/dev/null
echo "Daibilet deploy complete"
