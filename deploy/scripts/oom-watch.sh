#!/usr/bin/env bash
# Hourly OOM / kill skim for daibilet units. Append-only log.
# Cron: 7 * * * * /opt/daibilet/deploy/scripts/oom-watch.sh
set -euo pipefail
LOG_DIR="${LOG_DIR:-/var/log/daibilet}"
OUT="${LOG_DIR}/oom-watch.log"
mkdir -p "$LOG_DIR"
{
  echo "=== $(date -u -Iseconds) ==="
  journalctl -u daibilet-web -u daibilet-api --since "65 min ago" -p err --no-pager 2>/dev/null | grep -iE 'oom|killed process|Memory cgroup|out of memory' || echo "(no OOM/err matches)"
} >> "$OUT"