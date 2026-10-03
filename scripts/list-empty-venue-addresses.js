#!/usr/bin/env node
/**
 * List PUBLISHED venues with empty address (prod inventory).
 *   node scripts/list-empty-venue-addresses.js
 */
const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

const rootDir = path.resolve(__dirname, '..');
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'));
const { Pool } = requireFromDbPackage('pg');

function loadRootEnv(dir) {
  const envPath = path.join(dir, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet',
  });
  try {
    const counts = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE NULLIF(TRIM(v.address), '') IS NULL)::int AS empty_addr,
        COUNT(*) FILTER (WHERE NULLIF(TRIM(v.address), '') IS NOT NULL)::int AS with_addr,
        COUNT(*)::int AS total
      FROM "Venue" v
      WHERE v."pageStatus" = 'PUBLISHED'
    `);
    const byCity = await pool.query(`
      SELECT COALESCE(c.title, '(no city)') AS city,
             COUNT(*)::int AS empty_addr
      FROM "Venue" v
      LEFT JOIN "City" c ON c.id = v."cityId"
      WHERE v."pageStatus" = 'PUBLISHED'
        AND NULLIF(TRIM(v.address), '') IS NULL
      GROUP BY 1
      ORDER BY empty_addr DESC, city
    `);
    const rows = await pool.query(`
      SELECT v.id, v.slug, v.title, c.title AS city, c.slug AS "citySlug", v.kind::text AS kind,
             v.latitude, v.longitude
      FROM "Venue" v
      LEFT JOIN "City" c ON c.id = v."cityId"
      WHERE v."pageStatus" = 'PUBLISHED'
        AND NULLIF(TRIM(v.address), '') IS NULL
      ORDER BY c.title NULLS LAST, v.title
      LIMIT 500
    `);
    console.log(
      JSON.stringify(
        { counts: counts.rows[0], byCity: byCity.rows, empty: rows.rows },
        null,
        2,
      ),
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
