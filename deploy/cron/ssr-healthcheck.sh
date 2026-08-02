#!/usr/bin/env bash
# INC.504.20: SSR healthcheck (extracted from cron.d — cron treats bare % as newline).
# Detect curl fail OR TTFB>5s → SIGKILL+start daibilet-web + safe warm kill.
set -u
URL="${DAIBILET_SSR_HEALTH_URL:-http://127.0.0.1:3001/}"
TTFB_LIMIT="${DAIBILET_SSR_TTFB_LIMIT:-5}"
LOG="${DAIBILET_SSR_HEALTH_LOG:-/var/log/daibilet/ssr-health.log}"
mkdir -p "$(dirname "$LOG")" /var/lock

CODE=0
TTFB="$(curl -o /dev/null -s -w '%{time_starttransfer}' --max-time 5 "$URL")" || CODE=$?
BAD=0
if [ "$CODE" -ne 0 ]; then
  BAD=1
elif command -v bc >/dev/null && [ -n "$TTFB" ] && (( $(echo "$TTFB > $TTFB_LIMIT" | bc -l) )); then
  BAD=1
fi

if [ "$BAD" -ne 1 ]; then
  exit 0
fi

MSG="SSR hung (TTFB=${TTFB:-na} curl=${CODE}). Executing SIGKILL+start daibilet-web."
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ): $MSG" >>"$LOG"
logger -t daibilet-ssr-health "$MSG"

if [ "${DAIBILET_SSR_HEALTH_DRY_RUN:-0}" = "1" ]; then
  echo "DRY_RUN=1: would SIGKILL+start (skipped)"
  exit 0
fi

# Prefer hard kill: systemctl restart can hang on stuck next-server (TimeoutStopSec).
systemctl kill -s SIGKILL daibilet-web 2>/dev/null || true
sleep 1
systemctl reset-failed daibilet-web 2>/dev/null || true
systemctl start daibilet-web 2>/dev/null || systemctl restart daibilet-web 2>/dev/null || true
# Bracket trick — never bare warm-hub-pages (matches ssh cmdline).
pkill -f '[w]arm-hub-pages' || true
exit 0
