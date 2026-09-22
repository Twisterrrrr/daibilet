#!/usr/bin/env bash
set -euo pipefail
cd "${APP_DIR:-/opt/daibilet}"
mkdir -p /var/log/daibilet /var/lib/daibilet/crawler-monitor
exec 9>/var/lib/daibilet/crawler-monitor/job.lock
flock -n 9 || exit 0
if [[ -f .env ]]; then set -a; source .env; set +a; fi
exec node scripts/crawler-log-monitor.mjs >>/var/log/daibilet/crawler-monitor.log 2>&1
