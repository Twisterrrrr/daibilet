#!/usr/bin/env bash
# Snapshot nginx + Vite static before prod Next cutover.
set -euo pipefail

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/daibilet}"
BACKUP_DIR="$BACKUP_ROOT/pre-next-$STAMP"
PUBLIC_DIR="${PUBLIC_DIR:-/var/www/daibilet/public}"
NGINX_CONF="${NGINX_CONF:-/etc/nginx/sites-enabled/daibilet.conf}"

mkdir -p "$BACKUP_DIR"
cp "$NGINX_CONF" "$BACKUP_DIR/daibilet.conf"
if [[ -d "$PUBLIC_DIR" ]]; then
  tar -czf "$BACKUP_DIR/public-static.tgz" -C "$(dirname "$PUBLIC_DIR")" "$(basename "$PUBLIC_DIR")"
fi
if [[ -f /opt/daibilet/.env ]]; then
  cp /opt/daibilet/.env "$BACKUP_DIR/daibilet.env.snapshot"
fi

echo "$BACKUP_DIR" > "$BACKUP_ROOT/LATEST_PRE_NEXT_ROLLBACK"
echo "Rollback snapshot: $BACKUP_DIR"
echo "Restore: BACKUP_DIR=$BACKUP_DIR bash deploy/scripts/rollback-prod-vite.sh"
