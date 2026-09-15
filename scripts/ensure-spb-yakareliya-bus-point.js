#!/usr/bin/env node
/**
 * ЯКарелия boarding desk canon (owner 2026-08-09).
 * Not a museum - bus-tour meeting point at Kazanskaya 2, SPB.
 *
 * Usage (MSK):
 *   node scripts/ensure-spb-yakareliya-bus-point.js --dry-run
 *   node scripts/ensure-spb-yakareliya-bus-point.js --apply
 */
const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

const rootDir = path.resolve(__dirname, '..');
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'));
const { Pool } = requireFromDbPackage('pg');

const CANON_ID = 'venue_690af544c28f3978d69b62ba';
const CANON_SLUG = 'yakareliya-kazanskaya-ul-2';
const CANON = {
  title: 'ЯКарелия, Казанская ул., 2',
  address: 'Казанская ул., 2',
  kind: 'MEETING_POINT',
};

const dryRun = process.argv.includes('--dry-run') || !process.argv.includes('--apply');
const connectionString =
  process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet';

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const pool = new Pool({ connectionString, max: 2 });
  try {
    const before = await pool.query(
      `select id, slug, title, address, kind::text as kind, "pageStatus"::text as "pageStatus",
              "isIndexable"
       from "Venue"
       where id = $1 or slug = $2
       order by case when id = $1 then 0 else 1 end
       limit 1`,
      [CANON_ID, CANON_SLUG],
    );
    if (!before.rows[0]) throw new Error(`Venue not found: ${CANON_ID} / ${CANON_SLUG}`);
    const row = before.rows[0];
    console.log(
      JSON.stringify(
        {
          dryRun,
          before: row,
          after: {
            title: CANON.title,
            address: CANON.address,
            kind: CANON.kind,
            pageStatus: 'PUBLISHED',
            isIndexable: true,
          },
        },
        null,
        2,
      ),
    );

    if (dryRun) return;

    await pool.query(
      `update "Venue"
       set title = $2,
           address = $3,
           kind = $4::"VenueKind",
           "pageStatus" = 'PUBLISHED',
           "isIndexable" = true,
           "updatedAt" = now()
       where id = $1`,
      [row.id, CANON.title, CANON.address, CANON.kind],
    );
    console.log(JSON.stringify({ ok: true, id: row.id, slug: row.slug }));
  } finally {
    await pool.end();
  }
}

function loadRootEnv(projectRoot) {
  try {
    const source = fs.readFileSync(path.join(projectRoot, '.env'), 'utf8');
    for (const line of source.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex <= 0) continue;
      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key && process.env[key] == null) process.env[key] = value;
    }
  } catch {
    /* optional */
  }
}
