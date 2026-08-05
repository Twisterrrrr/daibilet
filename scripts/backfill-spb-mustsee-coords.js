#!/usr/bin/env node
/**
 * Backfill lat/lng + address for SPB Venue rows from owner pack
 * scripts/data/spb-kgd-venue-coords.json (title match).
 *
 * Usage:
 *   node scripts/backfill-spb-mustsee-coords.js --dry-run
 *   node scripts/backfill-spb-mustsee-coords.js --apply
 */
const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

const rootDir = path.resolve(__dirname, '..');
loadEnv(rootDir);

const dryRun = !process.argv.includes('--apply');
const pack = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'scripts/data/spb-kgd-venue-coords.json'), 'utf8'),
);

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»"'()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const byTitle = new Map();
for (const row of pack.places || []) {
  const [ownerId, cityKey, title, address, latitude, longitude] = row;
  if (cityKey !== 'saint-petersburg') continue;
  byTitle.set(norm(title), { ownerId, title, address, latitude, longitude });
}

async function main() {
  const requireFromDb = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'));
  const { Pool } = requireFromDb('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet',
    max: 2,
  });

  const city = await pool.query(
    `select id from "City" where slug in ('saint-petersburg','sankt-peterburg','санкт-петербург') or lower(title)='санкт-петербург' limit 1`,
  );
  if (!city.rows[0]) throw new Error('SPB city not found');
  const cityId = city.rows[0].id;

  const venues = await pool.query(
    `select id, slug, title, address, latitude, longitude
     from "Venue"
     where "cityId" = $1
       and "pageStatus" = 'PUBLISHED'
       and (latitude is null or longitude is null or (latitude = 0 and longitude = 0))`,
    [cityId],
  );

  let matched = 0;
  let updated = 0;
  const unmatched = [];

  for (const v of venues.rows) {
    let hit = byTitle.get(norm(v.title));
    if (!hit) {
      // soft: pack title contained in venue title or vice versa
      for (const [k, val] of byTitle) {
        if (norm(v.title).includes(k) || k.includes(norm(v.title))) {
          hit = val;
          break;
        }
      }
    }
    if (!hit || !Number.isFinite(Number(hit.latitude)) || !Number.isFinite(Number(hit.longitude))) {
      unmatched.push(v.slug);
      continue;
    }
    matched += 1;
    if (dryRun) continue;
    await pool.query(
      `update "Venue"
       set latitude = $2,
           longitude = $3,
           address = coalesce(nullif(trim(address), ''), $4),
           "updatedAt" = now()
       where id = $1`,
      [v.id, hit.latitude, hit.longitude, hit.address || null],
    );
    updated += 1;
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        cityId,
        missingCoords: venues.rows.length,
        packSpb: byTitle.size,
        matched,
        updated,
        unmatchedSample: unmatched.slice(0, 40),
        unmatchedCount: unmatched.length,
      },
      null,
      2,
    ),
  );
  await pool.end();
}

function loadEnv(dir) {
  for (const name of ['.env', '.env.local', 'apps/backend/.env']) {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#') || !t.includes('=')) continue;
      const i = t.indexOf('=');
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
