#!/usr/bin/env bash
# Pre-deploy readiness: typecheck, builds, Prisma validate (no prod data changes).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== deploy preflight =="

fail=0
run() {
  local name="$1"
  shift
  echo ""
  echo "-- $name"
  if "$@"; then
    echo "OK  $name"
  else
    echo "FAIL $name"
    fail=$((fail + 1))
  fi
}

run "pnpm install --frozen-lockfile" corepack pnpm install --frozen-lockfile
run "db:generate" npx prisma generate --schema packages/db/prisma/schema.prisma
run "db:validate" corepack pnpm --filter @daibilet/db db:validate
run "backend typecheck" corepack pnpm --filter @daibilet/backend typecheck
run "admin build" corepack pnpm --filter @tours/admin build
run "web typecheck" corepack pnpm --filter @daibilet/web typecheck
run "web build" corepack pnpm --filter @daibilet/web build

echo ""
if [[ "$fail" -gt 0 ]]; then
  echo "preflight FAILED ($fail steps)"
  exit 1
fi
echo "preflight OK — ready for deploy/smoke"
