#!/usr/bin/env bash
# Bound Next's regenerable runtime cache and retire historical web builds.
# Run as root from the systemd timer. Dry-run by default; pass --apply to mutate.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/daibilet}"
ROUTE_CACHE_LIMIT_MIB="${ROUTE_CACHE_LIMIT_MIB:-5120}"
FETCH_CACHE_LIMIT_MIB="${FETCH_CACHE_LIMIT_MIB:-1024}"
IMAGE_CACHE_LIMIT_MIB="${IMAGE_CACHE_LIMIT_MIB:-1024}"
BACKUP_DAYS="${BACKUP_DAYS:-30}"
KEEP_BACKUPS="${KEEP_BACKUPS:-2}"
REQUIRE_ROLLBACK="${REQUIRE_ROLLBACK:-1}"
APPLY=false
[[ "${1:-}" == "--apply" ]] && APPLY=true
[[ $# -le 1 && ( $# -eq 0 || "${1:-}" == "--apply" ) ]] || { echo 'usage: maintain-web-disk.sh [--apply]' >&2; exit 2; }
[[ "$ROUTE_CACHE_LIMIT_MIB" =~ ^[0-9]+$ && "$FETCH_CACHE_LIMIT_MIB" =~ ^[0-9]+$ && "$IMAGE_CACHE_LIMIT_MIB" =~ ^[0-9]+$ && "$BACKUP_DAYS" =~ ^[0-9]+$ && "$KEEP_BACKUPS" =~ ^[0-9]+$ ]] || exit 2
(( ROUTE_CACHE_LIMIT_MIB >= 256 && FETCH_CACHE_LIMIT_MIB >= 128 && IMAGE_CACHE_LIMIT_MIB >= 128 && BACKUP_DAYS >= 7 && KEEP_BACKUPS >= 1 )) || exit 2

WEB_DIR="$(realpath -e "$APP_DIR/apps/web")"
[[ "$WEB_DIR" == "$APP_DIR/apps/web" ]] || { echo 'unexpected web path' >&2; exit 2; }
NEXT="$WEB_DIR/.next"
PREV="$WEB_DIR/.next.prev"
[[ -f "$NEXT/BUILD_ID" && -f "$NEXT/prerender-manifest.json" ]] || { echo 'active build incomplete' >&2; exit 1; }
if [[ "$REQUIRE_ROLLBACK" == 1 ]]; then
  [[ -f "$PREV/BUILD_ID" && -f "$PREV/prerender-manifest.json" ]] || { echo 'rollback build incomplete' >&2; exit 1; }
fi

# Never compete with an artifact swap or fallback build.
LOCK="$APP_DIR/var/lock/daibilet-web-deploy.lock"
mkdir -p "$(dirname "$LOCK")"
exec 9>"$LOCK"
flock -n 9 || { echo 'deploy in progress; skipping maintenance'; exit 0; }

echo 'Inspecting bounded Next runtime caches; web remains online.'
prune_args=(
  --route-cache "$NEXT/server/route-cache"
  --fetch-cache "$NEXT/cache/fetch-cache"
  --image-cache "$NEXT/cache/images"
  --route-limit-mib "$ROUTE_CACHE_LIMIT_MIB"
  --fetch-limit-mib "$FETCH_CACHE_LIMIT_MIB"
  --image-limit-mib "$IMAGE_CACHE_LIMIT_MIB"
)
$APPLY && prune_args+=(--apply)
python3 "$APP_DIR/deploy/scripts/prune-next-runtime-cache.py" "${prune_args[@]}"

# A single valid .next.prev is the rollback. Keep only two newest historical
# .next.bak* trees; remove others after 30 days. Ignore symlinks and malformed names.
mapfile -t backups < <(find "$WEB_DIR" -mindepth 1 -maxdepth 1 -type d -name '.next.bak*' -printf '%T@ %p\n' | sort -nr | cut -d' ' -f2-)
index=0
for backup in "${backups[@]}"; do
  ((index+=1))
  (( index > KEEP_BACKUPS )) || continue
  [[ "$backup" == "$WEB_DIR"/.next.bak* && ! -L "$backup" ]] || continue
  [[ -f "$backup/BUILD_ID" && -f "$backup/prerender-manifest.json" ]] || continue
  if find "$backup" -maxdepth 0 -mtime "+$BACKUP_DAYS" | grep -q .; then
    echo "retire old build: $backup"
    $APPLY && rm -rf -- "$backup"
  fi
done

echo 'maintenance complete'
