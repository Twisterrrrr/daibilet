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

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) start review-requests"
node --import tsx scripts/send-review-requests.js "$@"
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) done review-requests"
