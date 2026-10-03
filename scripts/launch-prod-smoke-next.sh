#!/usr/bin/env bash
# F3 prod smoke for Next public.
set -euo pipefail

PUBLIC_BASE="${PUBLIC_BASE:-https://daibilet.ru}"
API_BASE="${API_BASE:-http://127.0.0.1:4000}"
WEB_BASE="${WEB_BASE:-http://127.0.0.1:3001}"

export PUBLIC_BASE API_BASE WEB_BASE
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec bash "$ROOT_DIR/scripts/launch-staging-smoke-next.sh"
