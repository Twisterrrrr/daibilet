#!/usr/bin/env bash
# One-second process CPU sample for correlating Timeweb peaks with services.
set -euo pipefail

stamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
load="$(cut -d ' ' -f 1-3 /proc/loadavg)"
available_kib="$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo)"
swap_free_kib="$(awk '/^SwapFree:/ {print $2}' /proc/meminfo)"
top_processes="$(nice -n 19 pidstat -u -h 1 1 | awk 'NF >= 10 && $3 ~ /^[0-9]+$/ && $8 + 0 >= 3 {printf "%s:%s:%.1f%% ", $10, $3, $8}' | cut -c 1-500)"
printf 'utc=%s load="%s" mem_available_mib=%s swap_free_mib=%s process_cpu="%s"\n' \
  "$stamp" "$load" "$((available_kib / 1024))" "$((swap_free_kib / 1024))" "$top_processes"
