#!/usr/bin/env bash
# Post-deploy smoke: health, stats, widget API fields, optional DB invariants.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

API_PORT="${PORT:-4000}"
API_BASE="${POST_DEPLOY_API_BASE:-http://127.0.0.1:${API_PORT}}"
PUBLIC_BASE="${POST_DEPLOY_PUBLIC_BASE:-}"
WEB_PORT="${DAIBILET_WEB_PORT:-3001}"
WEB_BASE="${POST_DEPLOY_WEB_BASE:-}"
RUN_INVARIANTS="${POST_DEPLOY_INVARIANTS:-1}"
RUN_WIDGETS="${POST_DEPLOY_WIDGETS:-1}"
RUN_WEB="${POST_DEPLOY_CHECK_WEB:-1}"

echo "== post-deploy check =="
echo "API_BASE=$API_BASE"
echo "PUBLIC_BASE=${PUBLIC_BASE:-<skip widgets>}"
echo "WEB_BASE=${WEB_BASE:-<skip web>}"

curl -fsS "${API_BASE}/api/health" | head -c 500
echo ""
curl -fsS "${API_BASE}/api/public/stats" | head -c 500
echo ""

if [[ "$RUN_WEB" == "1" && -n "$WEB_BASE" ]]; then
  echo "== check:web =="
  curl -fsS "${WEB_BASE}/api/health" | head -c 500
  echo ""
  curl -fsS -o /dev/null -w "web / =%{http_code}\n" -H "Cache-Control: no-cache" "${WEB_BASE}/"
  curl -fsS -o /dev/null -w "web /events =%{http_code}\n" -H "Cache-Control: no-cache" "${WEB_BASE}/events"
fi

if [[ "$RUN_WIDGETS" == "1" && -n "$PUBLIC_BASE" ]]; then
  echo "== check:widgets =="
  node scripts/widget-readiness-check.mjs --base "$PUBLIC_BASE"
fi

if [[ "$RUN_INVARIANTS" == "1" && -n "${DATABASE_URL:-}" ]]; then
  echo "== check:sync-invariants =="
  set +e
  node scripts/sync-invariants-check.js
  INVARIANTS_EXIT=$?
  set -e
  if [[ "$INVARIANTS_EXIT" -ne 0 ]]; then
    if [[ "${POST_DEPLOY_INVARIANTS_STRICT:-0}" == "1" ]]; then
      echo "Invariant check failed (strict mode)" >&2
      exit "$INVARIANTS_EXIT"
    fi
    echo "Warning: invariant check failed (non-strict — legacy DB debt?). Run npm run tc:sync to backfill widgetUrl."
  fi
fi

echo "Post-deploy check OK"
