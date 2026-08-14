#!/usr/bin/env bash
# Morning post-check for nightly TC catalog sync (SYNC.4).
# Run after 03:20 UTC, e.g. cron: 35 3 * * * APP_DIR=/opt/daibilet /opt/daibilet/deploy/scripts/verify-tc-catalog-sync.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/daibilet}"
LOG_FILE="${LOG_FILE:-/var/log/daibilet/tc-catalog-sync.log}"
TODAY_UTC="$(date -u +%Y-%m-%d)"

cd "$APP_DIR"

echo "== verify tc-catalog sync (${TODAY_UTC} UTC) =="

if [[ ! -f "$LOG_FILE" ]]; then
  echo "FAIL: log missing: $LOG_FILE" >&2
  exit 1
fi

if ! systemctl is-active --quiet daibilet-tc-catalog-sync.timer 2>/dev/null; then
  echo "WARN: daibilet-tc-catalog-sync.timer not active" >&2
else
  systemctl list-timers daibilet-tc-catalog-sync.timer --no-pager | sed -n '1,3p'
fi

# Slice from last start marker for today (full run, not a short tail window).
RUN_SLICE="$(awk -v day="$TODAY_UTC" '
  index($0, day) && /start worker tc-catalog/ { buf = ""; found = 1 }
  found { buf = buf $0 ORS }
  END { printf "%s", buf }
' "$LOG_FILE")"

if [[ -z "$RUN_SLICE" ]]; then
  echo "FAIL: no start marker for ${TODAY_UTC} - nightly run may not have started yet" >&2
  exit 1
fi

if ! grep -qE '"importedEvents"[[:space:]]*:[[:space:]]*[1-9][0-9]*' <<<"$RUN_SLICE"; then
  echo "FAIL: importedEvents missing or zero in today's run slice" >&2
  exit 1
fi

IMPORTED="$(grep -oE '"importedEvents"[[:space:]]*:[[:space:]]*[0-9]+' <<<"$RUN_SLICE" | tail -1 | grep -oE '[0-9]+$' || true)"
EXIT_LINE="$(grep -E '"event":"worker\.job\.done".*"job":"tc-catalog"' <<<"$RUN_SLICE" | tail -1 || true)"

if [[ -z "$EXIT_LINE" ]] || ! grep -qE '"exitCode"[[:space:]]*:[[:space:]]*0' <<<"$EXIT_LINE"; then
  echo "FAIL: latest worker.job.done missing or exitCode!=0" >&2
  echo "$EXIT_LINE" >&2
  exit 1
fi

echo "OK: importedEvents=${IMPORTED:-?}; worker exitCode=0"
echo "Hint: journalctl -u daibilet-tc-catalog-sync.service --since '${TODAY_UTC} 03:15' --no-pager | tail -30"
