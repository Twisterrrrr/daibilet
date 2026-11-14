#!/usr/bin/env node
/**
 * Upgrade ticketable palace/cathedral museums from location ATTRACTION → /venues.
 *
 * Owner canon (docs/catalog-location-venue-canon.md):
 *   дворец/собор с билетом на вход → MUSEUM_ART_SPACE + /venues/{slug}
 *   + HTTP 301 via VenuePages routeFamily redirect (canonicalPath updated).
 *
 * Usage:
 *   node scripts/reclassify-ticketable-attractions-to-venues.js --dry-run
 *   node scripts/reclassify-ticketable-attractions-to-venues.js --apply
 *   node scripts/reclassify-ticketable-attractions-to-venues.js --apply --cities=saint-petersburg
 */
const path = require('path');
const { createRequire } = require('module');

const rootDir = path.resolve(__dirname, '..');
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'));
const { Pool } = requireFromDbPackage('pg');

const APPLY = process.argv.includes('--apply');
const citiesArg = process.argv.find((a) => a.startsWith('--cities='));
const CITY_FILTER_RAW = citiesArg ? citiesArg.slice('--cities='.length).trim() : 'all';
const ALL_CITIES = CITY_FILTER_RAW === 'all' || CITY_FILTER_RAW === '*';

/** Same stems as heuristics PALACE_MUSEUM_RE (+ slug-friendly). */
const TICKETABLE_RE = new RegExp(
  [
    'юсуповск',
    'екатерининск',
    'павловск\\w*\\s+дворец',
    'гатчинск',
    'мраморн\\w*\\s+дворец',
    'михайловск\\w*\\s+замок',
    'петергофск\\w*\\s+дворец',
    'больш\\w*\\s+дворец\\s+петергоф',
    'исаакиевск',
    'спас\\s+на\\s+крови',
    'kolonnada-isaakiya',
  ].join('|'),
  'iu',
);

const CITY_SLUG_EXPAND = {
  'saint-petersburg': ['saint-petersburg', 'санкт-петербург', 'sankt-peterburg', 'spb'],
  moscow: ['moscow', 'moskva', 'москва'],
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

function isTicketable(title, slug) {
  return TICKETABLE_RE.test(`${title || ''} ${slug || ''}`);
}

async function main() {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet',
    max: 1,
  });

  let rows;
  if (ALL_CITIES) {
    const r = await pool.query(`
      SELECT v.id, v.slug, v.title, v.kind::text AS kind, v."canonicalPath",
             c.slug AS city_slug, c.title AS city_title
      FROM "Venue" v
      JOIN "City" c ON c.id = v."cityId"
      WHERE v.kind IN ('ATTRACTION'::"VenueKind", 'OUTDOOR_LOCATION'::"VenueKind")
        AND v."pageStatus" IN ('PUBLISHED'::"VenuePageStatus", 'CANDIDATE'::"VenuePageStatus")
      ORDER BY c.slug, v.title
    `);
    rows = r.rows;
  } else {
    const list = CITY_FILTER_RAW.split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const slugs = expandCitySlugs(list);
    const r = await pool.query(
      `
      SELECT v.id, v.slug, v.title, v.kind::text AS kind, v."canonicalPath",
             c.slug AS city_slug, c.title AS city_title
      FROM "Venue" v
      JOIN "City" c ON c.id = v."cityId"
      WHERE v.kind IN ('ATTRACTION'::"VenueKind", 'OUTDOOR_LOCATION'::"VenueKind")
        AND v."pageStatus" IN ('PUBLISHED'::"VenuePageStatus", 'CANDIDATE'::"VenuePageStatus")
        AND lower(c.slug) = ANY($1::text[])
      ORDER BY c.slug, v.title
    `,
      [slugs],
    );
    rows = r.rows;
  }

  const moves = rows.filter((row) => isTicketable(row.title, row.slug));
  console.log(`candidates scanned: ${rows.length}`);
  console.log(`to upgrade → MUSEUM_ART_SPACE /venues: ${moves.length}`);
  for (const row of moves) {
    console.log(
      `  ${row.city_slug}  ${row.kind}  ${row.slug}  ← ${row.title}  (${row.canonicalPath || '-'})`,
    );
  }

  if (!APPLY) {
    console.log('dry-run only (pass --apply to write)');
    await pool.end();
    return;
  }

  let updated = 0;
  for (const row of moves) {
    const nextPath = `/venues/${row.slug}`;
    const res = await pool.query(
      `
      UPDATE "Venue"
      SET kind = 'MUSEUM_ART_SPACE'::"VenueKind",
          "canonicalPath" = $2,
          "updatedAt" = NOW()
      WHERE id = $1
      RETURNING slug, kind::text, "canonicalPath"
    `,
      [row.id, nextPath],
    );
    if (res.rowCount) {
      updated += 1;
      console.log(`updated ${res.rows[0].slug} → ${res.rows[0].kind} ${res.rows[0].canonicalPath}`);
    }
  }
  console.log(`applied: ${updated}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
