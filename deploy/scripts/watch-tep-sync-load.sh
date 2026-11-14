#!/usr/bin/env bash
# Watch host load around Teplohod auto-sync / cache warm.
# Usage:
#   APP_DIR=/opt/daibilet bash deploy/scripts/watch-tep-sync-load.sh
#   APP_DIR=/opt/daibilet DURATION_SEC=300 bash deploy/scripts/watch-tep-sync-load.sh
# Schedule near next sync window:
#   echo "APP_DIR=/opt/daibilet DURATION_SEC=900 /opt/daibilet/deploy/scripts/watch-tep-sync-load.sh" | at -t $(date -u -d 'tomorrow 00:04' +%Y%m%d%H%M 2>/dev/null || date -u -v+1d -v0H -v4M +%Y%m%d%H%M)
set -euo pipefail

LOG_DIR="${LOG_DIR:-/var/log/daibilet}"
DURATION_SEC="${DURATION_SEC:-180}"
INTERVAL_SEC="${INTERVAL_SEC:-5}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${LOG_DIR}/tep-sync-load-${STAMP}.log"

mkdir -p "$LOG_DIR"
exec > >(tee -a "$OUT") 2>&1

echo "=== watch-tep-sync-load start utc=$(date -u -Iseconds) duration=${DURATION_SEC}s ==="
echo "--- free ---"
free -h
echo "--- swap ---"
swapon --show || true
echo "--- docker ---"
docker ps --format 'table {{.Names}}\t{{.Status}}' || true

end=$((SECONDS + DURATION_SEC))
while (( SECONDS < end )); do
  echo
  echo "=== sample utc=$(date -u -Iseconds) ==="
  free -h | sed -n '1,3p'
  echo "--- vmstat 1 3 ---"
  vmstat 1 3 || true
  echo "--- top node/next by RSS ---"
  ps -eo pid,rss,pcpu,cmd --sort=-rss | awk 'NR==1 || /next-server|server-entry|tep-import|tsx/ {print}' | head -20
  echo "--- systemd memory ---"
  systemctl show daibilet-api daibilet-web -p MemoryCurrent -p MemoryHigh -p MemoryMax -p NRestarts --no-pager 2>/dev/null || true
  sleep "$INTERVAL_SEC"
done

echo "=== watch-tep-sync-load end utc=$(date -u -Iseconds) log=$OUT ==="