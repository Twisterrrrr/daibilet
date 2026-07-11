#!/usr/bin/env bash
# Production start only — assumes `pnpm web:build` already ran (deploy).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

export NODE_ENV="${NODE_ENV:-production}"
export PORT="${DAIBILET_WEB_PORT:-3000}"
# Limit Node heap on 4GB VPS — avoids OOM killing nginx/api during traffic spikes.
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1024}"

exec pnpm --filter @daibilet/web start
