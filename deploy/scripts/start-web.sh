#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

export NODE_ENV="${NODE_ENV:-production}"
export PORT="${DAIBILET_WEB_PORT:-3000}"

pnpm --filter @daibilet/db db:deploy
pnpm --filter @daibilet/web build
exec pnpm --filter @daibilet/web start
