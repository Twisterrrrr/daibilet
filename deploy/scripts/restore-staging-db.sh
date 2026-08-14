#!/usr/bin/env bash
# Snapshot prod Postgres into staging DB (E5).
# Run on server as root from repo root, e.g. /opt/daibilet-staging.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

PROD_CONTAINER="${PROD_PG_CONTAINER:-daibilet-tours-postgres}"
STAGING_CONTAINER="${STAGING_PG_CONTAINER:-daibilet-staging-postgres}"
PROD_DB="${PROD_DB_NAME:-daibilet}"
PROD_USER="${PROD_DB_USER:-daibilet}"
STAGING_DB="${STAGING_DB_NAME:-daibilet_staging}"
STAGING_USER="${STAGING_DB_USER:-daibilet}"
STAGING_PORT="${STAGING_DB_PORT:-5438}"
DUMP_PATH="${STAGING_DUMP_PATH:-/tmp/daibilet-prod-to-staging.sql}"
STAGING_ENV="${STAGING_ENV_FILE:-/opt/daibilet-staging/.env}"

if [[ -f "$STAGING_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$STAGING_ENV"
  set +a
fi

STAGING_PASSWORD="${STAGING_POSTGRES_PASSWORD:-${POSTGRES_PASSWORD:-}}"
if [[ -z "$STAGING_PASSWORD" ]]; then
  echo "Set STAGING_POSTGRES_PASSWORD or POSTGRES_PASSWORD in $STAGING_ENV" >&2
  exit 1
fi

echo "== E5: prod -> staging DB restore =="
echo "prod container: $PROD_CONTAINER"
echo "staging container: $STAGING_CONTAINER"
echo "dump: $DUMP_PATH"

if ! docker ps --format '{{.Names}}' | grep -qx "$PROD_CONTAINER"; then
  echo "Prod postgres container not running: $PROD_CONTAINER" >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$STAGING_CONTAINER"; then
  echo "Starting staging postgres via deploy/docker-compose.staging-db.yml"
  STAGING_POSTGRES_PASSWORD="$STAGING_PASSWORD" docker compose -f deploy/docker-compose.staging-db.yml up -d
  sleep 5
else
  if ! ss -lnt | grep -q ':5438 '; then
    echo "Recreating $STAGING_CONTAINER with host port ${STAGING_PORT}"
    docker stop "$STAGING_CONTAINER"
    docker rm "$STAGING_CONTAINER"
    STAGING_POSTGRES_PASSWORD="$STAGING_PASSWORD" docker compose -f deploy/docker-compose.staging-db.yml up -d
    sleep 5
  fi
fi

echo "== pg_dump prod =="
docker exec "$PROD_CONTAINER" pg_dump \
  -U "$PROD_USER" \
  -d "$PROD_DB" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists > "$DUMP_PATH"

echo "== reset staging database =="
docker exec "$STAGING_CONTAINER" psql -U "$STAGING_USER" -d postgres -v ON_ERROR_STOP=1 -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${STAGING_DB}' AND pid <> pg_backend_pid();" || true
docker exec "$STAGING_CONTAINER" psql -U "$STAGING_USER" -d postgres -v ON_ERROR_STOP=1 -c \
  "DROP DATABASE IF EXISTS ${STAGING_DB};"
docker exec "$STAGING_CONTAINER" psql -U "$STAGING_USER" -d postgres -v ON_ERROR_STOP=1 -c \
  "CREATE DATABASE ${STAGING_DB} OWNER ${STAGING_USER};"

echo "== restore into staging =="
docker exec -i "$STAGING_CONTAINER" psql -U "$STAGING_USER" -d "$STAGING_DB" -v ON_ERROR_STOP=1 < "$DUMP_PATH"

STAGING_URL="postgresql://${STAGING_USER}:${STAGING_PASSWORD}@127.0.0.1:${STAGING_PORT}/${STAGING_DB}"
echo "== update $STAGING_ENV DATABASE_URL =="
if grep -q '^DATABASE_URL=' "$STAGING_ENV"; then
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=${STAGING_URL}|" "$STAGING_ENV"
else
  echo "DATABASE_URL=${STAGING_URL}" >> "$STAGING_ENV"
fi

echo "== prisma migrate deploy (staging) =="
cd "$ROOT_DIR"
set -a
# shellcheck disable=SC1090
source "$STAGING_ENV"
set +a
npm run db:deploy

echo "== smoke counts =="
docker exec "$STAGING_CONTAINER" psql -U "$STAGING_USER" -d "$STAGING_DB" -c \
  'select (select count(*)::int from "Event") as events, (select count(*)::int from "Venue") as venues, (select count(*)::int from "ExternalOrder") as orders;'

echo "Restore OK. Restart staging API:"
echo "  systemctl restart daibilet-api-staging"
