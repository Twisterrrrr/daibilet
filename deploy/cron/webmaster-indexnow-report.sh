#!/usr/bin/env bash
set -euo pipefail
cd "${APP_DIR:-/opt/daibilet}"
mkdir -p /var/lib/daibilet/webmaster /var/log/daibilet
exec 9>/var/lib/daibilet/webmaster/job.lock
flock -n 9 || exit 0
exec node --env-file=.env scripts/webmaster-indexnow-report.mjs >> /var/log/daibilet/webmaster-indexnow.log 2>&1
