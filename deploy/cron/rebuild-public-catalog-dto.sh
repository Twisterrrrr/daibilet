#!/usr/bin/env bash
# Out-of-process public catalog DTO rebuild (INC.504.5c / Catalog Worker on shared disk).
# Isolates heavy SQL+map from daibilet-api. Pair with DAIBILET_CATALOG_REBUILD_MODE=off on the API.
#
# Cron example (every 8 min):
#   */8 * * * * APP_DIR=/opt/daibilet /opt/daibilet/deploy/cron/rebuild-public-catalog-dto.sh >> /var/log/daibilet/catalog-dto-rebuild.log 2>&1
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/daibilet}"
LOG_DIR="${LOG_DIR:-/var/log/daibilet}"
LOCK_FILE="${LOCK_FILE:-/var/lock/daibilet-catalog-dto-rebuild.lock}"
NICE_N="${CATALOG_DTO_REBUILD_NICE:-15}"
REASON="${1:-cron}"

cd "$APP_DIR"
mkdir -p "$LOG_DIR"

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

# Worker always builds inline in this process (never spawn another child).
export DAIBILET_CATALOG_REBUILD_MODE=inline
unset DAIBILET_WEB_PORT || true
unset NEXT_RUNTIME || true

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) skip: previous catalog dto rebuild still running"
  exit 0
fi

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) start catalog-dto-rebuild reason=${REASON} nice=${NICE_N}"
if command -v nice >/dev/null 2>&1 && [[ "$NICE_N" =~ ^[0-9]+$ ]] && (( NICE_N > 0 )); then
  nice -n "$NICE_N" timeout --kill-after=15s 180s node scripts/rebuild-public-catalog-dto-cache.mjs --reason="$REASON"
else
  timeout --kill-after=15s 180s node scripts/rebuild-public-catalog-dto-cache.mjs --reason="$REASON"
fi
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) done catalog-dto-rebuild reason=${REASON}"
