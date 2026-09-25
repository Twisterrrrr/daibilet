#!/usr/bin/env bash
set -euo pipefail
cd "${APP_DIR:-/opt/daibilet}"
exec 9>/var/lib/daibilet/indexnow/job.lock
flock -n 9 || exit 0
if [[ -f .env ]]; then set -a; source .env; set +a; fi
exec node scripts/indexnow-sitemaps.mjs "$@"
