#!/usr/bin/env bash
# Install the 5-minute Postgres liveness alert cron on MSK (run as root once).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/daibilet}"
CRON_SRC="${APP_DIR}/deploy/cron/daibilet-postgres-health-watch"
CRON_DST="/etc/cron.d/daibilet-postgres-health-watch"

chmod +x "${APP_DIR}/deploy/cron/postgres-health-watch.sh"
mkdir -p /var/log/daibilet

if [[ ! -f "$CRON_SRC" ]]; then
  echo "Missing $CRON_SRC" >&2
  exit 1
fi

cp "$CRON_SRC" "$CRON_DST"
chmod 644 "$CRON_DST"
echo "Installed $CRON_DST"
echo "Test now: ${APP_DIR}/deploy/cron/postgres-health-watch.sh; echo exit=\$?"