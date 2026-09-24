#!/usr/bin/env bash
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/daibilet}"
cat > /etc/cron.d/daibilet-webmaster-report <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
30 9 * * 1 root APP_DIR=$APP_DIR /bin/bash $APP_DIR/deploy/cron/webmaster-indexnow-report.sh
EOF
chmod 644 /etc/cron.d/daibilet-webmaster-report
