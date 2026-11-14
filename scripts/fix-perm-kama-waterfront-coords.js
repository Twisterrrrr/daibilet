#!/usr/bin/env node
/**
 * Force Perm Kama waterfront Venue pins onto south-bank editorial coords.
 * Usage:
 *   node scripts/fix-perm-kama-waterfront-coords.js --dry-run
 *   node scripts/fix-perm-kama-waterfront-coords.js --apply
 */
const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

const rootDir = path.resolve(__dirname, '..');
const apply = process.argv.includes('--apply');

function loadRootEnv(dir) {
  for (const rel of ['.env', 'apps/backend/.env', 'packages/db/.env']) {
    const p = path.join(dir, rel);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!m || process.env[m[1]]) continue;
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

loadRootEnv(rootDir);

const PINS = [
  { slug: 'naberezhnaya-kamy', latitude: 58.01825, longitude: 56.2466 },
  { slug: 'perm-schaste-ne-za-gorami', latitude: 58.01835, longitude: 56.25055 },
];

async function main() {
  const url = process.env.DATABASE_URL || process.env.DIRECT_URL;
  if (!url) {
    console.error('No DATABASE_URL / DIRECT_URL');
    process.exit(1);
  }
  const requireFromDb = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'));
  const { Pool } = requireFromDb('pg');
  const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
  try {
    for (const pin of PINS) {
      const before = await pool.query(
        `select slug, latitude, longitude from "Venue" where slug = $1 limit 1`,
        [pin.slug],
      );
      const row = before.rows[0];
      console.log(
        JSON.stringify({
          slug: pin.slug,
          before: row || null,
          next: { latitude: pin.latitude, longitude: pin.longitude },
          apply,
        }),
      );
      if (!row || !apply) continue;
      await pool.query(
        `update "Venue" set latitude = $2, longitude = $3, "updatedAt" = now() where slug = $1`,
        [pin.slug, pin.latitude, pin.longitude],
      );
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
