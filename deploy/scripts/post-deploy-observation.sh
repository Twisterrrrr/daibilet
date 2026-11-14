#!/usr/bin/env bash
# Snapshot production service health and bounded cache sizes after a deploy.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/daibilet}"
WEB_SERVICE="${WEB_SERVICE:-daibilet-web}"
API_SERVICE="${API_SERVICE:-daibilet-api}"
WEB_PORT="${DAIBILET_WEB_PORT:-3001}"
API_PORT="${DAIBILET_API_PORT:-4000}"
NEXT_DIR="$APP_DIR/apps/web/.next"

unit_value() {
  systemctl show "$1" -p "$2" --value 2>/dev/null || true
}

unit_active() {
  systemctl is-active "$1" 2>/dev/null || true
}

curl_probe() {
  local url="$1"
  local result
  if result="$(curl -sS --max-time 20 -o /dev/null -w '%{http_code} %{time_starttransfer}' "$url" 2>/dev/null)"; then
    printf '%s' "$result"
  else
    printf '000 0'
  fi
}

disk_used_pct="$(df -P / | awk 'NR == 2 {gsub(/%/, "", $5); print $5}')"
route_cache_bytes="$(du -sb "$NEXT_DIR/server/route-cache" 2>/dev/null | awk '{print $1}' || echo 0)"
fetch_cache_bytes="$(du -sb "$NEXT_DIR/cache/fetch-cache" 2>/dev/null | awk '{print $1}' || echo 0)"
image_cache_bytes="$(du -sb "$NEXT_DIR/cache/images" 2>/dev/null | awk '{print $1}' || echo 0)"
web_probe="$(curl_probe "http://127.0.0.1:${WEB_PORT}/robots.txt")"
api_probe="$(curl_probe "http://127.0.0.1:${API_PORT}/api/health")"

python3 - \
  "$(date -u +%FT%TZ)" \
  "$(unit_active "$WEB_SERVICE")" "$(unit_value "$WEB_SERVICE" NRestarts)" \
  "$(unit_value "$WEB_SERVICE" MemoryCurrent)" "$(unit_value "$WEB_SERVICE" MemoryHigh)" "$(unit_value "$WEB_SERVICE" MemoryMax)" \
  "$(unit_active "$API_SERVICE")" "$(unit_value "$API_SERVICE" NRestarts)" \
  "$(unit_value "$API_SERVICE" MemoryCurrent)" "$(unit_value "$API_SERVICE" MemoryHigh)" "$(unit_value "$API_SERVICE" MemoryMax)" \
  "$disk_used_pct" "$route_cache_bytes" "$fetch_cache_bytes" "$image_cache_bytes" "$web_probe" "$api_probe" <<'PY'
import json
import sys

(at, web_active, web_restarts, web_mem, web_high, web_max,
 api_active, api_restarts, api_mem, api_high, api_max,
 disk_pct, route_bytes, fetch_bytes, image_bytes, web_probe, api_probe) = sys.argv[1:]

def number(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None

def probe(value):
    status, _, ttfb = value.partition(' ')
    try:
        ttfb_seconds = float(ttfb)
    except ValueError:
        ttfb_seconds = None
    return {'status': number(status), 'ttfbSeconds': ttfb_seconds}

result = {
    'at': at,
    'web': {
        'active': web_active == 'active', 'restarts': number(web_restarts),
        'memoryBytes': number(web_mem), 'memoryHighBytes': number(web_high), 'memoryMaxBytes': number(web_max),
    },
    'api': {
        'active': api_active == 'active', 'restarts': number(api_restarts),
        'memoryBytes': number(api_mem), 'memoryHighBytes': number(api_high), 'memoryMaxBytes': number(api_max),
    },
    'diskUsedPercent': number(disk_pct),
    'cacheBytes': {'route': number(route_bytes), 'fetch': number(fetch_bytes), 'images': number(image_bytes)},
    'probes': {'webRobots': probe(web_probe), 'apiHealth': probe(api_probe)},
}
print('POST_DEPLOY_OBSERVATION ' + json.dumps(result, separators=(',', ':')))

checks = [
    result['web']['active'], result['api']['active'],
    result['probes']['webRobots']['status'] == 200, result['probes']['apiHealth']['status'] == 200,
    result['diskUsedPercent'] is not None and result['diskUsedPercent'] < 90,
    result['probes']['webRobots']['ttfbSeconds'] is not None and result['probes']['webRobots']['ttfbSeconds'] < 5,
    result['probes']['apiHealth']['ttfbSeconds'] is not None and result['probes']['apiHealth']['ttfbSeconds'] < 5,
]
if not all(checks):
    raise SystemExit('post-deploy service, disk, or TTFB gate failed')
PY
