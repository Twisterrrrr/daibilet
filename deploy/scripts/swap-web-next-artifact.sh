#!/usr/bin/env bash
# Atomic web .next swap from a prebuilt artifact (CI / remote builder).
# Run ON daibilet-msk. Does NOT run pnpm web:build.
#
# Usage:
#   ARTIFACT=/tmp/daibilet-web-next.tgz GIT_SHA=abc123 ./deploy/scripts/swap-web-next-artifact.sh
#
# Expects tarball of apps/web/.next contents (or a root folder named .next).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/daibilet}"
WEB_SERVICE="${WEB_SERVICE:-daibilet-web}"
API_SERVICE="${API_SERVICE:-daibilet-api}"
WEB_PORT="${DAIBILET_WEB_PORT:-3001}"
BRANCH="${BRANCH:-feat/next-monorepo}"
ARTIFACT="${ARTIFACT:-}"
GIT_SHA="${GIT_SHA:-}"

cd "$APP_DIR"

if [[ -z "$ARTIFACT" || ! -f "$ARTIFACT" ]]; then
  echo "ERROR: ARTIFACT path required (readable .tgz of apps/web/.next)" >&2
  exit 2
fi

mkdir -p /var/lock
DEPLOY_LOCK="${DAIBILET_WEB_DEPLOY_LOCK:-/var/lock/daibilet-web-deploy.lock}"
DEPLOY_ACTIVE="${DAIBILET_WEB_DEPLOY_ACTIVE:-/var/lock/daibilet-web-deploy.active}"
exec 9>"$DEPLOY_LOCK"
if ! flock -n 9; then
  echo "ERROR: another deploy holds ${DEPLOY_LOCK} (owner: $(cat "${DEPLOY_ACTIVE}" 2>/dev/null || echo unknown))"
  exit 75
fi
echo "pid=$$ host=$(hostname) at=$(date -u +%FT%TZ) mode=artifact-swap branch=${BRANCH}" >"$DEPLOY_ACTIVE"
clear_deploy_active() {
  rm -f "$DEPLOY_ACTIVE" 2>/dev/null || true
}
trap clear_deploy_active EXIT
echo "Deploy lock acquired (${DEPLOY_LOCK})"

git fetch origin "$BRANCH"
git checkout "$BRANCH"
if [[ -n "$GIT_SHA" ]]; then
  git reset --hard "$GIT_SHA"
else
  git pull --ff-only origin "$BRANCH"
fi
echo "HEAD=$(git rev-parse --short HEAD) ($(git rev-parse HEAD))"

# nginx serves /images/ from apps/web/public/images (gitignored); GHA only swaps .next.
# Sync etalon apps/public/public/images → web public after git reset.
if [[ -f apps/web/scripts/sync-public-assets.mjs ]]; then
  node apps/web/scripts/sync-public-assets.mjs
else
  echo "WARN: sync-public-assets.mjs missing — static /images/ may be stale"
fi

WEB_NEXT_DIR="apps/web/.next"
WEB_NEXT_PREV="apps/web/.next.prev"
WEB_NEXT_STAGE="apps/web/.next.incoming"

rm -rf "$WEB_NEXT_STAGE"
mkdir -p "$WEB_NEXT_STAGE"

# Accept either tarball of .next/* or a top-level .next/ directory.
tar -xzf "$ARTIFACT" -C "$WEB_NEXT_STAGE"
if [[ -d "${WEB_NEXT_STAGE}/.next" ]]; then
  # tarball contained a .next folder
  rm -rf "${WEB_NEXT_STAGE}.tmp"
  mv "${WEB_NEXT_STAGE}/.next" "${WEB_NEXT_STAGE}.tmp"
  rm -rf "$WEB_NEXT_STAGE"
  mv "${WEB_NEXT_STAGE}.tmp" "$WEB_NEXT_STAGE"
fi

if [[ ! -f "${WEB_NEXT_STAGE}/prerender-manifest.json" || ! -f "${WEB_NEXT_STAGE}/BUILD_ID" ]]; then
  echo "ERROR: artifact .next incomplete (need prerender-manifest.json + BUILD_ID)" >&2
  rm -rf "$WEB_NEXT_STAGE"
  exit 1
fi

INCOMING_BUILD_ID="$(cat "${WEB_NEXT_STAGE}/BUILD_ID")"
echo "Incoming BUILD_ID=${INCOMING_BUILD_ID}"

if systemctl is-active --quiet "$WEB_SERVICE" 2>/dev/null; then
  systemctl stop "$WEB_SERVICE"
  echo "Stopped ${WEB_SERVICE} for atomic swap"
fi

if [[ -f "${WEB_NEXT_DIR}/prerender-manifest.json" && -f "${WEB_NEXT_DIR}/BUILD_ID" ]]; then
  rm -rf "${WEB_NEXT_PREV}"
  mv "${WEB_NEXT_DIR}" "${WEB_NEXT_PREV}"
  echo "Saved previous .next → .next.prev (BUILD_ID=$(cat "${WEB_NEXT_PREV}/BUILD_ID"))"
else
  rm -rf "${WEB_NEXT_DIR}"
fi

mv "$WEB_NEXT_STAGE" "$WEB_NEXT_DIR"
rm -rf "${WEB_NEXT_DIR}/cache" 2>/dev/null || true
echo "Swapped .next (BUILD_ID=$(cat "${WEB_NEXT_DIR}/BUILD_ID"))"

# Soft-compat window: cached HTML (s-maxage / open tabs / SWR) still references
# previous hashed CSS/JS under /_next/static. Full .next replace would 404 those
# until clients refetch HTML. Merge previous static without overwriting new hashes.
if [[ -d "${WEB_NEXT_PREV}/static" && -d "${WEB_NEXT_DIR}/static" ]]; then
  for _sub in css chunks media; do
    if [[ -d "${WEB_NEXT_PREV}/static/${_sub}" ]]; then
      mkdir -p "${WEB_NEXT_DIR}/static/${_sub}"
      # -n: no-clobber (keep newly built hashes); -r: recursive for chunk dirs
      cp -rn "${WEB_NEXT_PREV}/static/${_sub}/." "${WEB_NEXT_DIR}/static/${_sub}/" 2>/dev/null || true
    fi
  done
  echo "Merged previous hashed static from .next.prev (css/chunks/media compat)"
fi

if systemctl is-active --quiet "$API_SERVICE" 2>/dev/null; then
  # Optional: keep API up; only restart if you need code sync in api process.
  true
fi

systemctl reset-failed "$WEB_SERVICE" 2>/dev/null || true
systemctl start "$WEB_SERVICE"

WEB_READY=0
for _i in 1 2 3 4 5 6 7 8 9 10; do
  sleep 2
  if curl -fsS --max-time 3 "http://127.0.0.1:${WEB_PORT}/api/health" >/dev/null 2>&1; then
    WEB_READY=1
    echo "Next /api/health OK on :${WEB_PORT}"
    break
  fi
done
if [[ "$WEB_READY" -ne 1 ]]; then
  echo "ERROR: health not OK after swap — restoring .next.prev if present"
  if [[ -f "${WEB_NEXT_PREV}/prerender-manifest.json" && -f "${WEB_NEXT_PREV}/BUILD_ID" ]]; then
    systemctl stop "$WEB_SERVICE" 2>/dev/null || true
    rm -rf "${WEB_NEXT_DIR}"
    mv "${WEB_NEXT_PREV}" "${WEB_NEXT_DIR}"
    systemctl start "$WEB_SERVICE" || true
    echo "Restored BUILD_ID=$(cat "${WEB_NEXT_DIR}/BUILD_ID")"
  fi
  exit 1
fi

curl -fsS -o /dev/null -w "smoke / =%{http_code}\n" -H "Cache-Control: no-cache" "http://127.0.0.1:${WEB_PORT}/" || true

# Drop HTML soft-404 / ISR poison from nginx proxy_cache (only caches 200).
# Without this, Yandex/crawlers keep seeing HTTP 200 for missing URLs for up to 30m.
if [[ -d /var/cache/nginx/daibilet ]]; then
  rm -rf /var/cache/nginx/daibilet/* || true
  echo "Purged nginx proxy_cache /var/cache/nginx/daibilet"
fi

echo "Artifact swap complete → BUILD_ID=$(cat "${WEB_NEXT_DIR}/BUILD_ID") HEAD=$(git rev-parse --short HEAD)"
