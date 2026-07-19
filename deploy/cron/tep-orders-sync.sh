#!/usr/bin/env bash
# Teplohod orders-only polling (не каталог tep:sync).
# Рекомендуемый cron: */15 * * * *
# Без TEP_ORDERS_TOKEN скрипт честно пишет status=BLOCKED и выходит 0 (не врёт SUCCESS).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/daibilet}"
LOG_DIR="${LOG_DIR:-/var/log/daibilet}"
LOCK_FILE="${LOCK_FILE:-/tmp/daibilet-tep-orders-sync.lock}"
LOOKBACK_DAYS="${TEP_ORDERS_LOOKBACK_DAYS:-3}"

cd "$APP_DIR"
mkdir -p "$LOG_DIR"

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

FROM_DATE="$(date -u -d "${LOOKBACK_DAYS} days ago" +%Y-%m-%d)"
TO_DATE="$(date -u -d "1 day" +%Y-%m-%d)"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) skip: previous tep-orders sync still running"
  exit 0
fi

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) start tep:orders from=${FROM_DATE} to=${TO_DATE}"
# Только заказы TEP. Каталог (tep:sync / tc:sync) сюда не входит. tc-orders не трогаем.
npm run tep:orders -- --from="$FROM_DATE" --to="$TO_DATE"
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) done tep:orders"
