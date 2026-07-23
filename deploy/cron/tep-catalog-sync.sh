#!/usr/bin/env bash
# Out-of-process Teplohod catalog sync (isolates CPU/RAM from daibilet-api).
# Cron example (12h): 20 */12 * * * APP_DIR=/opt/daibilet /opt/daibilet/deploy/cron/tep-catalog-sync.sh >> /var/log/daibilet/tep-catalog-sync.log 2>&1
# Pair with TEP_AUTO_SYNC_ENABLED=0 on the API.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/daibilet}"
LOG_DIR="${LOG_DIR:-/var/log/daibilet}"
LOCK_FILE="${LOCK_FILE:-/tmp/daibilet-tep-catalog-sync.lock}"
NICE_N="${TEP_SYNC_NICE:-15}"

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
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) skip: previous tep catalog sync still running"
  exit 0
fi

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) start worker tep-catalog nice=${NICE_N}"
# F4.2: canonical entrypoint apps/worker (tep-import-fixtures + revalidate)
if command -v nice >/dev/null 2>&1 && [[ "$NICE_N" =~ ^[0-9]+$ ]] && (( NICE_N > 0 )); then
  nice -n "$NICE_N" node apps/worker/bin/run.mjs tep-catalog
else
  node apps/worker/bin/run.mjs tep-catalog
fi
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) done worker tep-catalog"
