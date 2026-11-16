#!/usr/bin/env bash
set -euo pipefail

echo "Refusing legacy Vite deploy: public production is apps/web (Next.js)." >&2
echo "Use deploy/scripts/deploy-prod-next.sh or the Deploy MSK web workflow." >&2
exit 1
