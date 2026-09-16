#!/usr/bin/env bash
set -euo pipefail
# Kill every next/pnpm web build hard, then one exclusive build.
for _ in 1 2 3 4 5; do
  pkill -9 -f '/apps/web/node_modules/next/dist/bin/next build' 2>/dev/null || true
  pkill -9 -f 'scripts/next-build.mjs' 2>/dev/null || true
  pkill -9 -f 'pnpm --filter @daibilet/web build' 2>/dev/null || true
  sleep 1
done
if pgrep -f '/apps/web/node_modules/next/dist/bin/next build' >/dev/null 2>&1; then
  echo "STILL_RUNNING"
  pgrep -af next || true
  exit 2
fi
echo "CLEARED"
free -m | awk 'NR==2{print}'
systemctl stop daibilet-web || true
cd /opt/daibilet/apps/web
# Preserve last good build
if [[ -f .next/prerender-manifest.json ]]; then
  rm -rf .next.bak-pre-landing-counts
  cp -a .next .next.bak-pre-landing-counts
elif [[ -d .next.bak ]]; then
  rm -rf .next
  cp -a .next.bak .next
fi
cd /opt/daibilet
export NODE_OPTIONS=--max-old-space-size=5120
echo "BUILD_START $(date -Is)" > /tmp/web-build-landing-counts.log
set +e
pnpm --filter @daibilet/web build >> /tmp/web-build-landing-counts.log 2>&1
code=$?
set -e
echo "EXIT:$code" >> /tmp/web-build-landing-counts.log
echo "BUILD_END $(date -Is)" >> /tmp/web-build-landing-counts.log
if [[ "$code" -eq 0 && -f apps/web/.next/prerender-manifest.json ]]; then
  systemctl start daibilet-api || true
  systemctl start daibilet-web
  sleep 5
  systemctl is-active daibilet-web | tee -a /tmp/web-build-landing-counts.log
  curl -sS -o /dev/null -w "home:%{http_code}\n" http://127.0.0.1:3001/ | tee -a /tmp/web-build-landing-counts.log
  cat apps/web/.next/BUILD_ID | tee -a /tmp/web-build-landing-counts.log
  exit 0
fi
echo "FAIL restore" >> /tmp/web-build-landing-counts.log
cd /opt/daibilet/apps/web
rm -rf .next
if [[ -d .next.bak-pre-landing-counts ]]; then
  cp -a .next.bak-pre-landing-counts .next
else
  cp -a .next.bak .next
fi
systemctl start daibilet-api || true
systemctl start daibilet-web
exit "$code"
