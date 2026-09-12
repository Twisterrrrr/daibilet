#!/usr/bin/env bash
# Shared helpers for postgres backup / restore drill (MSK Docker PG).
set -euo pipefail

pg_dump_to_host() {
  local container="$1" user="$2" db="$3" host_path="$4"
  local in_container="/tmp/pg-dump-$$.dump"

  docker exec "$container" rm -f "$in_container" 2>/dev/null || true
  docker exec "$container" pg_dump \
    -U "$user" \
    -d "$db" \
    --format=custom \
    --no-owner \
    --no-acl \
    -f "$in_container"
  docker exec "$container" pg_restore --list "$in_container" >/dev/null
  docker cp "${container}:${in_container}" "$host_path"
  docker exec "$container" rm -f "$in_container"
}

pg_verify_custom_dump() {
  local container="$1" host_path="$2"
  local in_container="/tmp/pg-verify-$$.dump"

  docker cp "$host_path" "${container}:${in_container}"
  docker exec "$container" pg_restore --list "$in_container" >/dev/null
  docker exec "$container" rm -f "$in_container"
}

pg_restore_custom_dump() {
  local container="$1" user="$2" db="$3" host_path="$4"
  local in_container="/tmp/pg-restore-$$.dump"

  docker cp "$host_path" "${container}:${in_container}"
  docker exec "$container" pg_restore \
    -U "$user" \
    -d "$db" \
    --no-owner \
    --no-acl \
    --single-transaction \
    "$in_container"
  docker exec "$container" rm -f "$in_container"
}
