#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/daibilet}"
ADMIN_DIR="${ADMIN_DIR:-/var/www/daibilet/admin}"
API_SERVICE_NAME="${API_SERVICE_NAME:-${SERVICE_NAME:-daibilet-api}}"
PUBLIC_SERVICE_NAME="${PUBLIC_SERVICE_NAME:-daibilet-public}"
PUBLIC_APP_FILTER="${PUBLIC_APP_FILTER:-@daibilet/public}"
PUBLIC_STATS_PATH="${PUBLIC_STATS_PATH:-/api/public/stats}"
GIT_BRANCH="${GIT_BRANCH:-main}"

cd "$APP_DIR"

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

git fetch origin "$GIT_BRANCH"
git checkout "$GIT_BRANCH"
git pull --ff-only origin "$GIT_BRANCH"

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

PUBLIC_SITE_URL="${PUBLIC_SITE_URL:-${NEXT_PUBLIC_SITE_URL:-${DAIBILET_SITE_URL:-https://daibilet.ru}}}"
ADMIN_API_URL="${ADMIN_API_URL:-/api}"
TEP_WIDGET_ID="${TEP_WIDGET_ID:-14208}"

NEXT_PUBLIC_DAIBILET_API_URL="${NEXT_PUBLIC_DAIBILET_API_URL:-}" \
NEXT_PUBLIC_SITE_URL="$PUBLIC_SITE_URL" \
NEXT_PUBLIC_TEP_WIDGET_ID="$TEP_WIDGET_ID" \
NEXT_PUBLIC_TC_WIDGET_TOKEN="${NEXT_PUBLIC_TC_WIDGET_TOKEN:-${TICKETSCLOUD_WIDGET_TOKEN:-${TC_WIDGET_TOKEN:-}}}" \
pnpm --filter "$PUBLIC_APP_FILTER" build

VITE_DAIBILET_API_URL="$ADMIN_API_URL" \
VITE_DAIBILET_PUBLIC_URL="$PUBLIC_SITE_URL" \
pnpm --filter @daibilet/admin build

mkdir -p "$ADMIN_DIR"
rsync -a --delete apps/admin/dist/ "$ADMIN_DIR/"

systemctl restart "$API_SERVICE_NAME"
systemctl restart "$PUBLIC_SERVICE_NAME"
systemctl reload nginx

API_PORT="${PORT:-4000}"
PUBLIC_PORT="${PUBLIC_PORT:-3000}"

wait_for_url() {
  local url="$1"
  local attempts="${2:-30}"
  local delay="${3:-2}"
  for ((i = 1; i <= attempts; i += 1)); do
    if curl -fsS "$url" >/dev/null; then
      return 0
    fi
    sleep "$delay"
  done
  echo "Timed out waiting for $url" >&2
  return 1
}

wait_for_url "http://127.0.0.1:${API_PORT}/api/health"
wait_for_url "http://127.0.0.1:${PUBLIC_PORT}${PUBLIC_STATS_PATH}"
echo "Daibilet deploy complete"
