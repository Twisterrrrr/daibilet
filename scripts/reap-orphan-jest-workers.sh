#!/usr/bin/env bash
# Reap orphan next-build / jest-worker processes (PPID=1) left by aborted deploys.
# Safe: only kill when cwd is under APP_DIR (or cmdline clearly daibilet web build).
# Install cron: see deploy/cron/daibilet-reap-jest-workers
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/daibilet}"
phase="${1:-manual}"
killed=0

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) reap-orphan-jest-workers (${phase}) under ${APP_DIR}"

while read -r pid ppid cmd; do
  [[ -n "${pid:-}" ]] || continue
  [[ "${ppid}" == "1" ]] || continue
  case " ${cmd} " in
    *'jest-worker'*|*'next/dist/build'*|*'next build'*|*'pnpm'*'web:build'*|*'npm'*'web:build'*) ;;
    *) continue ;;
  esac
  cwd="$(readlink -f "/proc/${pid}/cwd" 2>/dev/null || true)"
  if [[ -n "${cwd}" ]]; then
    case "${cwd}" in
      "${APP_DIR}"|"${APP_DIR}"/*) ;;
      *) continue ;;
    esac
  else
    case " ${cmd} " in
      *'/opt/daibilet'*|*'apps/web'*) ;;
      *) continue ;;
    esac
  fi
  echo "  kill orphan pid=${pid} ppid=${ppid} cmd=${cmd}"
  kill "${pid}" 2>/dev/null || true
  killed=$((killed + 1))
done < <(ps -eo pid=,ppid=,args= 2>/dev/null || true)

if [[ "${killed}" -gt 0 ]]; then
  sleep 2
  while read -r pid ppid cmd; do
    [[ -n "${pid:-}" ]] || continue
    [[ "${ppid}" == "1" ]] || continue
    case " ${cmd} " in
      *'jest-worker'*|*'next/dist/build'*|*'next build'*) ;;
      *) continue ;;
    esac
    cwd="$(readlink -f "/proc/${pid}/cwd" 2>/dev/null || true)"
    case "${cwd}" in
      "${APP_DIR}"|"${APP_DIR}"/*) ;;
      *) continue ;;
    esac
    echo "  SIGKILL leftover pid=${pid}"
    kill -9 "${pid}" 2>/dev/null || true
  done < <(ps -eo pid=,ppid=,args= 2>/dev/null || true)
fi

echo "reap done (${phase}): signaled ${killed} orphan(s)"
