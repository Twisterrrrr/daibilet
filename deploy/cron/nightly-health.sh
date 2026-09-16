#!/usr/bin/env bash
# Nightly: widget API + DB invariants. Install via deploy/cron/README.md
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/daibilet-staging}"
PUBLIC_BASE="${PUBLIC_BASE:-https://staging.daibilet.ru}"
LOG_DIR="${LOG_DIR:-/var/log/daibilet}"
LOG_FILE="$LOG_DIR/nightly-health.log"

mkdir -p "$LOG_DIR"
cd "$APP_DIR"

{
  echo "=== $(date -Is) nightly health ==="
  POST_DEPLOY_PUBLIC_BASE="$PUBLIC_BASE" \
  POST_DEPLOY_WEB_BASE="${POST_DEPLOY_WEB_BASE:-http://127.0.0.1:${DAIBILET_WEB_PORT:-3001}}" \
  POST_DEPLOY_INVARIANTS=1 \
  POST_DEPLOY_WIDGETS=1 \
  POST_DEPLOY_CHECK_WEB=1 \
  PORT="${PORT:-4000}" \
  bash scripts/post-deploy-check.sh
} >>"$LOG_FILE" 2>&1
