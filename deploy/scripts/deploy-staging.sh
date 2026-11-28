#!/usr/bin/env bash
set -euo pipefail

echo "Refusing legacy Vite staging deploy: staging public is apps/web (Next.js)." >&2
echo "Use deploy/scripts/deploy-staging-next.sh." >&2
exit 1
