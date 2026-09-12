#!/usr/bin/env node
/**
 * Insert-missing Perm must-see venues with address + coords (PUBLISHED).
 * Skips existing slugs (dedupe). Does not clobber title/kind/status.
 *
 *   node scripts/seed-perm-must-see-pack.js --dry-run
 *   node scripts/seed-perm-must-see-pack.js --apply
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { createRequire } = require('module');

const rootDir = path.resolve(__dirname, '..');
loadRootEnv(rootDir);

const dryRun = !process.argv.includes('--apply');
const requireFromDbPackage = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'));
const { Pool } = requireFromDbPackage('pg');
const { inferMustSeeKindAndFamily } = require('./lib/venue-kind-heuristics');

const CITY_SLUGS = ['perm', 'permi', 'пермь'];

function parsePermPlaces() {
  const src = fs.readFileSync(path.join(rootDir, 'apps/web/src/lib/cityInfo.ts'), 'utf8');
  const start = src.indexOf('  perm: {');
  const end = src.indexOf('\n  sortavala:', start);
  const block = src.slice(start, end);
  const mustSeeBody = block.slice(0, block.indexOf('significantSuburbs:'));
  const places = [];
  const itemRe = /\{([^{}]+)\}/g;
  let m;
  while ((m = itemRe.exec(mustSeeBody))) {
    const b = m[1];
    const name = (b.match(/name:\s*'((?:\\'|[^'])*)'/) || [])[1];
    if (!name) continue;
    const venueSlug = (b.match(/venueSlug:\s*'([^']+)'/) || [])[1] || null;
    const locationSlug = (b.match(/locationSlug:\s*'([^']+)'/) || [])[1] || null;
    const slug = venueSlug || locationSlug;
    if (!slug) continue;
    const desc = unescape((b.match(/desc:\s*'((?:\\'|[^'])*)'/) || [])[1] || '');
    const address = unescape((b.match(/address:\s*'((?:\\'|[^'])*)'/) || [])[1] || '');
    const latitude = Number((b.match(/latitude:\s*(-?\d+(?:\.\d+)?)/) || [])[1]);
    const longitude = Number((b.match(/longitude:\s*(-?\d+(?:\.\d+)?)/) || [])[1]);
    const inferred = inferMustSeeKindAndFamily(unescape(name));
    places.push({
      name: unescape(name),
      desc,
      address: address || null,
      slug,
      family: inferred.family,
      kind: inferred.kind,
      latitude: Number.isFinite(latitude) ? latitude : null,
      longitude: Number.isFinite(longitude) ? longitude : null,
    });
  }
  // Suburb hubs with explicit slugs
  const suburbRe =
    /name:\s*'((?:\\'|[^'])*)'[\s\S]*?(?:venueSlug|locationSlug):\s*'([^']+)'[\s\S]*?latitude:\s*(-?\d+(?:\.\d+)?)[\s\S]*?longitude:\s*(-?\d+(?:\.\d+)?)/g;
  const suburbsPart = block.slice(block.indexOf('significantSuburbs:'));
  let sm;
  while ((sm = suburbRe.exec(suburbsPart))) {
    const name = unescape(sm[1]);
    const slug = sm[2];
    if (places.some((p) => p.slug === slug)) continue;
    const inferred = inferMustSeeKindAndFamily(name);
    places.push({
      name,
      desc: '',
      address: null,
      slug,
      family: inferred.family,
      kind: inferred.kind,
      latitude: Number(sm[3]),
      longitude: Number(sm[4]),
    });
  }
  return places;
}

function unescape(s) {
  return String(s || '').replace(/\\'/g, "'");
}

function loadRootEnv(root) {
  for (const rel of ['.env', 'apps/backend/.env', 'packages/db/.env']) {
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m || process.env[m[1]]) continue;
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

async function main() {
  const places = parsePermPlaces();
  const bySlug = new Map();
  for (const p of places) {
    if (!bySlug.has(p.slug)) bySlug.set(p.slug, p);
  }
  const unique = [...bySlug.values()];
  console.log(JSON.stringify({ dryRun, unique: unique.length, sample: unique.slice(0, 3) }, null, 2));

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet',
    max: 2,
  });
  try {
    const city = await resolveCity(pool);
    if (!city) throw new Error('Perm city not found');
    let inserted = 0;
    let skipped = 0;
    let coordsPatched = 0;
    for (const place of unique) {
      const existing = await pool.query(`select id, latitude, longitude, address from "Venue" where slug = $1 limit 1`, [
        place.slug,
      ]);
      if (existing.rows[0]) {
        skipped += 1;
        const row = existing.rows[0];
        const needCoords = (row.latitude == null || row.longitude == null) && place.latitude != null;
        const needAddr = !row.address && place.address;
        if (!dryRun && (needCoords || needAddr)) {
          await pool.query(
            `update "Venue" set latitude = coalesce(latitude, $2), longitude = coalesce(longitude, $3), address = coalesce(nullif(address,''), $4), "updatedAt" = now() where id = $1`,
            [row.id, place.latitude, place.longitude, place.address],
          );
          coordsPatched += 1;
        } else if (dryRun && (needCoords || needAddr)) {
          coordsPatched += 1;
        }
        continue;
      }
      if (dryRun) {
        inserted += 1;
        continue;
      }
      const id = `ven_perm_${crypto.createHash('sha1').update(place.slug).digest('hex').slice(0, 14)}`;
      const canonicalPath =
        place.family === 'institution' ? `/venues/${place.slug}` : `/locations/${place.slug}`;
      await pool.query(
        `
        insert into "Venue" (
          id, slug, title, kind, "pageStatus", "cityId",
          "shortDescription", address, latitude, longitude,
          "seoH1", "seoTitle", "seoDescription",
          "canonicalPath", "isIndexable", "createdAt", "updatedAt"
        ) values (
          $1,$2,$3,$4::"VenueKind",'PUBLISHED'::"VenuePageStatus",$5,
          $6,$7,$8,$9,
          $3,$10,$6,
          $11,true,now(),now()
        )
        `,
        [
          id,
          place.slug,
          place.name,
          place.kind,
          city.id,
          place.desc || null,
          place.address,
          place.latitude,
          place.longitude,
          `${place.name} | Дайбилет`,
          canonicalPath,
        ],
      );
      inserted += 1;
    }
    console.log(JSON.stringify({ cityId: city.id, inserted, skipped, coordsPatched }, null, 2));
  } finally {
    await pool.end();
  }
}

async function resolveCity(pool) {
  for (const slug of CITY_SLUGS) {
    const r = await pool.query(`select id, slug, title from "City" where lower(slug) = lower($1) limit 1`, [slug]);
    if (r.rows[0]) return r.rows[0];
  }
  const r = await pool.query(`select id, slug, title from "City" where title ilike 'Пермь' limit 1`);
  return r.rows[0] || null;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
