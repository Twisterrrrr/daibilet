#!/usr/bin/env bash
# F3: SSR smoke for Next public on staging (no CSR root-only check).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PUBLIC_BASE="${PUBLIC_BASE:-https://staging.daibilet.ru}"
API_BASE="${API_BASE:-http://127.0.0.1:4001}"
WEB_BASE="${WEB_BASE:-http://127.0.0.1:3000}"

TC_SLUG="tc-6a266b49465e94f72b4ef8f6-interaktivnaya-vystavka-nyuton-park"
TEP_SLUG="progulka-ot-prichala-kitai-gorod-do-prichala-kievskii-826"

echo "== F3 Next staging smoke =="
echo "PUBLIC=$PUBLIC_BASE API=$API_BASE WEB=$WEB_BASE"

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

check "api health" curl -fsS "$API_BASE/api/health" >/dev/null
check "next health" curl -fsS "$WEB_BASE/api/health" >/dev/null
check "public health via nginx" curl -fsS "$PUBLIC_BASE/api/health" >/dev/null

# SSR: content in HTML without JS bundle requirement
check "home ssr" curl -fsS "$PUBLIC_BASE/" | grep -qi 'дайбилет\|события\|events'
check "catalog ssr" curl -fsS "$PUBLIC_BASE/events" | grep -qi 'каталог\|событ'
check "landing ssr" curl -fsS "$PUBLIC_BASE/podborki" | grep -qi 'подборк'
check "podborki canonical" curl -fsS "$PUBLIC_BASE/rechnye-progulki/moscow/" | grep -qi 'речн\|прогулк\|moscow\|москв' || \
  curl -fsS "$PUBLIC_BASE/rechnye-progulki/moscow" | grep -qi 'речн\|прогулк'

check "tc event api" curl -fsS "$API_BASE/api/public/events/$TC_SLUG" | grep -q 'TICKETSCLOUD'
check "tep event api" curl -fsS "$API_BASE/api/public/events/$TEP_SLUG" | grep -q 'TEPLOHOD'
check "tc event page html" curl -fsS "$PUBLIC_BASE/events/$TC_SLUG" | grep -qi '<!DOCTYPE html'
check "legacy landing 301" curl -sI "$PUBLIC_BASE/landings/river-cruises" | grep -qi '301\|302'

echo "== backend:next:parity (optional) =="
WEB_BASE_URL="$PUBLIC_BASE" LEGACY_BASE_URL="$API_BASE" pnpm backend:next:parity 2>/dev/null || echo "WARN parity skipped (DB/env)"

echo ""
echo "Manual: TC/Teplohod widget click on $PUBLIC_BASE/events/$TC_SLUG"
echo ""

if [[ "$fail" -gt 0 ]]; then
  echo "F3 smoke FAILED ($fail checks)"
  exit 1
fi
echo "F3 smoke OK"
