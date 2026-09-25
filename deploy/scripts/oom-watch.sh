#!/usr/bin/env bash
# Memory / OOM watch for daibilet units. Append-only skim + alert-only file.
# Cron (recommended): */5 * * * * /opt/daibilet/deploy/scripts/oom-watch.sh
set -euo pipefail

LOG_DIR="${LOG_DIR:-/var/log/daibilet}"
OUT="${LOG_DIR}/oom-watch.log"
ALERT_OUT="${LOG_DIR}/oom-watch-alerts.log"
SWAP_ALERT_MIB="${OOM_WATCH_SWAP_MIB:-350}"
MEM_HIGH_RATIO="${OOM_WATCH_MEM_HIGH_RATIO:-0.90}"
UNITS=(daibilet-web daibilet-api)

mkdir -p "$LOG_DIR"
ts="$(date -u -Iseconds)"
alerts=()

swap_used_mib=""
if [[ -r /proc/meminfo ]]; then
  swap_total_kb="$(awk '/^SwapTotal:/ {print $2}' /proc/meminfo)"
  swap_free_kb="$(awk '/^SwapFree:/ {print $2}' /proc/meminfo)"
  if [[ -n "${swap_total_kb:-}" && -n "${swap_free_kb:-}" ]]; then
    swap_used_mib=$(( (swap_total_kb - swap_free_kb) / 1024 ))
    if (( swap_used_mib > SWAP_ALERT_MIB )); then
      alerts+=("swap_used=${swap_used_mib}Mi>${SWAP_ALERT_MIB}Mi")
    fi
  fi
fi

unit_summary=()
for unit in "${UNITS[@]}"; do
  if ! systemctl is-active --quiet "$unit" 2>/dev/null; then
    unit_summary+=("${unit}=inactive")
    continue
  fi
  cur="$(systemctl show -p MemoryCurrent --value "$unit" 2>/dev/null || echo "")"
  high="$(systemctl show -p MemoryHigh --value "$unit" 2>/dev/null || echo "")"
  if [[ -n "$cur" && "$cur" =~ ^[0-9]+$ && -n "$high" && "$high" =~ ^[0-9]+$ && "$high" -gt 0 ]]; then
    thresh="$(awk -v h="$high" -v r="$MEM_HIGH_RATIO" 'BEGIN { printf "%.0f", h * r }')"
    cur_mib=$(( cur / 1024 / 1024 ))
    high_mib=$(( high / 1024 / 1024 ))
    unit_summary+=("${unit}=${cur_mib}Mi/${high_mib}Mi")
    if (( cur >= thresh )); then
      alerts+=("${unit}_mem=${cur_mib}Mi>=${MEM_HIGH_RATIO}*MemoryHigh(${high_mib}Mi)")
    fi
  else
    unit_summary+=("${unit}=n/a")
  fi
done

{
  echo "=== ${ts} ==="
  echo "swap_used_mib=${swap_used_mib:-n/a} units: ${unit_summary[*]:-none}"
  journalctl -u daibilet-web -u daibilet-api --since "12 min ago" -p err --no-pager 2>/dev/null \
    | grep -iE 'oom|killed process|Memory cgroup|out of memory' || echo "(no OOM/err matches)"
} >> "$OUT"

if (( ${#alerts[@]} > 0 )); then
  echo "${ts} ALERT ${alerts[*]} swap_used_mib=${swap_used_mib:-n/a}" >> "$ALERT_OUT"
fi
