#!/usr/bin/env bash
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/daibilet}"
cat > /etc/cron.d/daibilet-event-rewrite <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
17 * * * * root APP_DIR=$APP_DIR /bin/bash $APP_DIR/deploy/cron/rewrite-events.sh
EOF
chmod 644 /etc/cron.d/daibilet-event-rewrite
