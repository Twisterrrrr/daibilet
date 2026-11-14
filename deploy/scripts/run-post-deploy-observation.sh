#!/usr/bin/env bash
# Run after the delayed post-deploy window; skip crawler monitoring if deploy
# never initialized its own watermark, avoiding an accidental two-hour scan.
set -uo pipefail

DEPLOY_SHA="${1:?usage: run-post-deploy-observation.sh <deploy-sha>}"
[[ "$DEPLOY_SHA" =~ ^[0-9a-f]{40}$ ]] || exit 2
cd "${APP_DIR:-/opt/daibilet}"
snapshot_script="${POST_DEPLOY_SNAPSHOT_SCRIPT:-deploy/scripts/post-deploy-observation.sh}"

state="${APP_DIR:-/opt/daibilet}/var/monitor/crawler-post-deploy-${DEPLOY_SHA}.json"
monitor_status=0
if [[ -s "$state" ]]; then
  CRAWLER_MONITOR_STATE="$state" \
    CRAWLER_ALERT_LOG="${CRAWLER_ALERT_LOG:-/var/log/daibilet/crawler-alerts.jsonl}" \
    node scripts/crawler-log-monitor.mjs
  monitor_status=$?
  rm -f "$state" "$state.tmp"
else
  echo "POST_DEPLOY_MONITOR skipped=watermark-not-created"
fi

bash "$snapshot_script"
observation_status=$?
(( monitor_status == 0 && observation_status == 0 ))
