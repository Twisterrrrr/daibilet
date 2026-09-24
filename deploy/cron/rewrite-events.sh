#!/usr/bin/env bash
set -euo pipefail
cd "${APP_DIR:-/opt/daibilet}"
mkdir -p /var/log/daibilet
exec node --env-file=.env scripts/rewrite-events.mjs --apply --batch-size=15 --max-events=150 >> /var/log/daibilet/rewrite-events.jsonl 2>&1
