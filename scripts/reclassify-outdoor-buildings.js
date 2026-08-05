#!/usr/bin/env node
/**
 * Reclassify Venue rows wrongly stored as OUTDOOR_LOCATION that are buildings
 * → ATTRACTION (or MONUMENT/PARK when clear).
 *
 * Owner rule: outdoor = street/bridge/open access; buildings = attraction.
 *
 * Usage:
 *   node scripts/reclassify-outdoor-buildings.js --dry-run
 *   node scripts/reclassify-outdoor-buildings.js --apply
 *   node scripts/reclassify-outdoor-buildings.js --apply --cities=saint-petersburg,kaliningrad
 */
const path = require('path');
const { createRequire } = require('module');
const { reclassifyOutdoorBuilding } = require('./lib/venue-kind-heuristics');

const rootDir = path.resolve(__dirname, '..');
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'));
const { Pool } = requireFromDbPackage('pg');

const APPLY = process.argv.includes('--apply');
const citiesArg = process.argv.find((a) => a.startsWith('--cities='));
const CITY_FILTER = citiesArg
  ? citiesArg
      .slice('--cities='.length)
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  : ['saint-petersburg', 'kaliningrad', 'санкт-петербург', 'калининград'];

const CITY_SLUG_EXPAND = {
  'saint-petersburg': ['saint-petersburg', 'санкт-петербург', 'sankt-peterburg', 'spb'],
  kaliningrad: ['kaliningrad', 'калининград'],
};

function expandCitySlugs(list) {
  const out = new Set();
  for (const raw of list) {
    const key = String(raw || '').toLowerCase();
    const aliases = CITY_SLUG_EXPAND[key];
    if (aliases) aliases.forEach((a) => out.add(a));
    else out.add(key);
  }
  return [...out];
}

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

  const citySlugs = expandCitySlugs(CITY_FILTER);
  const { rows } = await pool.query(
    `
      SELECT v.id, v.slug, v.title, v.kind::text AS kind, c.slug AS city_slug
      FROM "Venue" v
      JOIN "City" c ON c.id = v."cityId"
      WHERE v.kind = 'OUTDOOR_LOCATION'::"VenueKind"
        AND v."pageStatus" IN ('PUBLISHED'::"VenuePageStatus", 'CANDIDATE'::"VenuePageStatus")
        AND lower(c.slug) = ANY($1::text[])
      ORDER BY c.slug, v.title
    `,
    [citySlugs],
  );

  const moves = [];
  for (const row of rows) {
    const next = reclassifyOutdoorBuilding(row.title, row.slug);
    if (!next || next === row.kind) continue;
    moves.push({ ...row, nextKind: next });
  }

  console.log(`outdoor rows scanned: ${rows.length}`);
  console.log(`to reclassify: ${moves.length}`);
  for (const m of moves) {
    console.log(`${m.city_slug} | ${m.kind} → ${m.nextKind} | ${m.slug} | ${m.title}`);
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
        SET kind = $2::"VenueKind", "updatedAt" = now()
        WHERE id = $1 AND kind = 'OUTDOOR_LOCATION'::"VenueKind"
      `,
      [m.id, m.nextKind],
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
