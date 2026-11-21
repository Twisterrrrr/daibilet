#!/usr/bin/env bash
set -euo pipefail
pkill -f 'next/dist/bin/next build' 2>/dev/null || true
pkill -f 'next-build.mjs' 2>/dev/null || true
pkill -f 'pnpm --filter @daibilet/web build' 2>/dev/null || true
sleep 2
if pgrep -f 'next/dist/bin/next build' >/dev/null; then
  echo "WARN: build still running, abort"
  pgrep -af 'next/dist/bin/next build' || true
  exit 2
fi

systemctl stop daibilet-web || true
# Keep API up for health; web build uses in-process catalog.

cd /opt/daibilet
export NODE_OPTIONS=--max-old-space-size=5120
echo "BUILD_START $(date -Is)" | tee /tmp/web-build-landing-counts.log
set +e
flock /tmp/daibilet-web-build.lock pnpm --filter @daibilet/web build >> /tmp/web-build-landing-counts.log 2>&1
code=$?
set -e
echo "EXIT:$code" | tee -a /tmp/web-build-landing-counts.log
echo "BUILD_END $(date -Is)" | tee -a /tmp/web-build-landing-counts.log

if [[ "$code" -eq 0 && -f /opt/daibilet/apps/web/.next/prerender-manifest.json ]]; then
  systemctl start daibilet-web
  sleep 4
  systemctl is-active daibilet-web
  curl -sS -o /dev/null -w "home:%{http_code}\n" http://127.0.0.1:3001/ || true
  cat /opt/daibilet/apps/web/.next/BUILD_ID
else
  echo "BUILD_FAILED restoring .next.bak"
  cd /opt/daibilet/apps/web
  rm -rf .next
  cp -a .next.bak .next
  systemctl start daibilet-web
  exit "$code"
fi
