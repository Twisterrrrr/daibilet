#!/usr/bin/env bash
# Bound Next's regenerable runtime cache and retire historical web builds.
# Run as root from the systemd timer. Dry-run by default; pass --apply to mutate.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/daibilet}"
WEB_SERVICE="${WEB_SERVICE:-daibilet-web}"
WEB_PORT="${DAIBILET_WEB_PORT:-3001}"
CACHE_LIMIT_MIB="${CACHE_LIMIT_MIB:-4096}"
BACKUP_DAYS="${BACKUP_DAYS:-30}"
KEEP_BACKUPS="${KEEP_BACKUPS:-2}"
REQUIRE_ROLLBACK="${REQUIRE_ROLLBACK:-1}"
APPLY=false
[[ "${1:-}" == "--apply" ]] && APPLY=true
[[ $# -le 1 && ( $# -eq 0 || "${1:-}" == "--apply" ) ]] || { echo 'usage: maintain-web-disk.sh [--apply]' >&2; exit 2; }
[[ "$CACHE_LIMIT_MIB" =~ ^[0-9]+$ && "$BACKUP_DAYS" =~ ^[0-9]+$ && "$KEEP_BACKUPS" =~ ^[0-9]+$ ]] || exit 2
(( CACHE_LIMIT_MIB >= 512 && BACKUP_DAYS >= 7 && KEEP_BACKUPS >= 1 )) || exit 2

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

cache_mib=0
for cache_path in "$NEXT/cache" "$NEXT/server/route-cache"; do
  if [[ -d "$cache_path" ]]; then
    cache_size="$(du -sm "$cache_path" | awk '{print $1}')"
    ((cache_mib += cache_size))
  fi
done
echo "runtime cache: ${cache_mib} MiB; limit: ${CACHE_LIMIT_MIB} MiB"
if (( cache_mib > CACHE_LIMIT_MIB )); then
  echo 'cache exceeds limit; a brief web restart is required'
  if $APPLY; then
    systemctl stop "$WEB_SERVICE"
    for relative in cache server/route-cache; do
      source_path="$NEXT/$relative"
      retired_path="$NEXT/${relative//\//-}.retired"
      [[ ! -L "$source_path" && ! -e "$retired_path" ]] || { systemctl start "$WEB_SERVICE"; echo 'unsafe cache path' >&2; exit 1; }
      [[ ! -d "$source_path" ]] || mv -- "$source_path" "$retired_path"
    done
    systemctl start "$WEB_SERVICE"
    ready=false
    for _ in {1..15}; do
      if curl -fsS --max-time 3 "http://127.0.0.1:${WEB_PORT}/api/health" >/dev/null 2>&1; then ready=true; break; fi
      sleep 2
    done
    $ready || { echo 'web health failed after cache reset; retired cache retained' >&2; exit 1; }
    rm -rf -- "$NEXT/cache.retired" "$NEXT/server-route-cache.retired"
    echo 'runtime cache reset; web healthy'
  fi
fi

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
