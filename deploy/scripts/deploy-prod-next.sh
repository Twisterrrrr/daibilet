#!/usr/bin/env bash
# F3 prod deploy: feat/next-monorepo -> Next apps/web :3001 + legacy API :4000
#
# Deploy discipline (CPU/RAM on 3.8Gi):
# - One controlled restart sequence only: stop web -> restart api -> start web.
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

pnpm web:build

reap_orphan_next_build_workers "post-build"

rm -rf apps/web/.next/cache
echo "Cleared apps/web/.next/cache"

if systemctl is-active --quiet "$API_SERVICE"; then
  systemctl restart "$API_SERVICE"
fi

if systemctl is-enabled --quiet "$WEB_SERVICE" 2>/dev/null; then
  systemctl start "$WEB_SERVICE"
else
  echo "Warning: enable $WEB_SERVICE after first install"
fi

sleep 4
curl -fsS "http://127.0.0.1:${WEB_PORT}/api/health" >/dev/null && echo "Next /api/health OK on :$WEB_PORT"

# Serve /_next/static from disk (bypass Node + proxy_cache) — survives restarts.
if [[ -f "$APP_DIR/deploy/nginx/patch-prod-nginx-next-static.py" ]]; then
  if python3 "$APP_DIR/deploy/nginx/patch-prod-nginx-next-static.py"; then
    if nginx -t 2>/dev/null; then
      systemctl reload nginx && echo "nginx reloaded (/_next/static alias)"
    else
      echo "Warning: nginx -t failed after next-static patch — not reloading"
    fi
  else
    echo "Warning: patch-prod-nginx-next-static.py failed"
  fi
fi

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
if [[ -d /var/cache/nginx/daibilet ]]; then
  rm -rf /var/cache/nginx/daibilet/* || true
  echo "Cleared nginx proxy cache /var/cache/nginx/daibilet"
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
    -d '{"tags":["home-page","catalog-page","event-page"],"paths":["/","/events","/cities/sankt-peterburg","/cities/moscow","/rechnye-progulki","/avtobusnye-ekskursii","/api/public/stats"]}' \
    && echo "Post-deploy revalidate OK" \
    || echo "Warning: post-deploy revalidate failed"

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