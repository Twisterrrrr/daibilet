#!/usr/bin/env bash
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/daibilet}"
install -d -m 755 /var/log/daibilet /var/lib/daibilet/indexnow /var/lib/daibilet/crawler-monitor
# Services currently run as root. Preserve shared budget access if run under deploy.
WEB_USER="$(systemctl show daibilet-web -p User --value)"
WEB_USER="${WEB_USER:-root}"
chown "$WEB_USER" /var/lib/daibilet/indexnow
chown "$WEB_USER" /var/lib/daibilet/crawler-monitor
cat > /etc/cron.d/daibilet-crawler-infra <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
7 * * * * root APP_DIR=$APP_DIR /bin/bash $APP_DIR/deploy/cron/crawler-log-monitor.sh
40 5 * * * $WEB_USER APP_DIR=$APP_DIR /bin/bash $APP_DIR/deploy/cron/indexnow-sitemaps.sh >> /var/log/daibilet/indexnow-sitemaps.log 2>&1
EOF
touch /var/log/daibilet/indexnow-sitemaps.log
chown "$WEB_USER" /var/log/daibilet/indexnow-sitemaps.log
chmod 644 /etc/cron.d/daibilet-crawler-infra
echo 'Installed crawler monitoring hourly and sitemap IndexNow daily at 05:40 server time.'
