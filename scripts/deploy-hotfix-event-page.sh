#!/usr/bin/env bash
set -euo pipefail

systemctl stop daibilet-web-staging 2>/dev/null || true
systemctl stop daibilet-api-staging 2>/dev/null || true

cd /opt/daibilet
git pull origin feat/next-monorepo
pnpm web:build
systemctl restart daibilet-web daibilet-api

sleep 3
free -m
curl -sS -m 20 http://127.0.0.1:3001/ -o /dev/null -w "home:%{http_code} t:%{time_total}\n"
bash scripts/launch-prod-smoke-next.sh 2>&1 | tail -15
