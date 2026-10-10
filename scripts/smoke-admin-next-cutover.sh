#!/usr/bin/env bash
# Smoke F4.1c admin.daibilet.ru Next cutover (run on prod or with tunnel).
set -euo pipefail

ADMIN_HOST="${ADMIN_HOST:-admin.daibilet.ru}"
WEB_BASE="${WEB_BASE:-http://127.0.0.1:3001}"
USER_NAME="${ADMIN_EMAIL:-${ADMIN_USER:-}}"
PASS="${ADMIN_PASSWORD:-}"

if [[ -z "$USER_NAME" || -z "$PASS" ]]; then
  echo "Need ADMIN_EMAIL/ADMIN_USER + ADMIN_PASSWORD"
  exit 1
fi

smoke() {
  local path="$1"
  local code
  code="$(curl -sS -o /tmp/admin-smoke-body.html -w '%{http_code}' -u "${USER_NAME}:${PASS}" \
    -H "Host: ${ADMIN_HOST}" "${WEB_BASE}${path}")"
  echo "$path → HTTP $code"
  if [[ "$code" != "200" ]]; then
    head -c 400 /tmp/admin-smoke-body.html || true
    echo
    return 1
  fi
}

smoke "/"
smoke "/admin"
smoke "/events"
smoke "/sources"
smoke "/settings"

echo "OK: admin host Next rewrite smoke passed"
echo "Manual: open https://${ADMIN_HOST}/ and https://${ADMIN_HOST}/legacy/ (Vite deep CRUD)"
