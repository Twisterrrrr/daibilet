#!/usr/bin/env bash
# Production start only — assumes `pnpm web:build` already ran (deploy).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

WEB_NEXT_DIR="${ROOT}/apps/web/.next"
if [[ ! -f "${WEB_NEXT_DIR}/prerender-manifest.json" || ! -f "${WEB_NEXT_DIR}/BUILD_ID" ]]; then
  echo "ERROR: incomplete apps/web/.next (need prerender-manifest.json + BUILD_ID). Refusing next start (INC.504.23)." >&2
  exit 1
fi

export NODE_ENV="${NODE_ENV:-production}"
export PORT="${DAIBILET_WEB_PORT:-3000}"
# Limit Node heap on 4GB VPS — avoids OOM killing nginx/api during traffic spikes.
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1024}"

exec pnpm --filter @daibilet/web start
