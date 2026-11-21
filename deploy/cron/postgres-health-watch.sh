#!/usr/bin/env bash
# Postgres liveness alert (MSK catalog prod). Runs every 5 min and alerts the
# moment the daibilet-tours-postgres container is not running, instead of relying
# on the daily 04:35 UTC backup that silently logged the 16h outage of 2026-11-20.
#
# Cron (after install-postgres-health-watch.sh):
#   */5 * * * * root APP_DIR=/opt/daibilet /opt/daibilet/deploy/cron/postgres-health-watch.sh \
#     >> /var/log/daibilet/postgres-health-watch.log 2>&1
set -uo pipefail

CONTAINER="${PROD_PG_CONTAINER:-daibilet-tours-postgres}"

status="$(docker inspect --format '{{.State.Status}}' "$CONTAINER" 2>/dev/null || echo 'missing')"
if [[ "$status" == "running" ]]; then
  exit 0
fi

msg="$(date -u -Iseconds) ALERT postgres container '${CONTAINER}' not running (status=${status})"
echo "$msg"

# Reuse the crawler-monitor Telegram channel when configured.
if [[ -n "${TELEGRAM_BOT_TOKEN:-}" && -n "${TELEGRAM_CHAT_ID:-}" ]]; then
  curl -fsS --max-time 10 "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=Daibilet postgres ALERT: ${msg}" >/dev/null 2>&1 || true
fi

exit 1