#!/usr/bin/env bash
# Еженедельный дайджест новых событий → Article status=REVIEW (без auto-publish).
# Рекомендуемый cron (вс 07:00): см. deploy/cron/README.md
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/daibilet}"
LOG_DIR="${LOG_DIR:-/var/log/daibilet}"
LOCK_FILE="${LOCK_FILE:-/tmp/daibilet-blog-weekly-digest.lock}"

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
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) skip: previous blog-weekly-digest still running"
  exit 0
fi

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) start blog-weekly-digest"
node scripts/blog-weekly-digest.js
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) done blog-weekly-digest"
