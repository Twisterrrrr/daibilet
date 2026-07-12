#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/daibilet}"
PUBLIC_APP_FILTER="${PUBLIC_APP_FILTER:-@daibilet/public}"
PUBLIC_PORT="${PUBLIC_PORT:-3000}"

cd "$APP_DIR"

PUBLIC_SCRIPT="$(
  PUBLIC_APP_FILTER="$PUBLIC_APP_FILTER" node --input-type=module <<'NODE'
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const filter = process.env.PUBLIC_APP_FILTER || '@daibilet/public';
const packageRoots = ['apps', 'packages'];

for (const packageRoot of packageRoots) {
  const dir = path.join(root, packageRoot);
  if (!fs.existsSync(dir)) continue;

  for (const child of fs.readdirSync(dir)) {
    const packagePath = path.join(dir, child, 'package.json');
    if (!fs.existsSync(packagePath)) continue;

    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    if (pkg.name !== filter) continue;

    if (pkg.scripts?.preview) {
      console.log('preview');
      process.exit(0);
    }
    if (pkg.scripts?.start) {
      console.log('start');
      process.exit(0);
    }

    console.error(`${filter} must define preview or start script`);
    process.exit(1);
  }
}

console.error(`Cannot find public package ${filter}`);
process.exit(1);
NODE
)"

export PORT="$PUBLIC_PORT"
exec pnpm --filter "$PUBLIC_APP_FILTER" "$PUBLIC_SCRIPT"
