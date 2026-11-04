#!/usr/bin/env bash
# Create a minimal isolated staging environment from the existing staging DB.
# Run as root on MSK. Never copies production API/payment/mail credentials.
set -euo pipefail

STAGING_DIR="${STAGING_DIR:-/opt/daibilet-staging}"
ENV_FILE="$STAGING_DIR/.env"
[[ -d "$STAGING_DIR" && "$(realpath -e "$STAGING_DIR")" == "$STAGING_DIR" ]] || exit 2
if [[ -e "$ENV_FILE" ]]; then
  echo "${ENV_FILE} already exists; leaving it unchanged"
  exit 0
fi

db_password="$(docker inspect daibilet-staging-postgres --format '{{range .Config.Env}}{{println .}}{{end}}' | sed -n 's/^POSTGRES_PASSWORD=//p')"
[[ -n "$db_password" ]] || { echo 'staging database password unavailable' >&2; exit 1; }
db_password_url="$(printf '%s' "$db_password" | python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.stdin.read(), safe=""))')"
admin_password="$(openssl rand -hex 24)"
jwt_secret="$(openssl rand -hex 32)"
umask 077
cat >"$ENV_FILE" <<EOF
NODE_ENV=production
PORT=4001
DAIBILET_WEB_PORT=3000
DATABASE_URL=postgresql://daibilet:${db_password_url}@127.0.0.1:5438/daibilet_staging
DAIBILET_API_INTERNAL_URL=http://127.0.0.1:4001
DAIBILET_PUBLIC_API_INTERNAL_URL=http://127.0.0.1:4001
DAIBILET_ADMIN_API_URL=http://127.0.0.1:4001
PUBLIC_SITE_URL=https://staging.daibilet.ru
DAIBILET_REQUIRE_ADMIN_AUTH=1
ADMIN_EMAIL=staging@daibilet.ru
ADMIN_PASSWORD=${admin_password}
USER_JWT_SECRET=${jwt_secret}
TEP_AUTO_SYNC_ENABLED=0
DAIBILET_CATALOG_REBUILD_MODE=off
DAIBILET_PUBLIC_STARTUP_WARM=0
TICKETSCLOUD_API_TOKEN=
TICKETSCLOUD_WIDGET_TOKEN=
NEXT_PUBLIC_TC_WIDGET_TOKEN=
TEP_WIDGET_ID=
NEXT_PUBLIC_TEP_WIDGET_ID=
EOF
chown deploy:deploy "$ENV_FILE"
chmod 600 "$ENV_FILE"
echo "Created ${ENV_FILE} with isolated staging DB and blank ticket/payment integrations"
