#!/usr/bin/env bash
# INC.504.20 / INC.504.23: SSR healthcheck (extracted from cron.d — cron treats bare % as newline).
# Detect a repeat failure on a lightweight Next route before restarting web.
#
# INC.504.23: never fight deploy / incomplete .next / cold start:
# - skip while /var/lock/daibilet-web-deploy.active is fresh
# - skip when prerender-manifest.json missing (mid-build)
# - skip SIGKILL when MainPID age < cold-start grace (avoids curl=28 kill loops)
set -u
URL="${DAIBILET_SSR_HEALTH_URL:-http://127.0.0.1:3001/robots.txt}"
TTFB_LIMIT="${DAIBILET_SSR_TTFB_LIMIT:-5}"
LOG="${DAIBILET_SSR_HEALTH_LOG:-/var/log/daibilet/ssr-health.log}"
WEB_SERVICE="${DAIBILET_WEB_SERVICE:-daibilet-web}"
APP_DIR="${APP_DIR:-/opt/daibilet}"
_deploy_active_default="${APP_DIR}/var/lock/daibilet-web-deploy.active"
if [[ -f "$_deploy_active_default" ]]; then
  DEPLOY_ACTIVE="${DAIBILET_WEB_DEPLOY_ACTIVE:-$_deploy_active_default}"
elif [[ -f /var/lock/daibilet-web-deploy.active ]]; then
  DEPLOY_ACTIVE="${DAIBILET_WEB_DEPLOY_ACTIVE:-/var/lock/daibilet-web-deploy.active}"
else
  DEPLOY_ACTIVE="${DAIBILET_WEB_DEPLOY_ACTIVE:-$_deploy_active_default}"
fi
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
  OK_HEARTBEAT_INTERVAL="${DAIBILET_SSR_HEALTH_OK_INTERVAL_SEC:-3600}"
  NOW_EPOCH="$(date +%s)"
  LOG_MTIME="$(stat -c %Y "$LOG" 2>/dev/null || echo 0)"
  if [[ ! "$LOG_MTIME" =~ ^[0-9]+$ ]]; then
    LOG_MTIME=0
  fi
  if [[ "$OK_HEARTBEAT_INTERVAL" =~ ^[0-9]+$ ]] && (( NOW_EPOCH - LOG_MTIME >= OK_HEARTBEAT_INTERVAL )); then
    log_msg "OK heartbeat: TTFB=${TTFB:-na} curl=${CODE}"
  fi
  exit 0
fi

# A busy SSR request can briefly delay one probe. Confirm that the lightweight
# route is still unresponsive before taking down every active connection.
sleep 2
RETRY_CODE=0
RETRY_TTFB="$(curl -o /dev/null -s -w '%{time_starttransfer}' --max-time "$CURL_MAX_TIME" "$URL")" || RETRY_CODE=$?
if [ "$RETRY_CODE" -eq 0 ] && command -v bc >/dev/null && [ -n "$RETRY_TTFB" ] \
  && (( $(echo "$RETRY_TTFB <= $TTFB_LIMIT" | bc -l) )); then
  log_msg "SKIP recover: retry healthy (first TTFB=${TTFB:-na} curl=${CODE}; retry TTFB=${RETRY_TTFB} curl=${RETRY_CODE})"
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
if [ "${DAIBILET_SSR_HEALTH_DRY_RUN:-0}" = "1" ]; then
  echo "DRY_RUN=1: $MSG (skipped)"
  exit 0
fi
log_msg "$MSG"

# Preserve the blocked Next process's stack before killing it. The report
# excludes environment variables and network details; only the Next process
# with report-on-signal enabled receives SIGUSR2. A plain SIGUSR2 could
# terminate an unconfigured Node process, so the environment check is required.
REPORT_DIR="${DAIBILET_SSR_REPORT_DIR:-/var/log/daibilet/node-reports}"
CONTROL_GROUP="$(systemctl show -p ControlGroup --value "$WEB_SERVICE" 2>/dev/null || true)"
CGROUP_DIR="/sys/fs/cgroup${CONTROL_GROUP}"
if [[ -n "$CONTROL_GROUP" && -d "$CGROUP_DIR" ]]; then
  MEM_CURRENT="$(cat "$CGROUP_DIR/memory.current" 2>/dev/null || echo na)"
  SWAP_CURRENT="$(cat "$CGROUP_DIR/memory.swap.current" 2>/dev/null || echo na)"
  MEM_EVENTS="$(tr '\n' ',' <"$CGROUP_DIR/memory.events" 2>/dev/null || echo na)"
  log_msg "HANG diagnostics: load=$(cut -d ' ' -f 1-3 /proc/loadavg) memory=${MEM_CURRENT} swap=${SWAP_CURRENT} events=${MEM_EVENTS}"

  NEXT_PID=""
  while read -r PID; do
    [[ "$PID" =~ ^[1-9][0-9]*$ ]] || continue
    COMM="$(ps -p "$PID" -o comm= 2>/dev/null || true)"
    if [[ "$COMM" == next-server* ]]; then
      NEXT_PID="$PID"
      break
    fi
  done <"$CGROUP_DIR/cgroup.procs"

  if [[ -n "$NEXT_PID" ]]; then
    log_msg "HANG process: $(ps -p "$NEXT_PID" -o pid=,etime=,%cpu=,rss=,stat=,comm= 2>/dev/null | tr -s ' ' || echo unavailable)"
    if [[ -r "/proc/$NEXT_PID/environ" ]] && tr '\0' '\n' <"/proc/$NEXT_PID/environ" | grep -Eq '^NODE_OPTIONS=.*--report-on-signal'; then
      mkdir -p "$REPORT_DIR"
      chmod 700 "$REPORT_DIR"
      kill -USR2 "$NEXT_PID" 2>/dev/null || true
      sleep 2
      log_msg "HANG report signal sent to Next pid=${NEXT_PID}; reports=${REPORT_DIR}"
      find "$REPORT_DIR" -maxdepth 1 -type f -name 'report.*.json' -mtime +14 -delete 2>/dev/null || true
    else
      log_msg "HANG report skipped: Next pid=${NEXT_PID} lacks report-on-signal"
    fi
  fi
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
