#!/usr/bin/env bash
# Restore drill: prod dump → isolated staging Postgres (:5438). Never touches prod DB.
#
# Usage (on MSK as root/deploy with docker access):
#   CONFIRM=restore-drill /opt/daibilet/deploy/scripts/postgres-restore-drill.sh
#   CONFIRM=restore-drill DUMP=/var/backups/daibilet/postgres/daibilet-....dump .../postgres-restore-drill.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/daibilet}"
BACKUP_DIR="${PG_BACKUP_DIR:-/var/backups/daibilet/postgres}"
PROD_CONTAINER="${PROD_PG_CONTAINER:-daibilet-tours-postgres}"
STAGING_CONTAINER="${STAGING_PG_CONTAINER:-daibilet-staging-postgres}"
PROD_DB="${PROD_DB_NAME:-daibilet}"
PROD_USER="${PROD_DB_USER:-daibilet}"
STAGING_DB="${STAGING_DB_NAME:-daibilet_staging}"
STAGING_USER="${STAGING_DB_USER:-daibilet}"
STAGING_PORT="${STAGING_DB_PORT:-5438}"
STAGING_NETWORK="${STAGING_DOCKER_NETWORK:-daibilet-staging-net}"
SECRETS_DIR="${APP_DIR}/var/secrets"
STAGING_PW_FILE="${SECRETS_DIR}/staging-postgres.password"
LOG="${PG_RESTORE_DRILL_LOG:-/var/log/daibilet/postgres-restore-drill.log}"
DUMP="${DUMP:-}"

log() {
  local msg="$1"
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ): $msg" | tee -a "$LOG"
}

if [[ "${CONFIRM:-}" != "restore-drill" ]]; then
  echo "Refusing: set CONFIRM=restore-drill (restores into staging :${STAGING_PORT}, not prod)" >&2
  exit 2
fi

cd "$APP_DIR"
mkdir -p "$(dirname "$LOG")" "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR"

# shellcheck source=postgres-backup-common.sh
source "${APP_DIR}/deploy/scripts/postgres-backup-common.sh"

if [[ -z "$DUMP" ]]; then
  if [[ -L "${BACKUP_DIR}/LATEST.dump" ]]; then
    DUMP="$(readlink -f "${BACKUP_DIR}/LATEST.dump")"
  else
    DUMP="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'daibilet-*.dump' -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)"
  fi
fi

if [[ -z "$DUMP" || ! -f "$DUMP" ]]; then
  log "ERROR: no dump found in ${BACKUP_DIR}; run deploy/cron/postgres-backup.sh first"
  exit 1
fi

if [[ ! -s "$DUMP" ]]; then
  log "ERROR: dump empty: $DUMP"
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$PROD_CONTAINER"; then
  log "ERROR: prod container not running: $PROD_CONTAINER"
  exit 1
fi

if [[ ! -f "$STAGING_PW_FILE" ]]; then
  openssl rand -hex 24 >"$STAGING_PW_FILE"
  chmod 600 "$STAGING_PW_FILE"
  log "created staging password file ${STAGING_PW_FILE}"
fi
STAGING_POSTGRES_PASSWORD="$(cat "$STAGING_PW_FILE")"
export STAGING_POSTGRES_PASSWORD

docker network inspect "$STAGING_NETWORK" >/dev/null 2>&1 || docker network create "$STAGING_NETWORK" >/dev/null

if ! docker ps --format '{{.Names}}' | grep -qx "$STAGING_CONTAINER"; then
  log "starting staging postgres via deploy/docker-compose.staging-db.yml"
  docker compose -f deploy/docker-compose.staging-db.yml up -d
  sleep 5
fi

log "verify dump $(basename "$DUMP")"
pg_verify_custom_dump "$PROD_CONTAINER" "$DUMP"

log "prod counts (read-only)"
prod_counts="$(docker exec "$PROD_CONTAINER" psql -U "$PROD_USER" -d "$PROD_DB" -At -F, -c \
  'SELECT (SELECT count(*)::int FROM "Event"), (SELECT count(*)::int FROM "Venue"), (SELECT count(*)::int FROM "ExternalOrder");')"
log "prod events,venues,orders=${prod_counts}"

log "reset staging database ${STAGING_DB}"
docker exec "$STAGING_CONTAINER" psql -U "$STAGING_USER" -d postgres -v ON_ERROR_STOP=1 -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${STAGING_DB}' AND pid <> pg_backend_pid();" \
  >/dev/null 2>&1 || true
docker exec "$STAGING_CONTAINER" psql -U "$STAGING_USER" -d postgres -v ON_ERROR_STOP=1 -c \
  "DROP DATABASE IF EXISTS ${STAGING_DB};"
docker exec "$STAGING_CONTAINER" psql -U "$STAGING_USER" -d postgres -v ON_ERROR_STOP=1 -c \
  "CREATE DATABASE ${STAGING_DB} OWNER ${STAGING_USER};"

log "pg_restore into staging"
pg_restore_custom_dump "$STAGING_CONTAINER" "$STAGING_USER" "$STAGING_DB" "$DUMP"

staging_counts="$(docker exec "$STAGING_CONTAINER" psql -U "$STAGING_USER" -d "$STAGING_DB" -At -F, -c \
  'SELECT (SELECT count(*)::int FROM "Event"), (SELECT count(*)::int FROM "Venue"), (SELECT count(*)::int FROM "ExternalOrder");')"
log "staging events,venues,orders=${staging_counts}"

if [[ "$prod_counts" != "$staging_counts" ]]; then
  log "ERROR: count mismatch prod=${prod_counts} staging=${staging_counts}"
  exit 1
fi

log "DRILL OK dump=$(basename "$DUMP") counts=${staging_counts} staging=127.0.0.1:${STAGING_PORT}/${STAGING_DB}"
echo "Restore drill passed. Staging DB ready at 127.0.0.1:${STAGING_PORT}/${STAGING_DB}"
