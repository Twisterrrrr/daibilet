#!/usr/bin/env bash
# INC.504.26: API healthcheck — hung event-loop / swap-thrash recovery.
# Detect curl fail OR TTFB>5s on /api/health → SIGKILL+start daibilet-api.
# Mirrors ssr-healthcheck.sh; does not fight mid-deploy (optional lock).
set -u
URL="${DAIBILET_API_HEALTH_URL:-http://127.0.0.1:4000/api/health}"
TTFB_LIMIT="${DAIBILET_API_TTFB_LIMIT:-5}"
LOG="${DAIBILET_API_HEALTH_LOG:-/var/log/daibilet/api-health.log}"
API_SERVICE="${DAIBILET_API_SERVICE:-daibilet-api}"
DEPLOY_ACTIVE="${DAIBILET_API_DEPLOY_ACTIVE:-/var/lock/daibilet-api-deploy.active}"
DEPLOY_ACTIVE_MAX_AGE_SEC="${DAIBILET_API_DEPLOY_ACTIVE_MAX_AGE_SEC:-1800}"
COLD_START_GRACE_SEC="${DAIBILET_API_COLD_START_GRACE_SEC:-90}"
CURL_MAX_TIME="${DAIBILET_API_CURL_MAX_TIME:-12}"
mkdir -p "$(dirname "$LOG")" /var/lock

log_msg() {
  local msg="$1"
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ): $msg" >>"$LOG"
  logger -t daibilet-api-health "$msg" 2>/dev/null || true
}

if [[ -f "$DEPLOY_ACTIVE" ]]; then
  now_epoch="$(date +%s)"
  active_mtime="$(stat -c %Y "$DEPLOY_ACTIVE" 2>/dev/null || echo 0)"
  age=$((now_epoch - active_mtime))
  if [[ "$age" -ge 0 && "$age" -lt "$DEPLOY_ACTIVE_MAX_AGE_SEC" ]]; then
    log_msg "SKIP recover: deploy active (${age}s old, marker=$DEPLOY_ACTIVE)"
    exit 0
  fi
  rm -f "$DEPLOY_ACTIVE" 2>/dev/null || true
  log_msg "Removed stale deploy marker (age=${age}s)"
fi

CODE=0
TTFB="$(curl -o /dev/null -s -w '%{time_starttransfer}' --max-time "$CURL_MAX_TIME" "$URL")" || CODE=$?
BAD=0
if [ "$CODE" -ne 0 ]; then
  BAD=1
elif command -v bc >/dev/null && [ -n "$TTFB" ] && (( $(echo "$TTFB > $TTFB_LIMIT" | bc -l) )); then
  BAD=1
fi

if [ "$BAD" -ne 1 ]; then
  exit 0
fi

MAIN_PID="$(systemctl show -p MainPID --value "$API_SERVICE" 2>/dev/null || echo 0)"
MAIN_PID="$(echo "$MAIN_PID" | tr -d '[:space:]')"
if [[ "$MAIN_PID" =~ ^[1-9][0-9]*$ ]]; then
  ETIMES="$(ps -o etimes= -p "$MAIN_PID" 2>/dev/null | tr -d '[:space:]' || true)"
  if [[ "$ETIMES" =~ ^[0-9]+$ ]] && [[ "$ETIMES" -lt "$COLD_START_GRACE_SEC" ]]; then
    log_msg "SKIP recover: cold-start grace (pid=${MAIN_PID} age=${ETIMES}s < ${COLD_START_GRACE_SEC}s; TTFB=${TTFB:-na} curl=${CODE})"
    exit 0
  fi
fi

MSG="API hung (TTFB=${TTFB:-na} curl=${CODE}). Executing SIGKILL+start ${API_SERVICE}."
log_msg "$MSG"

if [ "${DAIBILET_API_HEALTH_DRY_RUN:-0}" = "1" ]; then
  echo "DRY_RUN=1: would SIGKILL+start (skipped)"
  exit 0
fi

systemctl kill -s SIGKILL "$API_SERVICE" 2>/dev/null || true
sleep 1
systemctl reset-failed "$API_SERVICE" 2>/dev/null || true
if [[ -f "$DEPLOY_ACTIVE" ]]; then
  log_msg "ABORT start: deploy active after SIGKILL"
  exit 0
fi
systemctl start "$API_SERVICE" 2>/dev/null || systemctl restart "$API_SERVICE" 2>/dev/null || true
exit 0
