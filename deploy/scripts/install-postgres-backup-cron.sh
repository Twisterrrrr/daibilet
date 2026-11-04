#!/usr/bin/env bash
# Install daily Postgres backup cron on MSK (run as root once).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/daibilet}"
CRON_SRC="${APP_DIR}/deploy/cron/daibilet-postgres-backup"
CRON_DST="/etc/cron.d/daibilet-postgres-backup"

chmod +x "${APP_DIR}/deploy/cron/postgres-backup.sh"
chmod +x "${APP_DIR}/deploy/scripts/postgres-restore-drill.sh"
mkdir -p /var/log/daibilet /var/backups/daibilet/postgres

if [[ ! -f "$CRON_SRC" ]]; then
  echo "Missing $CRON_SRC" >&2
  exit 1
fi

cp "$CRON_SRC" "$CRON_DST"
chmod 644 "$CRON_DST"
echo "Installed $CRON_DST"
echo "Test now: ${APP_DIR}/deploy/cron/postgres-backup.sh"
echo "Drill: CONFIRM=restore-drill ${APP_DIR}/deploy/scripts/postgres-restore-drill.sh"
