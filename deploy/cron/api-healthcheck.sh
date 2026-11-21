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
  OK_HEARTBEAT_INTERVAL="${DAIBILET_API_HEALTH_OK_INTERVAL_SEC:-3600}"
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

# Capture the blocked Node process's report BEFORE killing (mirrors ssr-healthcheck.sh).
# SIGUSR2 only emits a report when the process started with --report-on-signal; a plain
# SIGUSR2 to an unconfigured process could terminate it, so check the environment first
# and only signal the real tsx-loaded server-entry node (not npm/sh, not the tsx CLI).
REPORT_DIR="${DAIBILET_API_REPORT_DIR:-/var/log/daibilet/node-reports}"
CONTROL_GROUP="$(systemctl show -p ControlGroup --value "$API_SERVICE" 2>/dev/null || true)"
CGROUP_DIR="/sys/fs/cgroup${CONTROL_GROUP}"
if [[ -n "$CONTROL_GROUP" && -d "$CGROUP_DIR" ]]; then
  MEM_CURRENT="$(cat "$CGROUP_DIR/memory.current" 2>/dev/null || echo na)"
  SWAP_CURRENT="$(cat "$CGROUP_DIR/memory.swap.current" 2>/dev/null || echo na)"
  MEM_EVENTS="$(tr '\n' ',' <"$CGROUP_DIR/memory.events" 2>/dev/null || echo na)"
  log_msg "HANG diagnostics: load=$(cut -d ' ' -f 1-3 /proc/loadavg) memory=${MEM_CURRENT} swap=${SWAP_CURRENT} events=${MEM_EVENTS}"

  API_NODE_PID=""
  while read -r PID; do
    [[ "$PID" =~ ^[1-9][0-9]*$ ]] || continue
    CMD="$(tr '\0' ' ' <"/proc/$PID/cmdline" 2>/dev/null || true)"
    # Real API process = node with the tsx loader import; npm/sh and the tsx CLI differ.
    if [[ "$CMD" == *"loader.mjs"* && "$CMD" == *"server-entry.ts"* ]]; then
      API_NODE_PID="$PID"
      break
    fi
  done <"$CGROUP_DIR/cgroup.procs"

  if [[ -n "$API_NODE_PID" ]]; then
    PSTATE="$(awk '/^State:/{print $2}' "/proc/$API_NODE_PID/status" 2>/dev/null || echo na)"
    WCHAN="$(cat "/proc/$API_NODE_PID/wchan" 2>/dev/null || echo na)"
    # State=R (running/CPU-bound, report will be written) vs State=D (uninterruptible
    # kernel wait: disk/cgroup reclaim; V8 interrupts are NOT delivered, so report.*.json
    # may be absent). wchan names the kernel-side wait channel either way.
    log_msg "HANG process: $(ps -p "$API_NODE_PID" -o pid=,etime=,%cpu=,rss=,stat=,comm= 2>/dev/null | tr -s ' ' || echo unavailable) state=${PSTATE} wchan=${WCHAN}"
    if [[ -r "/proc/$API_NODE_PID/environ" ]] && tr '\0' '\n' <"/proc/$API_NODE_PID/environ" | grep -Eq '^NODE_OPTIONS=.*--report-on-signal'; then
      mkdir -p "$REPORT_DIR"
      chmod 700 "$REPORT_DIR"
      kill -USR2 "$API_NODE_PID" 2>/dev/null || true
      sleep 2
      log_msg "HANG report signal sent to API node pid=${API_NODE_PID}; reports=${REPORT_DIR}"
      find "$REPORT_DIR" -maxdepth 1 -type f -name 'report.*.json' -mtime +14 -delete 2>/dev/null || true
    else
      log_msg "HANG report skipped: API node pid=${API_NODE_PID} lacks report-on-signal"
    fi
  fi
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
