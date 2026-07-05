#!/usr/bin/env bash
# Pre-release public build → staging.daibilet.ru (отдельно от prod /var/www/daibilet/public).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/daibilet}"
STAGING_DIR="${STAGING_DIR:-/var/www/daibilet/staging}"
BRANCH="${BRANCH:-feat/lovable-landings}"

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
npm --prefix apps/public ci

PUBLIC_API_URL="${PUBLIC_API_URL:-https://api.daibilet.ru}"
TEP_WIDGET_ID="${TEP_WIDGET_ID:-14208}"

VITE_DAIBILET_API_URL="$PUBLIC_API_URL" \
VITE_TEP_WIDGET_ID="$TEP_WIDGET_ID" \
npm run public:build

mkdir -p "$STAGING_DIR"
rsync -a --delete apps/public/dist/ "$STAGING_DIR/"

echo "Staging public deployed to $STAGING_DIR → https://staging.daibilet.ru"
