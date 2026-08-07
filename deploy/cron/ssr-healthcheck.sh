#!/usr/bin/env bash
# INC.504.20 / INC.504.23: SSR healthcheck (extracted from cron.d — cron treats bare % as newline).
# Detect curl fail OR TTFB>5s → SIGKILL+start daibilet-web + safe warm kill.
#
# INC.504.23: never fight deploy / incomplete .next / cold start:
# - skip while /var/lock/daibilet-web-deploy.active is fresh
# - skip when prerender-manifest.json missing (mid-build)
# - skip SIGKILL when MainPID age < cold-start grace (avoids curl=28 kill loops)
set -u
URL="${DAIBILET_SSR_HEALTH_URL:-http://127.0.0.1:3001/}"
TTFB_LIMIT="${DAIBILET_SSR_TTFB_LIMIT:-5}"
LOG="${DAIBILET_SSR_HEALTH_LOG:-/var/log/daibilet/ssr-health.log}"
WEB_SERVICE="${DAIBILET_WEB_SERVICE:-daibilet-web}"
APP_DIR="${APP_DIR:-/opt/daibilet}"
DEPLOY_ACTIVE="${DAIBILET_WEB_DEPLOY_ACTIVE:-/var/lock/daibilet-web-deploy.active}"
DEPLOY_ACTIVE_MAX_AGE_SEC="${DAIBILET_WEB_DEPLOY_ACTIVE_MAX_AGE_SEC:-2700}"
COLD_START_GRACE_SEC="${DAIBILET_SSR_COLD_START_GRACE_SEC:-90}"
PRERENDER_MANIFEST="${APP_DIR}/apps/web/.next/prerender-manifest.json"
mkdir -p "$(dirname "$LOG")" /var/lock

log_msg() {
  local msg="$1"
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ): $msg" >>"$LOG"
  logger -t daibilet-ssr-health "$msg" 2>/dev/null || true
}

# Deploy in progress (stop→build→start): curl=7 must not SIGKILL+start mid-build.
if [[ -f "$DEPLOY_ACTIVE" ]]; then
  now_epoch="$(date +%s)"
  active_mtime="$(stat -c %Y "$DEPLOY_ACTIVE" 2>/dev/null || echo 0)"
  age=$((now_epoch - active_mtime))
  if [[ "$age" -ge 0 && "$age" -lt "$DEPLOY_ACTIVE_MAX_AGE_SEC" ]]; then
    log_msg "SKIP recover: deploy active (${age}s old, marker=$DEPLOY_ACTIVE)"
    exit 0
  fi
  # Stale marker from crashed deploy - ignore and continue (also remove).
  rm -f "$DEPLOY_ACTIVE" 2>/dev/null || true
  log_msg "Removed stale deploy marker (age=${age}s)"
fi

# Incomplete .next: next start ENOENT prerender-manifest → crash-loop + site 502.
if [[ ! -f "$PRERENDER_MANIFEST" ]]; then
  log_msg "SKIP recover: missing prerender-manifest.json (mid-build or broken .next)"
  exit 0
fi

# Home HTML is ~700KB+. Under load full-body transfer can exceed --max-time while
# TTFB stays healthy (0.05-0.4s) → curl=28 false hang → SIGKILL cold-start storm
# (Yandex Webmaster "Долгий ответ сервера"). Only treat as hung when first byte is
# late or the connection never starts (curl 7/28 with empty/zero TTFB).
CURL_MAX_TIME="${DAIBILET_SSR_CURL_MAX_TIME:-12}"
CODE=0
TTFB="$(curl -o /dev/null -s -w '%{time_starttransfer}' --max-time "$CURL_MAX_TIME" "$URL")" || CODE=$?
BAD=0
if [ "$CODE" -ne 0 ]; then
  if [ "$CODE" -eq 28 ] && [ -n "$TTFB" ] && command -v bc >/dev/null \
    && (( $(echo "$TTFB > 0 && $TTFB <= $TTFB_LIMIT" | bc -l) )); then
    log_msg "SKIP recover: body timeout after OK TTFB=${TTFB} curl=28 (not SSR hang; max-time=${CURL_MAX_TIME}s)"
    exit 0
  fi
  BAD=1
elif command -v bc >/dev/null && [ -n "$TTFB" ] && (( $(echo "$TTFB > $TTFB_LIMIT" | bc -l) )); then
  BAD=1
fi

if [ "$BAD" -ne 1 ]; then
  exit 0
fi

# Freshly started next-server often exceeds TTFB>5 during catalog/API warm - do not thrash.
MAIN_PID="$(systemctl show -p MainPID --value "$WEB_SERVICE" 2>/dev/null || echo 0)"
MAIN_PID="$(echo "$MAIN_PID" | tr -d '[:space:]')"
if [[ "$MAIN_PID" =~ ^[1-9][0-9]*$ ]]; then
  ETIMES="$(ps -o etimes= -p "$MAIN_PID" 2>/dev/null | tr -d '[:space:]' || true)"
  if [[ "$ETIMES" =~ ^[0-9]+$ ]] && [[ "$ETIMES" -lt "$COLD_START_GRACE_SEC" ]]; then
    log_msg "SKIP recover: cold-start grace (pid=${MAIN_PID} age=${ETIMES}s < ${COLD_START_GRACE_SEC}s; TTFB=${TTFB:-na} curl=${CODE})"
    exit 0
  fi
fi

MSG="SSR hung (TTFB=${TTFB:-na} curl=${CODE}). Executing SIGKILL+start ${WEB_SERVICE}."
log_msg "$MSG"

if [ "${DAIBILET_SSR_HEALTH_DRY_RUN:-0}" = "1" ]; then
  echo "DRY_RUN=1: would SIGKILL+start (skipped)"
  exit 0
fi

# Prefer hard kill: systemctl restart can hang on stuck next-server (TimeoutStopSec).
systemctl kill -s SIGKILL "$WEB_SERVICE" 2>/dev/null || true
sleep 1
systemctl reset-failed "$WEB_SERVICE" 2>/dev/null || true
# Re-check manifest after kill window (deploy may have started between probe and recover).
if [[ ! -f "$PRERENDER_MANIFEST" ]] || [[ -f "$DEPLOY_ACTIVE" ]]; then
  log_msg "ABORT start: deploy/incomplete .next after SIGKILL"
  exit 0
fi
systemctl start "$WEB_SERVICE" 2>/dev/null || systemctl restart "$WEB_SERVICE" 2>/dev/null || true
# Bracket trick — never bare warm-hub-pages (matches ssh cmdline).
pkill -f '[w]arm-hub-pages' || true
exit 0
