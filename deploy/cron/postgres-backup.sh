#!/usr/bin/env bash
# Daily Postgres backup (MSK catalog prod). Custom-format pg_dump + verify + retention.
#
# Cron (after install-postgres-backup-cron.sh):
#   35 4 * * * root APP_DIR=/opt/daibilet /opt/daibilet/deploy/cron/postgres-backup.sh \
#     >> /var/log/daibilet/postgres-backup.log 2>&1
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/daibilet}"
BACKUP_DIR="${PG_BACKUP_DIR:-/var/backups/daibilet/postgres}"
PROD_CONTAINER="${PROD_PG_CONTAINER:-daibilet-tours-postgres}"
PROD_DB="${PROD_DB_NAME:-daibilet}"
PROD_USER="${PROD_DB_USER:-daibilet}"
KEEP_DAILY="${PG_BACKUP_KEEP_DAILY:-7}"
KEEP_WEEKLY="${PG_BACKUP_KEEP_WEEKLY:-4}"

# shellcheck source=../scripts/postgres-backup-common.sh
source "${APP_DIR}/deploy/scripts/postgres-backup-common.sh"

log() {
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ): $*"
}

mkdir -p "$BACKUP_DIR"
mkdir -p /var/log/daibilet

if ! docker ps --format '{{.Names}}' | grep -qx "$PROD_CONTAINER"; then
  log "ERROR: prod postgres container not running: $PROD_CONTAINER"
  exit 1
fi

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
dump_path="${BACKUP_DIR}/daibilet-${stamp}.dump"
tmp_path="${dump_path}.partial"

log "pg_dump start → ${dump_path}"
pg_dump_to_host "$PROD_CONTAINER" "$PROD_USER" "$PROD_DB" "$tmp_path"

if [[ ! -s "$tmp_path" ]]; then
  rm -f "$tmp_path"
  log "ERROR: dump file empty"
  exit 1
fi

mv "$tmp_path" "$dump_path"
ln -sfn "$(basename "$dump_path")" "${BACKUP_DIR}/LATEST.dump"
log "pg_dump OK size=$(du -h "$dump_path" | awk '{print $1}')"

# Retention: keep last N daily dumps (by mtime).
mapfile -t all_dumps < <(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'daibilet-*.dump' -printf '%T@ %p\n' 2>/dev/null | sort -rn | cut -d' ' -f2-)
if [[ "${#all_dumps[@]}" -gt "$KEEP_DAILY" ]]; then
  for old in "${all_dumps[@]:$KEEP_DAILY}"; do
    rm -f "$old"
    log "retention: removed $(basename "$old")"
  done
fi

# Weekly marker: first dump each ISO week kept up to KEEP_WEEKLY (symlink only).
week_tag="$(date -u +%G-W%V)"
weekly_link="${BACKUP_DIR}/weekly-${week_tag}.dump"
if [[ ! -e "$weekly_link" ]]; then
  ln -sfn "$(basename "$dump_path")" "$weekly_link"
  log "weekly marker → $(basename "$dump_path")"
fi

mapfile -t weekly_links < <(find "$BACKUP_DIR" -maxdepth 1 -type l -name 'weekly-*.dump' -printf '%T@ %p\n' 2>/dev/null | sort -rn | cut -d' ' -f2-)
if [[ "${#weekly_links[@]}" -gt "$KEEP_WEEKLY" ]]; then
  for old_weekly in "${weekly_links[@]:$KEEP_WEEKLY}"; do
    rm -f "$old_weekly"
    log "retention: removed weekly $(basename "$old_weekly")"
  done
fi

log "backup complete kept_daily<=${KEEP_DAILY} weekly<=${KEEP_WEEKLY}"
