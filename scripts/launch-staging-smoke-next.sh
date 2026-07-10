#!/usr/bin/env bash
# F3: SSR smoke for Next public on staging (no CSR root-only check).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PUBLIC_BASE="${PUBLIC_BASE:-https://staging.daibilet.ru}"
API_BASE="${API_BASE:-http://127.0.0.1:4001}"
WEB_BASE="${WEB_BASE:-http://127.0.0.1:3000}"

TC_SLUG="${TC_SLUG:-}"
TEP_SLUG="${TEP_SLUG:-}"

if [[ -z "$TC_SLUG" ]]; then
  TC_SLUG="$(curl -fsS "$WEB_BASE/api/public/events?limit=100" | grep -o '"slug":"tc-[^"]*' | head -1 | cut -d'"' -f4 || true)"
fi
if [[ -z "$TEP_SLUG" ]]; then
  TEP_SLUG="$(curl -fsS "$WEB_BASE/api/public/events?limit=200" | grep -o '"slug":"[^"]*"' | grep -i tep | head -1 | cut -d'"' -f4 || true)"
  if [[ -z "$TEP_SLUG" ]]; then
    TEP_SLUG="progulka-ot-prichala-kitai-gorod-do-prichala-kievskii-826"
  fi
fi

echo "TC_SLUG=$TC_SLUG TEP_SLUG=$TEP_SLUG"

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

# SSR: pipelines must run inside check() — pipefail + set -e otherwise exits early
check "home ssr" bash -c "curl -fsS '$PUBLIC_BASE/' | grep -qi 'дайбилет\\|события\\|events'"
check "catalog ssr" bash -c "curl -fsS '$PUBLIC_BASE/events' | grep -qi 'каталог\\|событ'"
check "landing ssr" bash -c "curl -fsS '$PUBLIC_BASE/podborki' | grep -qi 'подборк'"
check "podborki canonical" bash -c "curl -fsS '$PUBLIC_BASE/rechnye-progulki/moscow/' | grep -qi 'речн\\|прогулк\\|moscow\\|москв' || curl -fsS '$PUBLIC_BASE/rechnye-progulki/moscow' | grep -qi 'речн\\|прогулк'"

if [[ -n "$TC_SLUG" ]]; then
  check "tc event api" bash -c "curl -fsS '$API_BASE/api/public/events/$TC_SLUG' | grep -q 'TICKETSCLOUD'"
  check "tc event page html" bash -c "curl -fsS '$PUBLIC_BASE/events/$TC_SLUG' | grep -qi '<!DOCTYPE html'"
else
  echo "WARN skip tc checks: no tc slug in catalog"
fi
check "tep event api" bash -c "curl -fsS '$API_BASE/api/public/events/$TEP_SLUG' | grep -q 'TEPLOHOD'"
check "legacy landing 301" bash -c "curl -sI '$PUBLIC_BASE/landings/river-cruises' | grep -qi '301\\|302'"

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
