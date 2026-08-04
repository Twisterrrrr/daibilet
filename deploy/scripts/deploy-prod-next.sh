#!/usr/bin/env bash
# F3 prod deploy (MSK-only canon 2026-08-01): feat/next-monorepo
# → Next apps/web :3001 + legacy API :4000 on daibilet-msk (201.24.125.184).
#
# Run ON the catalog host (ssh daibilet-msk). Do NOT build on SPB .16 / Intelligent Hoopoe
# (retired from pipeline; owner deletes that VM in Timeweb).
#
# Deploy discipline (CPU/RAM):
# - One controlled restart sequence only: stop web -> build -> restart api -> start web.
# - Do NOT batch-restart unrelated units (staging, docker stacks, timers) in the same pass.
# - Avoid back-to-back deploys that re-trigger TEP startup sync; prefer TEP_AUTO_SYNC_ENABLED=0 + cron.
#
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/daibilet}"
ADMIN_DIR="${ADMIN_DIR:-/var/www/daibilet/admin}"
ADMIN_LEGACY_DIR="${ADMIN_LEGACY_DIR:-/var/www/daibilet/legacy}"
API_SERVICE="${API_SERVICE:-daibilet-api}"
WEB_SERVICE="${WEB_SERVICE:-daibilet-web}"
BRANCH="${BRANCH:-feat/next-monorepo}"
WEB_PORT="${DAIBILET_WEB_PORT:-3001}"
APPLY_ADMIN_NGINX_PATCH="${APPLY_ADMIN_NGINX_PATCH:-1}"

cd "$APP_DIR"

# 4GB VPS: prefer cache reclaim over aggressive swap (idempotent; no-op without root).
apply_vm_swappiness() {
  local target=10
  command -v sysctl >/dev/null 2>&1 || return 0
  local current
  current="$(sysctl -n vm.swappiness 2>/dev/null || true)"
  if [[ -n "$current" && "$current" != "$target" ]]; then
    sysctl -w "vm.swappiness=${target}" 2>/dev/null \
      || echo "Note: vm.swappiness runtime set skipped (no root?)"
  fi
  if [[ -r /etc/sysctl.conf ]] && ! grep -qE '^[[:space:]]*vm\.swappiness[[:space:]]*=' /etc/sysctl.conf 2>/dev/null; then
    if [[ -w /etc/sysctl.conf ]]; then
      echo "vm.swappiness=${target}" >> /etc/sysctl.conf
      echo "Persisted vm.swappiness=${target} in /etc/sysctl.conf"
    elif command -v sudo >/dev/null 2>&1; then
      echo "vm.swappiness=${target}" | sudo tee -a /etc/sysctl.conf >/dev/null 2>&1 \
        && echo "Persisted vm.swappiness=${target} via sudo" \
        || echo "Note: vm.swappiness persist skipped (no sudo?)"
    fi
  fi
}
apply_vm_swappiness

if [[ -f ".env" ]]; then
  sed -i 's/^ADMIN_AUTH_REALM=Daibilet admin/ADMIN_AUTH_REALM="Daibilet admin"/' .env 2>/dev/null || true
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

# Re-exec after pull so post-build steps (cache clear / revalidate) match the
# version on the branch — bash otherwise keeps running the pre-pull script body.
if [[ "${DAIBILET_DEPLOY_REEXEC:-}" != "1" ]]; then
  export DAIBILET_DEPLOY_REEXEC=1
  exec bash "$APP_DIR/deploy/scripts/deploy-prod-next.sh" "$@"
fi

# INC.504.23: exclusive deploy lock + active marker so minutely SSR healthcheck
# does not SIGKILL+start mid-build (ENOENT prerender-manifest → crash-loop 502).
mkdir -p /var/lock
DEPLOY_LOCK="${DAIBILET_WEB_DEPLOY_LOCK:-/var/lock/daibilet-web-deploy.lock}"
DEPLOY_ACTIVE="${DAIBILET_WEB_DEPLOY_ACTIVE:-/var/lock/daibilet-web-deploy.active}"
exec 9>"$DEPLOY_LOCK"
if ! flock -n 9; then
  echo "ERROR: another deploy holds ${DEPLOY_LOCK} (owner: $(cat "${DEPLOY_ACTIVE}" 2>/dev/null || echo unknown))"
  exit 75
fi
# Drop stale ad-hoc /tmp locks from older wrappers (non-flock markers).
rm -f /tmp/daibilet-web-deploy.lock /tmp/daibilet-web-deploy.lock.owner 2>/dev/null || true
echo "pid=$$ host=$(hostname) at=$(date -u +%FT%TZ) branch=${BRANCH}" >"$DEPLOY_ACTIVE"
clear_deploy_active() {
  rm -f "$DEPLOY_ACTIVE" 2>/dev/null || true
}
trap clear_deploy_active EXIT
echo "Deploy lock acquired (${DEPLOY_LOCK}); healthcheck will SKIP while ${DEPLOY_ACTIVE} exists"

corepack enable 2>/dev/null || true
corepack prepare pnpm@11.7.0 --activate 2>/dev/null || true

pnpm install --frozen-lockfile 2>/dev/null || pnpm install

export NEXT_PUBLIC_TC_WIDGET_TOKEN="${NEXT_PUBLIC_TC_WIDGET_TOKEN:-$TICKETSCLOUD_WIDGET_TOKEN}"
export NEXT_PUBLIC_TEP_WIDGET_ID="${NEXT_PUBLIC_TEP_WIDGET_ID:-$TEP_WIDGET_ID}"
grep -q "^DAIBILET_WEB_PORT=" .env 2>/dev/null || echo "DAIBILET_WEB_PORT=$WEB_PORT" >> .env
grep -q "^NEXT_PUBLIC_TEP_WIDGET_ID=" .env 2>/dev/null || echo "NEXT_PUBLIC_TEP_WIDGET_ID=${TEP_WIDGET_ID:-14208}" >> .env
if ! grep -q "^NEXT_PUBLIC_TC_WIDGET_TOKEN=" .env 2>/dev/null; then
  echo "NEXT_PUBLIC_TC_WIDGET_TOKEN=${TICKETSCLOUD_WIDGET_TOKEN:-}" >> .env
fi
# F4.1c: deep CRUD Vite under admin.daibilet.ru/legacy
if ! grep -q "^NEXT_PUBLIC_VITE_ADMIN_URL=" .env 2>/dev/null; then
  echo "NEXT_PUBLIC_VITE_ADMIN_URL=https://admin.daibilet.ru/legacy" >> .env
fi
if ! grep -q "^NEXT_PUBLIC_ADMIN_URL=" .env 2>/dev/null; then
  echo "NEXT_PUBLIC_ADMIN_URL=https://admin.daibilet.ru" >> .env
fi
# Keep DAIBILET_ADMIN_API_URL for server-side admin fetches (default 127.0.0.1:4000).
if ! grep -q "^DAIBILET_ADMIN_API_URL=" .env 2>/dev/null; then
  echo "DAIBILET_ADMIN_API_URL=http://127.0.0.1:4000" >> .env
fi
# CF.P1b/P2: finance projection from catalog web SSR (fail-soft if unreachable)
if ! grep -q "^FINANCE_API_BASE_URL=" .env 2>/dev/null; then
  echo "FINANCE_API_BASE_URL=https://finance-api.daibilet.ru" >> .env
fi
if ! grep -q "^FINANCE_API_HOST=" .env 2>/dev/null; then
  echo "FINANCE_API_HOST=finance-api.daibilet.ru" >> .env
fi
if ! grep -q "^FINANCE_CHECKOUT_BASE_URL=" .env 2>/dev/null; then
  echo "FINANCE_CHECKOUT_BASE_URL=https://pay.daibilet.ru" >> .env
fi
if ! grep -q "^NEXT_PUBLIC_FINANCE_CHECKOUT_BASE_URL=" .env 2>/dev/null; then
  echo "NEXT_PUBLIC_FINANCE_CHECKOUT_BASE_URL=https://pay.daibilet.ru" >> .env
fi
# Prefer pay host if a leftover checkout. alias is still in .env
if grep -qE '^FINANCE_CHECKOUT_BASE_URL=.*checkout\.daibilet\.ru' .env 2>/dev/null; then
  sed -i 's|^FINANCE_CHECKOUT_BASE_URL=.*|FINANCE_CHECKOUT_BASE_URL=https://pay.daibilet.ru|' .env
fi
if grep -qE '^NEXT_PUBLIC_FINANCE_CHECKOUT_BASE_URL=.*checkout\.daibilet\.ru' .env 2>/dev/null; then
  sed -i 's|^NEXT_PUBLIC_FINANCE_CHECKOUT_BASE_URL=.*|NEXT_PUBLIC_FINANCE_CHECKOUT_BASE_URL=https://pay.daibilet.ru|' .env
fi

# IndexNow (Yandex/Bing): generate once before web restart so EnvironmentFile picks it up.
if [[ -f .env ]] && ! grep -q '^INDEXNOW_KEY=' .env 2>/dev/null; then
  GENERATED_INDEXNOW_KEY="$(openssl rand -hex 16 2>/dev/null || python3 -c 'import secrets; print(secrets.token_hex(16))')"
  echo "INDEXNOW_KEY=${GENERATED_INDEXNOW_KEY}" >> .env
  echo "Generated INDEXNOW_KEY and appended to .env"
fi
if [[ -f .env ]]; then
  INDEXNOW_KEY="$(grep -E '^INDEXNOW_KEY=' .env | head -n1 | cut -d= -f2- | sed 's/^["'\'']//;s/["'\'']$//' || true)"
  export INDEXNOW_KEY
fi
# Host key at /{key}.txt (Yandex default) + stable /indexnow-key.txt route after build.
if [[ -n "${INDEXNOW_KEY:-}" ]]; then
  printf '%s' "$INDEXNOW_KEY" > "apps/web/public/${INDEXNOW_KEY}.txt"
  printf '%s' "$INDEXNOW_KEY" > "apps/web/public/indexnow-key.txt"
  echo "Wrote IndexNow key files under apps/web/public/"
fi

pnpm db:generate
pnpm db:deploy

# F4.6: do not build/rsync Vite admin to /legacy. Code may remain in monorepo.
echo "Skipping Vite admin build/deploy (F4.6 hard-retire /legacy)"

# Reap orphan next-build / jest-worker processes left by aborted deploys (PPID=1).
# Safe: only kill when cwd is under APP_DIR (or cmdline clearly daibilet web build).
reap_orphan_next_build_workers() {
  local phase="${1:-}"
  local killed=0
  local pid ppid cwd cmd
  echo "Reap orphan next-build workers (${phase}) under ${APP_DIR}..."
  while read -r pid ppid cmd; do
    [[ -n "${pid:-}" ]] || continue
    [[ "${ppid}" == "1" ]] || continue
    case " ${cmd} " in
      *'jest-worker'*|*'next/dist/build'*|*'next build'*|*'pnpm'*'web:build'*|*'npm'*'web:build'*) ;;
      *) continue ;;
    esac
    cwd="$(readlink -f "/proc/${pid}/cwd" 2>/dev/null || true)"
    if [[ -n "${cwd}" ]]; then
      case "${cwd}" in
        "${APP_DIR}"|"${APP_DIR}"/*) ;;
        *) continue ;;
      esac
    else
      # No /proc cwd (rare) — require daibilet path in cmdline.
      case " ${cmd} " in
        *'/opt/daibilet'*|*'apps/web'*) ;;
        *) continue ;;
      esac
    fi
    echo "  kill orphan pid=${pid} ppid=${ppid} cmd=${cmd}"
    kill "${pid}" 2>/dev/null || true
    killed=$((killed + 1))
  done < <(ps -eo pid=,ppid=,args= 2>/dev/null || true)
  # Give workers a moment, then SIGKILL leftovers matching same filter.
  if [[ "${killed}" -gt 0 ]]; then
    sleep 2
    while read -r pid ppid cmd; do
      [[ -n "${pid:-}" ]] || continue
      [[ "${ppid}" == "1" ]] || continue
      case " ${cmd} " in
        *'jest-worker'*|*'next/dist/build'*|*'next build'*) ;;
        *) continue ;;
      esac
      cwd="$(readlink -f "/proc/${pid}/cwd" 2>/dev/null || true)"
      case "${cwd}" in
        "${APP_DIR}"|"${APP_DIR}"/*) ;;
        *) continue ;;
      esac
      echo "  SIGKILL leftover pid=${pid}"
      kill -9 "${pid}" 2>/dev/null || true
    done < <(ps -eo pid=,ppid=,args= 2>/dev/null || true)
  fi
  echo "Reap done (${phase}): signaled ${killed} orphan(s)"
}

# Stop web BEFORE build. In-place `next build` rewrites apps/web/.next while
# `next start` is still up → clients see 400/ChunkLoadError on /_next/static
# (CSS + cities/%5Bslug%5D/page-*.js) until restart finishes.
if systemctl is-active --quiet "$WEB_SERVICE" 2>/dev/null; then
  systemctl stop "$WEB_SERVICE"
  echo "Stopped $WEB_SERVICE before web:build (avoid mid-build static 400s)"
fi

reap_orphan_next_build_workers "pre-build"

WEB_NEXT_DIR="apps/web/.next"
WEB_NEXT_PREV="apps/web/.next.prev"
# Keep last healthy build for rollback if web:build fails mid-SSG.
if [[ -f "${WEB_NEXT_DIR}/prerender-manifest.json" && -f "${WEB_NEXT_DIR}/BUILD_ID" ]]; then
  rm -rf "${WEB_NEXT_PREV}"
  cp -a "${WEB_NEXT_DIR}" "${WEB_NEXT_PREV}"
  echo "Saved healthy .next → .next.prev (BUILD_ID=$(cat "${WEB_NEXT_DIR}/BUILD_ID"))"
fi

# Heap cap for `next build` on MSK ~8Gi (also set in apps/web/scripts/next-build.mjs).
# Default 5120Mi (legacy SPB 3.8Gi used 2560). Override via NODE_OPTIONS if needed.
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=5120}"
# Cap event SSG (default 40). Override: EVENT_SSG_TOP_N=100 or 0 to skip.
export EVENT_SSG_TOP_N="${EVENT_SSG_TOP_N:-40}"
echo "web:build NODE_OPTIONS=${NODE_OPTIONS} EVENT_SSG_TOP_N=${EVENT_SSG_TOP_N}"

set +e
pnpm web:build
BUILD_RC=$?
set -e

if [[ "${BUILD_RC}" -ne 0 ]]; then
  echo "web:build FAILED (rc=${BUILD_RC}) — attempting restore from .next.prev"
  if [[ -f "${WEB_NEXT_PREV}/prerender-manifest.json" && -f "${WEB_NEXT_PREV}/BUILD_ID" ]]; then
    rm -rf "${WEB_NEXT_DIR}"
    cp -a "${WEB_NEXT_PREV}" "${WEB_NEXT_DIR}"
    echo "Restored .next from .next.prev (BUILD_ID=$(cat "${WEB_NEXT_DIR}/BUILD_ID"))"
    if systemctl is-enabled --quiet "$WEB_SERVICE" 2>/dev/null; then
      systemctl start "$WEB_SERVICE" || true
      echo "Started ${WEB_SERVICE} on restored .next"
    fi
  else
    echo "No healthy .next.prev to restore — site may stay down until next successful build"
  fi
  exit "${BUILD_RC}"
fi

reap_orphan_next_build_workers "post-build"

rm -rf apps/web/.next/cache
echo "Cleared apps/web/.next/cache"

if [[ ! -f "${WEB_NEXT_DIR}/prerender-manifest.json" || ! -f "${WEB_NEXT_DIR}/BUILD_ID" ]]; then
  echo "ERROR: post-build .next incomplete (missing prerender-manifest or BUILD_ID)"
  if [[ -f "${WEB_NEXT_PREV}/prerender-manifest.json" && -f "${WEB_NEXT_PREV}/BUILD_ID" ]]; then
    rm -rf "${WEB_NEXT_DIR}"
    cp -a "${WEB_NEXT_PREV}" "${WEB_NEXT_DIR}"
    echo "Restored .next from .next.prev (BUILD_ID=$(cat "${WEB_NEXT_DIR}/BUILD_ID"))"
  else
    echo "No healthy .next.prev — refusing to start web"
    exit 1
  fi
fi

if systemctl is-active --quiet "$API_SERVICE"; then
  systemctl restart "$API_SERVICE"
fi

if systemctl is-enabled --quiet "$WEB_SERVICE" 2>/dev/null; then
  systemctl reset-failed "$WEB_SERVICE" 2>/dev/null || true
  systemctl start "$WEB_SERVICE"
else
  echo "Warning: enable $WEB_SERVICE after first install"
fi

# Wait for Ready (healthcheck cold-start grace is 90s; keep deploy smoke tight).
WEB_READY=0
for _i in 1 2 3 4 5 6 7 8; do
  sleep 2
  if curl -fsS --max-time 3 "http://127.0.0.1:${WEB_PORT}/api/health" >/dev/null 2>&1; then
    WEB_READY=1
    echo "Next /api/health OK on :$WEB_PORT"
    break
  fi
done
if [[ "$WEB_READY" -ne 1 ]]; then
  echo "Warning: Next /api/health not OK after start retries — check journalctl -u $WEB_SERVICE"
fi
# Marker cleared by EXIT trap after remaining post-steps; keep it through warm/indexnow
# so healthcheck still skips during post-deploy load spikes.

# F4.6 nginx: admin.daibilet.ru → Next only (no /legacy)
if [[ "$APPLY_ADMIN_NGINX_PATCH" == "1" && -f "$APP_DIR/deploy/nginx/patch-prod-admin-next.py" ]]; then
  if python3 "$APP_DIR/deploy/nginx/patch-prod-admin-next.py"; then
    if nginx -t 2>/dev/null; then
      systemctl reload nginx && echo "nginx reloaded (admin Next-only, no /legacy)"
    else
      echo "Warning: nginx -t failed after admin patch — not reloading"
    fi
  else
    echo "Warning: patch-prod-admin-next.py failed"
  fi
fi

# Serve /images/* and /_next/static from disk (bypass Node + proxy_cache).
# AFTER admin patch: that script rewrites daibilet.conf and would drop these aliases.
NGINX_STATIC_PATCHED=0
for _patch in patch-prod-nginx-images-static.py patch-prod-nginx-next-static.py; do
  if [[ -f "$APP_DIR/deploy/nginx/$_patch" ]]; then
    if python3 "$APP_DIR/deploy/nginx/$_patch"; then
      NGINX_STATIC_PATCHED=1
    else
      echo "Warning: $_patch failed"
    fi
  fi
done
if [[ "$NGINX_STATIC_PATCHED" == "1" ]]; then
  if nginx -t 2>/dev/null; then
    systemctl reload nginx && echo "nginx reloaded (/images + /_next/static alias)"
  else
    echo "Warning: nginx -t failed after static alias patch — not reloading"
  fi
fi

# Admin smoke (Host rewrite + Basic Auth). Prefer ADMIN_PASSWORD; skip if missing.
ADMIN_SMOKE_USER="${ADMIN_EMAIL:-${ADMIN_USER:-}}"
ADMIN_SMOKE_PASS="${ADMIN_PASSWORD:-}"
if [[ -n "$ADMIN_SMOKE_USER" && -n "$ADMIN_SMOKE_PASS" ]]; then
  code="$(curl -sS -o /dev/null -w '%{http_code}' -u "${ADMIN_SMOKE_USER}:${ADMIN_SMOKE_PASS}" \
    -H "Host: admin.daibilet.ru" "http://127.0.0.1:${WEB_PORT}/" || true)"
  echo "Admin host rewrite smoke HTTP $code (expect 200)"
  code_events="$(curl -sS -o /dev/null -w '%{http_code}' -u "${ADMIN_SMOKE_USER}:${ADMIN_SMOKE_PASS}" \
    -H "Host: admin.daibilet.ru" "http://127.0.0.1:${WEB_PORT}/admin/events" || true)"
  echo "Admin /admin/events smoke HTTP $code_events (expect 200)"
  code_buyers="$(curl -sS -o /dev/null -w '%{http_code}' -u "${ADMIN_SMOKE_USER}:${ADMIN_SMOKE_PASS}" \
    -H "Host: admin.daibilet.ru" "http://127.0.0.1:${WEB_PORT}/admin/buyers" || true)"
  echo "Admin /admin/buyers smoke HTTP $code_buyers (expect 200)"
  code_legacy="$(curl -sS -o /dev/null -w '%{http_code}' -u "${ADMIN_SMOKE_USER}:${ADMIN_SMOKE_PASS}" \
    -H "Host: admin.daibilet.ru" "http://127.0.0.1:${WEB_PORT}/legacy/" || true)"
  echo "Admin /legacy smoke HTTP $code_legacy (expect 302 → /admin)"
else
  echo "Warning: ADMIN_EMAIL/PASSWORD missing — skip admin Basic Auth smoke"
fi

# Drop nginx HTML proxy cache so browsers don't get pre-deploy RSC/HTML pointing at deleted chunks.
# Reload first so old workers stop writing to cache paths, then clear, then reload again.
# Clearing cache while workers are active causes mkdir/unlink crit errors and HTTP/2 protocol errors.
mkdir -p /var/cache/nginx/daibilet
chown www-data:www-data /var/cache/nginx/daibilet
if [[ -d /var/cache/nginx/daibilet ]]; then
  if nginx -t 2>/dev/null; then
    systemctl reload nginx && sleep 1
  fi
  rm -rf /var/cache/nginx/daibilet/* || true
  echo "Cleared nginx proxy cache /var/cache/nginx/daibilet"
  if nginx -t 2>/dev/null; then
    systemctl reload nginx && echo "nginx reloaded after proxy cache clear"
  fi
fi

# Bust ISR / unstable_cache after deploy (same tags/paths as backend revalidate-next-home).
REVALIDATE_SECRET="${DAIBILET_NEXT_REVALIDATE_SECRET:-}"
if [[ -z "$REVALIDATE_SECRET" && -f .env ]]; then
  REVALIDATE_SECRET="$(grep -E '^DAIBILET_NEXT_REVALIDATE_SECRET=' .env | cut -d= -f2- | sed 's/^["'\'']//;s/["'\'']$//' || true)"
fi
if [[ -n "$REVALIDATE_SECRET" ]]; then
  curl -fsS -X POST "http://127.0.0.1:${WEB_PORT}/api/internal/revalidate" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${REVALIDATE_SECRET}" \
    -d '{"tags":["home-page","catalog-page","event-page","city-page"],"paths":["/","/events","/cities/sankt-peterburg","/cities/moscow","/rechnye-progulki","/avtobusnye-ekskursii","/api/public/stats"]}' \
    && echo "Post-deploy revalidate OK" \
    || echo "Warning: post-deploy revalidate failed"

  # PERF.E4: warm top-N event pages into Full Route Cache (default 200).
  if [[ "${SKIP_EVENT_WARM:-0}" != "1" ]]; then
    echo "Warming top event pages (EVENT_SSG_TOP_N=${EVENT_SSG_TOP_N:-200})..."
    DAIBILET_WEB_PORT="$WEB_PORT" \
      node "$APP_DIR/scripts/warm-top-event-pages.mjs" \
      && echo "Top event warm OK" \
      || echo "Warning: top event warm failed"
  fi

  # Hub HTML warm: /, /events, top cities (nginx + Next Full Route Cache).
  if [[ "${SKIP_HUB_WARM:-0}" != "1" ]]; then
    echo "Warming hub pages..."
    DAIBILET_WEB_PORT="$WEB_PORT" \
      node "$APP_DIR/scripts/warm-hub-pages.mjs" \
      && echo "Hub warm OK" \
      || echo "Warning: hub warm failed"
  fi

  # IndexNow: curated TOP paths only (not full catalog). Requires INDEXNOW_KEY in web env.
  if [[ -n "${INDEXNOW_KEY:-}" ]]; then
    curl -fsS -X POST "http://127.0.0.1:${WEB_PORT}/api/internal/indexnow" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${REVALIDATE_SECRET}" \
      -d '{"deployWarm":true,"reason":"deploy-prod-next"}' \
      && echo "Post-deploy IndexNow OK" \
      || echo "Warning: post-deploy IndexNow failed"
  else
    echo "Warning: INDEXNOW_KEY missing — skip IndexNow notify"
  fi
else
  echo "Warning: DAIBILET_NEXT_REVALIDATE_SECRET missing — skip revalidate/IndexNow"
fi

echo "F3 prod deploy complete → ${PUBLIC_SITE_URL:-https://daibilet.ru} (branch: $BRANCH, Next :$WEB_PORT)"