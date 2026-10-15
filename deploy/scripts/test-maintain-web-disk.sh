#!/usr/bin/env bash
# Isolated Linux smoke for the cache cap and rollback retention logic.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
fixture="$(mktemp -d /tmp/daibilet-web-disk-test.XXXXXX)"
trap 'rm -rf -- "$fixture"' EXIT
web="$fixture/apps/web"
mkdir -p "$web/.next/cache" "$web/.next.prev" "$fixture/bin"
touch "$web/.next/BUILD_ID" "$web/.next/prerender-manifest.json"
touch "$web/.next.prev/BUILD_ID" "$web/.next.prev/prerender-manifest.json"
fallocate -l 520M "$web/.next/cache/test-data"
for n in 1 2 3; do
  backup="$web/.next.bak-$n"
  mkdir -p "$backup"
  touch "$backup/BUILD_ID" "$backup/prerender-manifest.json"
  touch -d "$((40+n)) days ago" "$backup"
done
cat >"$fixture/bin/systemctl" <<'EOF'
#!/usr/bin/env bash
echo "$1" >> "$TEST_LOG"
EOF
cat >"$fixture/bin/curl" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
chmod +x "$fixture/bin/systemctl" "$fixture/bin/curl"
export TEST_LOG="$fixture/systemctl.log"
PATH="$fixture/bin:$PATH" APP_DIR="$fixture" WEB_SERVICE=fixture CACHE_LIMIT_MIB=512 KEEP_BACKUPS=2 \
  bash "$SCRIPT_DIR/maintain-web-disk.sh" --apply
[[ ! -e "$web/.next/cache.retired" && ! -e "$web/.next/cache/test-data" ]]
[[ -e "$web/.next/BUILD_ID" && -e "$web/.next.prev/BUILD_ID" ]]
[[ "$(find "$web" -maxdepth 1 -type d -name '.next.bak*' | wc -l)" -eq 2 ]]
[[ "$(cat "$TEST_LOG")" == $'stop\nstart' ]]
echo 'web disk maintenance fixture passed'
