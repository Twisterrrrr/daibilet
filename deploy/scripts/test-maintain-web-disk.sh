#!/usr/bin/env bash
# Isolated Linux smoke for online cache eviction and rollback retention.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
fixture="$(mktemp -d /tmp/daibilet-web-disk-test.XXXXXX)"
trap 'rm -rf -- "$fixture"' EXIT
web="$fixture/apps/web"
mkdir -p "$fixture/deploy/scripts"
cp "$SCRIPT_DIR/prune-next-runtime-cache.py" "$fixture/deploy/scripts/"
mkdir -p "$web/.next/server/route-cache" "$web/.next/cache/fetch-cache" "$web/.next.prev"
touch "$web/.next/BUILD_ID" "$web/.next/prerender-manifest.json"
touch "$web/.next.prev/BUILD_ID" "$web/.next.prev/prerender-manifest.json"
for n in 1 2 3; do
  backup="$web/.next.bak-$n"
  mkdir -p "$backup"
  touch "$backup/BUILD_ID" "$backup/prerender-manifest.json"
  touch -d "$((40+n)) days ago" "$backup"
done
python3 "$SCRIPT_DIR/test-prune-next-runtime-cache.py"
APP_DIR="$fixture" KEEP_BACKUPS=2 ROUTE_CACHE_LIMIT_MIB=256 FETCH_CACHE_LIMIT_MIB=128 \
  bash "$SCRIPT_DIR/maintain-web-disk.sh" --apply
[[ -e "$web/.next/BUILD_ID" && -e "$web/.next.prev/BUILD_ID" ]]
[[ "$(find "$web" -maxdepth 1 -type d -name '.next.bak*' | wc -l)" -eq 2 ]]
APP_DIR="$fixture" ROUTE_CACHE_LIMIT_MIB=256 FETCH_CACHE_LIMIT_MIB=128 \
  bash "$SCRIPT_DIR/maintain-web-disk.sh" >/dev/null
echo 'web disk maintenance online fixture passed'
