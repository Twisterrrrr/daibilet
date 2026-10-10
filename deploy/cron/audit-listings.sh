#!/usr/bin/env bash
# SEO.20: daily garbage audit of saleable public listings → Telegram.
# Рекомендуемый cron: ежедневно 04:00 — см. deploy/cron/README.md
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/daibilet}"
LOG_DIR="${LOG_DIR:-/var/log/daibilet}"
LOCK_FILE="${LOCK_FILE:-/tmp/daibilet-audit-listings.lock}"

cd "$APP_DIR"
mkdir -p "$LOG_DIR"

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) skip: previous audit-listings still running"
  exit 0
fi

TSX_LOADER="${TSX_LOADER:-$(readlink -f "$APP_DIR/apps/backend/node_modules/tsx/dist/loader.mjs")}"

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) start audit-listings"
node --import "$TSX_LOADER" scripts/audit-listings.js "$@"
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) done audit-listings"
