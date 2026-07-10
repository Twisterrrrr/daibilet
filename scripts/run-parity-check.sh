#!/usr/bin/env bash
# Compare legacy dto.js vs typed Prisma handlers (requires DATABASE_URL + migrated DB).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required for parity checks" >&2
  exit 1
fi

echo "== backend parity (legacy vs typed DTO) =="
npm run backend:catalog:parity
npm run backend:event:parity
npm run backend:city:parity
npm run backend:venue:parity
npm run backend:admin-events:parity
npm run backend:admin-orders:parity
echo "Parity checks OK"
