#!/usr/bin/env bash
# Ticketscloud orders-only polling (не каталог).
# Рекомендуемый cron: */10 * * * *
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/daibilet}"
LOG_DIR="${LOG_DIR:-/var/log/daibilet}"
LOCK_FILE="${LOCK_FILE:-/tmp/daibilet-tc-orders-sync.lock}"
# Окно lookback: свежие заказы + overlap, без полного history pull.
LOOKBACK_DAYS="${TC_ORDERS_LOOKBACK_DAYS:-3}"

cd "$APP_DIR"
mkdir -p "$LOG_DIR"

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

# TC API требует обе границы created_at=from,to (пустой to → HTTP 400).
FROM_DATE="$(date -u -d "${LOOKBACK_DAYS} days ago" +%Y-%m-%d)"
TO_DATE="$(date -u -d "1 day" +%Y-%m-%d)"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) skip: previous tc-orders sync still running"
  exit 0
fi

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) start worker tc-orders from=${FROM_DATE} to=${TO_DATE}"
# F4.2: только заказы TC через apps/worker. Каталог сюда не входит.
node apps/worker/bin/run.mjs tc-orders -- --from="$FROM_DATE" --to="$TO_DATE"
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) done worker tc-orders"
