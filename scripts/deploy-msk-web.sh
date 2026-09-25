#!/usr/bin/env bash
# Run on MSK with the CI artifact; build remains in the workflow.
# Usage: ARTIFACT=... EXPECTED_BUILD_ID_FILE=... bash deploy-msk-web.sh <sha> <expected_ref>
set -euo pipefail
DEPLOY_SHA="${1:?usage: deploy-msk-web.sh <sha> <expected_ref>}"
EXPECTED_REF="${2:?expected_ref required}"
[[ "$DEPLOY_SHA" =~ ^[0-9a-f]{40}$ ]] || { echo 'ERROR: full SHA required'; exit 1; }
git check-ref-format "refs/heads/$EXPECTED_REF"
EXPECTED_BUILD_ID="$(cat "${EXPECTED_BUILD_ID_FILE:?expected build ID file required}")"
test -n "$EXPECTED_BUILD_ID"
echo "SHA=$DEPLOY_SHA expected_ref=$EXPECTED_REF host=$(hostname) time=$(date -u +%FT%TZ)"

APP_DIR="${APP_DIR:-/opt/daibilet}"
WEB_SERVICE="${WEB_SERVICE:-daibilet-web}"
API_SERVICE="${API_SERVICE:-daibilet-api}"
WEB_PORT="${DAIBILET_WEB_PORT:-3001}"
BRANCH="$EXPECTED_REF"
ARTIFACT="${ARTIFACT:-}"

cd "$APP_DIR"

# shellcheck source=deploy-runtime.sh
source "${APP_DIR}/deploy/scripts/deploy-runtime.sh"

if [[ -z "$ARTIFACT" || ! -f "$ARTIFACT" ]]; then
  echo "ERROR: ARTIFACT path required (readable .tgz of apps/web/.next)" >&2
  exit 2
fi

ensure_deploy_lock_dir
DEPLOY_LOCK="${DAIBILET_WEB_DEPLOY_LOCK:-$(deploy_lock_dir)/daibilet-web-deploy.lock}"
DEPLOY_ACTIVE="${DAIBILET_WEB_DEPLOY_ACTIVE:-$(deploy_lock_dir)/daibilet-web-deploy.active}"
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

# Past root deploys can leave .git/objects unwritable for deploy@.
if ! touch .git/objects/.daibilet-write-probe 2>/dev/null; then
  if sudo -n chown -R "$(whoami):$(id -gn)" .git 2>/dev/null; then
    echo "chown .git → $(whoami) (sudo)"
  else
    echo "WARN: .git not writable and sudo chown failed; fetch may fail" >&2
  fi
else
  rm -f .git/objects/.daibilet-write-probe
fi

# Fetch and validate before touching the running checkout or build.
if [[ "$(git rev-parse --is-shallow-repository)" == true ]]; then
  git fetch --unshallow origin
fi
git fetch origin "+refs/heads/$BRANCH:refs/remotes/origin/$BRANCH"
git cat-file -e "$DEPLOY_SHA^{commit}"
git merge-base --is-ancestor "$DEPLOY_SHA" "refs/remotes/origin/$BRANCH"
PREVIOUS_SHA="$(git rev-parse HEAD)"

WEB_NEXT_DIR="apps/web/.next"
WEB_NEXT_PREV="apps/web/.next.prev"
WEB_NEXT_STAGE="apps/web/.next.incoming"

rm_rf_deploy "$WEB_NEXT_STAGE"
mkdir -p "$WEB_NEXT_STAGE"

# Accept either tarball of .next/* or a top-level .next/ directory.
tar -xzf "$ARTIFACT" -C "$WEB_NEXT_STAGE"
if [[ -d "${WEB_NEXT_STAGE}/.next" ]]; then
  # tarball contained a .next folder
  rm_rf_deploy "${WEB_NEXT_STAGE}.tmp"
  mv "${WEB_NEXT_STAGE}/.next" "${WEB_NEXT_STAGE}.tmp"
  rm_rf_deploy "$WEB_NEXT_STAGE"
  mv "${WEB_NEXT_STAGE}.tmp" "$WEB_NEXT_STAGE"
fi

if [[ ! -f "${WEB_NEXT_STAGE}/prerender-manifest.json" || ! -f "${WEB_NEXT_STAGE}/BUILD_ID" ]]; then
  echo "ERROR: artifact .next incomplete (need prerender-manifest.json + BUILD_ID)" >&2
  rm_rf_deploy "$WEB_NEXT_STAGE"
  exit 1
fi

INCOMING_BUILD_ID="$(cat "${WEB_NEXT_STAGE}/BUILD_ID")"
echo "Incoming BUILD_ID=${INCOMING_BUILD_ID}"
test "$INCOMING_BUILD_ID" = "$EXPECTED_BUILD_ID" || { echo 'ERROR: incoming BUILD_ID mismatch'; exit 1; }
test "$(cat "$WEB_NEXT_STAGE/DEPLOY_SHA")" = "$DEPLOY_SHA" || { echo 'ERROR: artifact SHA mismatch'; exit 1; }
# Resolve the incoming commit independently before altering the running checkout.
test "$(git rev-parse "$DEPLOY_SHA^{commit}")" = "$DEPLOY_SHA"
git checkout --detach "$DEPLOY_SHA"
test "$(git rev-parse HEAD)" = "$DEPLOY_SHA"
sync_public_assets_deploy

# Enum expands (TEMPLE/BUS …) require a fresh Prisma client on MSK before API restart.
# Restart alone is not enough: node_modules/@prisma/client stays stale and
# `kind: { in: […, TEMPLE] }` 500s the whole /api/public/venues surface.
if [[ -f package.json ]]; then
  if command -v pnpm >/dev/null 2>&1; then
    pnpm db:generate
  else
    npx --yes prisma generate --schema packages/db/prisma/schema.prisma
  fi
  echo "Prisma client regenerated for API"
fi

if systemctl_deploy is-active --quiet "$WEB_SERVICE" 2>/dev/null; then
  systemctl_deploy stop "$WEB_SERVICE"
  echo "Stopped ${WEB_SERVICE} for atomic swap"
fi

if [[ -f "${WEB_NEXT_DIR}/prerender-manifest.json" && -f "${WEB_NEXT_DIR}/BUILD_ID" ]]; then
  rm_rf_deploy "${WEB_NEXT_PREV}"
  mv "${WEB_NEXT_DIR}" "${WEB_NEXT_PREV}"
  echo "Saved previous .next → .next.prev (BUILD_ID=$(cat "${WEB_NEXT_PREV}/BUILD_ID"))"
else
  rm_rf_deploy "${WEB_NEXT_DIR}"
fi

mv "$WEB_NEXT_STAGE" "$WEB_NEXT_DIR"
rm_rf_deploy "${WEB_NEXT_DIR}/cache" || true
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

if systemctl_deploy is-active --quiet "$API_SERVICE" 2>/dev/null; then
  systemctl_deploy restart "$API_SERVICE"
  echo "Restarted ${API_SERVICE} after git sync (backend TS may have changed)"
fi

systemctl_deploy reset-failed "$WEB_SERVICE" 2>/dev/null || true
if ! systemctl_deploy start "$WEB_SERVICE"; then
  echo "WARN: web start failed; checking home before rollback"
fi

purge_nginx_proxy_cache
WEB_READY=0
for _i in 1 2 3 4 5 6 7 8 9 10; do
  sleep 2
  if [[ "$(curl -sS --max-time 10 -o /dev/null -w '%{http_code}' -H 'Cache-Control: no-cache' "https://daibilet.ru/?deploy=$DEPLOY_SHA" || true)" == 200 ]]; then
    WEB_READY=1
    echo "Public home HTTP 200"
    break
  fi
done
if [[ "$WEB_READY" -ne 1 ]]; then
  echo "ERROR: health not OK after swap — restoring .next.prev if present"
  if [[ -f "${WEB_NEXT_PREV}/prerender-manifest.json" && -f "${WEB_NEXT_PREV}/BUILD_ID" ]]; then
    systemctl_deploy stop "$WEB_SERVICE" 2>/dev/null || true
    rm_rf_deploy "${WEB_NEXT_DIR}"
    mv "${WEB_NEXT_PREV}" "${WEB_NEXT_DIR}"
    git checkout --detach "$PREVIOUS_SHA"
    sync_public_assets_deploy
    systemctl_deploy start "$WEB_SERVICE" || true
    echo "Restored BUILD_ID=$(cat "${WEB_NEXT_DIR}/BUILD_ID")"
  fi
  exit 1
fi

curl -fsS -o /dev/null -w "smoke / =%{http_code}\n" -H "Cache-Control: no-cache" "http://127.0.0.1:${WEB_PORT}/" || true

# Drop HTML soft-404 / ISR poison from nginx proxy_cache (only caches 200).
purge_nginx_proxy_cache

echo "Artifact swap complete → BUILD_ID=$(cat "${WEB_NEXT_DIR}/BUILD_ID") HEAD=$(git rev-parse --short HEAD)"

if [[ -n "${DEPLOY_MARKER:-}" ]]; then
  HTML_FILE="$(mktemp)"
  curl -fsS --max-time 30 -H 'Cache-Control: no-cache' "https://daibilet.ru/?deploy=$DEPLOY_SHA" > "$HTML_FILE"
  if ! grep -Fq -- "$DEPLOY_MARKER" "$HTML_FILE"; then
    rm -f "$HTML_FILE"
    echo 'ERROR: marker absent (no automatic rollback)'
    exit 1
  fi
  rm -f "$HTML_FILE"
fi
