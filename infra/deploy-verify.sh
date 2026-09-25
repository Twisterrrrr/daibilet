#!/usr/bin/env bash
# Usage: deploy-verify.sh <full_sha> [literal_html_marker]
# MSK_SSH_TARGET defaults to msk-web; MSK_SSH_KEY_FILE selects a private key.
# BUILD_ID optionally enforces the exact CI build ID as well as the SHA.
set -euo pipefail
EXPECTED_SHA="${1:?usage: deploy-verify.sh <full_sha> [marker]}"
MARKER="${2:-}"
[[ "$EXPECTED_SHA" =~ ^[0-9a-f]{40}$ ]] || { echo 'FAIL: full SHA required'; exit 1; }
SSH=(ssh -o BatchMode=yes -o ConnectTimeout=15)
if [[ -n "${MSK_SSH_KEY_FILE:-}" ]]; then
  SSH+=(-i "$MSK_SSH_KEY_FILE" -o IdentitiesOnly=yes)
fi
TARGET="${MSK_SSH_TARGET:-${MSK_SSH_USER:+${MSK_SSH_USER}@}${MSK_SSH_HOST:-msk-web}}"
SERVER_INFO="$("${SSH[@]}" "$TARGET" 'set -eu; cd /opt/daibilet; cat apps/web/.next/BUILD_ID; git rev-parse HEAD; cat apps/web/.next/DEPLOY_SHA')"
mapfile -t INFO <<< "$SERVER_INFO"
[[ ${#INFO[@]} -eq 3 && -n "${INFO[0]}" ]] || { echo 'FAIL: missing build metadata'; exit 1; }
printf 'Expected SHA: %s\nServer BUILD_ID: %s\nServer HEAD: %s\nArtifact SHA: %s\n' "$EXPECTED_SHA" "${INFO[@]}"
[[ "${INFO[1]}" == "$EXPECTED_SHA" && "${INFO[2]}" == "$EXPECTED_SHA" ]] || { echo 'FAIL: SHA mismatch'; exit 1; }
[[ -z "${BUILD_ID:-}" || "${INFO[0]}" == "$BUILD_ID" ]] || { echo 'FAIL: BUILD_ID mismatch'; exit 1; }
HTML_FILE="$(mktemp)"
trap 'rm -f "$HTML_FILE"' EXIT
HTTP="$(curl -sS --max-time 30 -H 'Cache-Control: no-cache' -o "$HTML_FILE" -w '%{http_code}' "https://daibilet.ru/?deploy=$EXPECTED_SHA")"
[[ "$HTTP" == 200 ]] || { echo "FAIL: home HTTP $HTTP"; exit 1; }
if [[ -n "$MARKER" ]] && ! grep -Fq -- "$MARKER" "$HTML_FILE"; then
  echo "FAIL: literal marker missing: $MARKER (no automatic rollback)"
  exit 1
fi
echo "PASS: deploy verified SHA=$EXPECTED_SHA BUILD_ID=${INFO[0]}"
