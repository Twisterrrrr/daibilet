#!/usr/bin/env bash
# Follow-up emails: просьба оставить отзыв после сессии (ExternalOrder + email).
# Рекомендуемый cron: ежедневно 10:00 — см. deploy/cron/README.md
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/daibilet}"
LOG_DIR="${LOG_DIR:-/var/log/daibilet}"
LOCK_FILE="${LOCK_FILE:-/tmp/daibilet-review-requests.lock}"

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
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) skip: previous review-requests still running"
  exit 0
fi

# tsx lives under apps/backend; invoke the binary (node --import tsx fails from repo root)
TSX_BIN="${TSX_BIN:-$APP_DIR/apps/backend/node_modules/.bin/tsx}"
if [[ ! -x "$TSX_BIN" ]]; then
  echo "tsx not found at $TSX_BIN" >&2
  exit 1
fi

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) start review-requests"
"$TSX_BIN" scripts/send-review-requests.js "$@"
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) done review-requests"
