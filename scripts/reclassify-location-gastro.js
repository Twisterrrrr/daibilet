#!/usr/bin/env node
/**
 * Reclassify location-family cafe/restaurant/bar → GASTRO.
 * Leaves CLUB_BAR_RESTAURANT (institution /venues) untouched.
 *
 * Usage:
 *   node scripts/reclassify-location-gastro.js --dry-run
 *   node scripts/reclassify-location-gastro.js --apply
 *   node scripts/reclassify-location-gastro.js --apply --cities=all
 */
const path = require('path');
const { createRequire } = require('module');
const { reclassifyLocationGastro } = require('./lib/venue-kind-heuristics');

const rootDir = path.resolve(__dirname, '..');
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'));
const { Pool } = requireFromDbPackage('pg');

const APPLY = process.argv.includes('--apply');
const citiesArg = process.argv.find((a) => a.startsWith('--cities='));
const CITY_FILTER_RAW = citiesArg ? citiesArg.slice('--cities='.length).trim() : 'all';
const ALL_CITIES = CITY_FILTER_RAW === 'all' || CITY_FILTER_RAW === '*';

const SOURCE_KINDS = ['ATTRACTION', 'OTHER', 'VENUE', 'OUTDOOR_LOCATION'];

function loadRootEnv(root) {
  const fs = require('fs');
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

async function main() {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet',
    max: 1,
  });

  const params = [SOURCE_KINDS];
  let cityClause = '';
  if (!ALL_CITIES) {
    const list = CITY_FILTER_RAW.split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    params.push(list);
    cityClause = 'AND lower(c.slug) = ANY($2::text[])';
  }

  const { rows } = await pool.query(
    `
      SELECT v.id, v.slug, v.title, v.kind::text AS kind, c.slug AS city_slug
      FROM "Venue" v
      JOIN "City" c ON c.id = v."cityId"
      WHERE v.kind::text = ANY($1::text[])
        AND v."pageStatus" IN ('PUBLISHED'::"VenuePageStatus", 'CANDIDATE'::"VenuePageStatus")
        ${cityClause}
      ORDER BY c.slug, v.title
    `,
    params,
  );

  const moves = [];
  for (const row of rows) {
    const next = reclassifyLocationGastro(row.title, row.slug, row.kind);
    if (!next || next === row.kind) continue;
    moves.push({ ...row, nextKind: next });
  }

  console.log(`location rows scanned: ${rows.length}`);
  console.log(`to GASTRO: ${moves.length}`);
  for (const m of moves) {
    console.log(`${m.city_slug} | ${m.kind} → GASTRO | ${m.slug} | ${m.title}`);
  }

  if (!APPLY) {
    console.log('dry-run only (pass --apply to write)');
    await pool.end();
    return;
  }

  let updated = 0;
  for (const m of moves) {
    const r = await pool.query(
      `
        UPDATE "Venue"
        SET kind = 'GASTRO'::"VenueKind", "updatedAt" = now()
        WHERE id = $1 AND kind::text = $2
      `,
      [m.id, m.kind],
    );
    updated += r.rowCount || 0;
  }
  console.log(`updated: ${updated}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
