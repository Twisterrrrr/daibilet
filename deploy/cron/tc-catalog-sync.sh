#!/usr/bin/env bash
# Out-of-process Ticketscloud catalog sync (isolates CPU/RAM from daibilet-api).
# Prefer nightly systemd timer (daibilet-tc-catalog-sync.timer).
# Cron example (nightly 03:20): 20 3 * * * APP_DIR=/opt/daibilet /opt/daibilet/deploy/cron/tc-catalog-sync.sh >> /var/log/daibilet/tc-catalog-sync.log 2>&1
# Do not run daytime full sync on 3.8Gi hosts — use npm run tc:sync -- --ids=... for on-demand.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/daibilet}"
LOG_DIR="${LOG_DIR:-/var/log/daibilet}"
LOCK_FILE="${LOCK_FILE:-/tmp/daibilet-tc-catalog-sync.lock}"
NICE_N="${TC_SYNC_NICE:-15}"
# Nightly full catalog: light Next revalidate + light API warm by default.
# Set TC_CATALOG_SYNC_FULL_WARM=1 for full public warm (venues/cities/landings/admin).
export TC_CATALOG_SYNC_FULL_WARM="${TC_CATALOG_SYNC_FULL_WARM:-0}"

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
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) skip: previous tc catalog sync still running"
  exit 0
fi

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) start worker tc-catalog nice=${NICE_N} full_warm=${TC_CATALOG_SYNC_FULL_WARM}"

# F4.2: canonical entrypoint apps/worker (same scripts/tc-sync.js as npm run tc:sync)
cmd=(node apps/worker/bin/run.mjs tc-catalog)
if command -v nice >/dev/null 2>&1 && [[ "$NICE_N" =~ ^[0-9]+$ ]] && (( NICE_N > 0 )); then
  cmd=(nice -n "$NICE_N" "${cmd[@]}")
fi
if command -v ionice >/dev/null 2>&1; then
  cmd=(ionice -c2 -n7 "${cmd[@]}")
fi

"${cmd[@]}"
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) done worker tc-catalog"
