#!/usr/bin/env bash
# Rollback prod public from Next to Vite static (nginx + stop Next).
set -euo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/daibilet}"
BACKUP_DIR="${BACKUP_DIR:-$(cat "$BACKUP_ROOT/LATEST_PRE_NEXT_ROLLBACK" 2>/dev/null || true)}"
NGINX_CONF="${NGINX_CONF:-/etc/nginx/sites-enabled/daibilet.conf}"
WEB_SERVICE="${WEB_SERVICE:-daibilet-web}"

if [[ -z "$BACKUP_DIR" || ! -f "$BACKUP_DIR/daibilet.conf" ]]; then
  echo "ERROR: set BACKUP_DIR to snapshot with daibilet.conf"
  exit 1
fi

cp "$BACKUP_DIR/daibilet.conf" "$NGINX_CONF"
if systemctl is-active --quiet "$WEB_SERVICE" 2>/dev/null; then
  systemctl stop "$WEB_SERVICE"
fi
nginx -t
systemctl reload nginx
echo "Rollback complete: Vite static nginx restored from $BACKUP_DIR"
