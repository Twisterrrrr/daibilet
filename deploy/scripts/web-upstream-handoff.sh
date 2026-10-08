#!/usr/bin/env bash
# Keep a warmed copy serving while the primary .next directory and service change.
SHADOW_WEB_PORT="${SHADOW_WEB_PORT:-3002}"
SHADOW_WEB_SERVICE="${SHADOW_WEB_SERVICE:-daibilet-web-deploy-shadow}"
SHADOW_WEB_DIR="${APP_DIR}/var/deploy-shadow/web"
DEPLOY_HANDOFF_DIR="${DEPLOY_HANDOFF_DIR:-${APP_DIR}/deploy/scripts}"

wait_nginx_workers_drained() {
  for ((attempt=0; attempt<120; attempt++)); do
    if ! pgrep -f '^nginx: worker process is shutting down' >/dev/null; then return 0; fi
    sleep 2
  done
  echo 'ERROR: nginx workers did not drain; leave the serving shadow running' >&2
  return 1
}

switch_web_upstream() {
  python3_deploy "${DEPLOY_HANDOFF_DIR}/switch-web-upstream.py" \
    --expected-port "$1" --target-port "$2"
  wait_nginx_workers_drained
}

prepare_web_shadow() {
  if ! systemctl_deploy is-active --quiet "$WEB_SERVICE"; then
    echo 'ERROR: primary web must be healthy before deploy handoff' >&2
    return 1
  fi
  if systemctl_deploy is-active --quiet "$SHADOW_WEB_SERVICE"; then
    echo 'ERROR: a previous web handoff is still serving; recover it before another deploy' >&2
    return 1
  fi
  if ss -H -ltn "sport = :${SHADOW_WEB_PORT}" | grep -q .; then
    echo 'ERROR: shadow port is already occupied' >&2
    return 1
  fi
  rm_rf_deploy "$SHADOW_WEB_DIR"
  mkdir -p "$SHADOW_WEB_DIR"
  sudo -n cp -al "${APP_DIR}/apps/web/.next" "${SHADOW_WEB_DIR}/.next" || return 1
  ln -s "${APP_DIR}/apps/web/public" "${SHADOW_WEB_DIR}/public"
  ln -s "${APP_DIR}/apps/web/node_modules" "${SHADOW_WEB_DIR}/node_modules"
  # A transient unit loads the production environment without printing credentials.
  sudo -n systemd-run --unit="$SHADOW_WEB_SERVICE" --collect \
    --uid=deploy --working-directory="$APP_DIR" \
    --property="EnvironmentFile=${APP_DIR}/.env" --property=MemoryMax=2G \
    --setenv=NODE_ENV=production --setenv=NODE_OPTIONS=--max-old-space-size=1536 \
    --setenv="APP_DIR=$APP_DIR" --setenv="SHADOW_WEB_DIR=$SHADOW_WEB_DIR" \
    --setenv="SHADOW_WEB_PORT=$SHADOW_WEB_PORT" --setenv=DAIBILET_CATALOG_REBUILD_MODE=child \
    /usr/bin/node "${DEPLOY_HANDOFF_DIR}/start-web-shadow.mjs"
  local ready=0
  for ((attempt=0; attempt<30; attempt++)); do
    if curl -fsS --max-time 10 "http://127.0.0.1:${SHADOW_WEB_PORT}/robots.txt" >/dev/null 2>&1; then ready=1; break; fi
    sleep 2
  done
  if [[ "$ready" != 1 ]] || ! curl -fsS --max-time 120 "http://127.0.0.1:${SHADOW_WEB_PORT}/" >/dev/null; then
    systemctl_deploy stop "$SHADOW_WEB_SERVICE" || true
    echo 'ERROR: shadow web did not become healthy; primary was not stopped' >&2
    return 1
  fi
}

start_web_handoff() {
  prepare_web_shadow || return 1
  switch_web_upstream "$WEB_PORT" "$SHADOW_WEB_PORT" || return 1
  echo 'Warmed shadow now serves public requests; primary can be swapped'
}

finish_web_handoff() {
  curl -fsS --max-time 30 "http://127.0.0.1:${WEB_PORT}/robots.txt" >/dev/null
  curl -fsS --max-time 120 "http://127.0.0.1:${WEB_PORT}/" >/dev/null
  switch_web_upstream "$SHADOW_WEB_PORT" "$WEB_PORT"
  systemctl_deploy stop "$SHADOW_WEB_SERVICE"
  rm_rf_deploy "$SHADOW_WEB_DIR"
  echo 'Primary web serves public requests; shadow drained and stopped'
}
