#!/usr/bin/env bash
# Launch contour: HTTP/API smoke (browser modal — manual checklist).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PUBLIC_BASE="${PUBLIC_BASE:-https://staging.daibilet.ru}"
API_BASE="${API_BASE:-http://127.0.0.1:4001}"

TC_SLUG="tc-6a266b49465e94f72b4ef8f6-interaktivnaya-vystavka-nyuton-park"
TEP_SLUG="progulka-ot-prichala-kitai-gorod-do-prichala-kievskii-826"

echo "== launch staging smoke =="
echo "PUBLIC=$PUBLIC_BASE API=$API_BASE"

fail=0
check() {
  local name="$1"
  shift
  if "$@"; then
    echo "OK  $name"
  else
    echo "FAIL $name"
    fail=$((fail + 1))
  fi
}

check "health" curl -fsS "$API_BASE/api/health" >/dev/null
check "stats" curl -fsS "$API_BASE/api/public/stats" >/dev/null
check "home html" curl -fsS "$PUBLIC_BASE/" | grep -q '<div id="root"\|<!DOCTYPE html'
check "catalog html" curl -fsS "$PUBLIC_BASE/events" | grep -q '<div id="root"\|<!DOCTYPE html'
check "tc event api" curl -fsS "$API_BASE/api/public/events/$TC_SLUG" | grep -q 'TICKETSCLOUD'
check "tep event api" curl -fsS "$API_BASE/api/public/events/$TEP_SLUG" | grep -q 'TEPLOHOD'

# Sample assets from index (no 404 on main bundle path)
INDEX_HTML="$(curl -fsS "$PUBLIC_BASE/")"
ASSET_PATH="$(echo "$INDEX_HTML" | grep -oE '/assets/index-[^"]+\.js' | head -1 || true)"
if [[ -n "$ASSET_PATH" ]]; then
  check "main js asset" curl -fsS -o /dev/null -w '' "$PUBLIC_BASE$ASSET_PATH"
else
  echo "WARN no /assets/index-*.js in home html"
fi

echo "== check:widgets =="
node scripts/widget-readiness-check.mjs --base "$PUBLIC_BASE" || fail=$((fail + 1))

echo ""
echo "Manual browser required:"
echo "  - TC modal on $PUBLIC_BASE/events/$TC_SLUG"
echo "  - TEP modal on $PUBLIC_BASE/events/$TEP_SLUG"
echo "  - console: no critical errors on /, /events, event pages"
echo ""

if [[ "$fail" -gt 0 ]]; then
  echo "API smoke FAILED ($fail checks)"
  exit 1
fi
echo "API smoke OK (browser pending)"
