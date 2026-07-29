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

# Capture this run only - post-import covers/warm/revalidate can push
# importedEvents far above any fixed tail window on the shared log.
RUN_LOG="${LOG_DIR}/tc-catalog-sync.run.$$.log"
cleanup_run_log() { rm -f "$RUN_LOG"; }
trap cleanup_run_log EXIT

set +e
"${cmd[@]}" >"$RUN_LOG" 2>&1
SYNC_EXIT=$?
set -e
# Mirror to stdout so systemd/cron StandardOutput append still gets full output.
cat "$RUN_LOG"
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) done worker tc-catalog exit=${SYNC_EXIT}"

if [[ "$SYNC_EXIT" -ne 0 ]]; then
  exit "$SYNC_EXIT"
fi

# Fail cron/timer when import count missing (fetch-only / masked OOM success).
if ! grep -qE '"importedEvents"[[:space:]]*:[[:space:]]*[1-9][0-9]*' "$RUN_LOG"; then
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) ALERT: tc-catalog finished exit=0 but importedEvents missing or zero in run log" >&2
  exit 1
fi

if ! grep -qE '"exitCode"[[:space:]]*:[[:space:]]*0' "$RUN_LOG"; then
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) ALERT: worker.job.done exitCode!=0 in run log" >&2
  exit 1
fi
