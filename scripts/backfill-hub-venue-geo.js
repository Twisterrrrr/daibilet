#!/usr/bin/env node
/**
 * Backfill Venue address + lat/lng (+ optional heroImageUrl) from hub mustSee modules
 * and city-place-images map. Soft-fill empty fields; --force-geo overwrites coords;
 * FORCE_PINS (Perm waterfront) always overwrite coords/address.
 *
 *   node scripts/backfill-hub-venue-geo.js --dry-run --cities=ekaterinburg,kazan
 *   node scripts/backfill-hub-venue-geo.js --apply --force-geo --cities=ekaterinburg,kazan,samara,krasnodar,krasnoyarsk
 */
const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

const rootDir = path.resolve(__dirname, '..');
const apply = process.argv.includes('--apply');
const forceGeo = process.argv.includes('--force-geo');
const cityArg = process.argv.find((a) => a.startsWith('--cities='));
const citiesFilter = cityArg
  ? new Set(
      cityArg
        .slice('--cities='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    )
  : null;

function loadRootEnv(dir) {
  for (const rel of ['.env', 'apps/backend/.env', 'packages/db/.env', 'apps/web/.env']) {
    const p = path.join(dir, rel);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!m || process.env[m[1]]) continue;
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      process.env[m[1]] = v;
    }
  }
}

loadRootEnv(rootDir);

const HUBS = [
  { cityKey: 'ekaterinburg', file: 'apps/web/src/lib/ekaterinburg-hub.ts', exportName: 'EKB_MUST_SEE' },
  { cityKey: 'kazan', file: 'apps/web/src/lib/kazan-hub.ts', exportName: 'KAZAN_MUST_SEE' },
  { cityKey: 'samara', file: 'apps/web/src/lib/samara-hub.ts', exportName: 'SAMARA_MUST_SEE' },
  { cityKey: 'krasnodar', file: 'apps/web/src/lib/krasnodar-hub.ts', exportName: 'KRASNODAR_MUST_SEE' },
  { cityKey: 'krasnoyarsk', file: 'apps/web/src/lib/krasnoyarsk-hub.ts', exportName: 'KRASNOYARSK_MUST_SEE' },
];

const FORCE_PINS = [
  {
    slug: 'naberezhnaya-kamy',
    latitude: 58.01825,
    longitude: 56.2466,
    address: 'ул. Монастырская, 1Б',
    force: true,
  },
  {
    slug: 'perm-schaste-ne-za-gorami',
    latitude: 58.01835,
    longitude: 56.25055,
    address: 'ул. Берег Камы (у Речного вокзала)',
    force: true,
  },
];

function unescapeTs(s) {
  return String(s || '')
    .replace(/\\'/g, "'")
    .replace(/\\n/g, '\n')
    .replace(/\\\\/g, '\\');
}

function parseMustSeeArrayBody(arrayBody) {
  const rows = [];
  const itemRe = /\{([^{}]*)\}/g;
  let im;
  while ((im = itemRe.exec(arrayBody))) {
    const block = im[1];
    const nameMatch = block.match(/name:\s*'((?:\\'|[^'])*)'/);
    if (!nameMatch) continue;
    const slug =
      (block.match(/locationSlug:\s*'([^']+)'/) || [])[1] ||
      (block.match(/venueSlug:\s*'([^']+)'/) || [])[1] ||
      null;
    if (!slug) continue;
    const addressMatch = block.match(/address:\s*'((?:\\'|[^'])*)'/);
    const latMatch = block.match(/latitude:\s*(-?\d+(?:\.\d+)?)/);
    const lngMatch = block.match(/longitude:\s*(-?\d+(?:\.\d+)?)/);
    rows.push({
      slug,
      name: unescapeTs(nameMatch[1]),
      address: addressMatch ? unescapeTs(addressMatch[1]) : null,
      latitude: latMatch ? Number(latMatch[1]) : null,
      longitude: lngMatch ? Number(lngMatch[1]) : null,
    });
  }
  return rows;
}

function loadHubRows() {
  const rows = [];
  for (const hub of HUBS) {
    if (citiesFilter && !citiesFilter.has(hub.cityKey)) continue;
    const abs = path.join(rootDir, hub.file);
    if (!fs.existsSync(abs)) continue;
    const src = fs.readFileSync(abs, 'utf8');
    const re = new RegExp(`export const ${hub.exportName}[^=]*=\\s*\\[`, 'm');
    const m = re.exec(src);
    if (!m) continue;
    const arrStart = m.index + m[0].length - 1;
    let depth = 0;
    let arrEnd = -1;
    for (let i = arrStart; i < src.length; i++) {
      if (src[i] === '[') depth++;
      else if (src[i] === ']') {
        depth--;
        if (depth === 0) {
          arrEnd = i;
          break;
        }
      }
    }
    if (arrEnd < 0) continue;
    for (const row of parseMustSeeArrayBody(src.slice(arrStart + 1, arrEnd))) {
      rows.push({ ...row, cityKey: hub.cityKey });
    }
  }
  return rows;
}

function loadHeroMap() {
  const src = fs.readFileSync(path.join(rootDir, 'apps/web/src/lib/city-place-images.ts'), 'utf8');
  const map = new Map();
  for (const m of src.matchAll(/'([^']+)':\s*'(\/images\/venues\/[^']+)'/g)) {
    map.set(m[1], m[2]);
  }
  return map;
}

function heroExists(rel) {
  if (!rel) return false;
  const clean = rel.replace(/^\//, '');
  return (
    fs.existsSync(path.join(rootDir, 'apps/web/public', clean)) ||
    fs.existsSync(path.join(rootDir, 'apps/public/public', clean))
  );
}

async function main() {
  const url = process.env.DATABASE_URL || process.env.DIRECT_URL;
  if (!url) {
    console.error('No DATABASE_URL');
    process.exit(1);
  }
  const requireFromDb = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'));
  const { Pool } = requireFromDb('pg');
  const pool = new Pool({
    connectionString: url,
    ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false },
  });

  const heroMap = loadHeroMap();
  const planned = [...loadHubRows(), ...FORCE_PINS];

  const stats = { checked: 0, wouldUpdate: 0, updated: 0, missingVenue: 0, skipped: 0 };
  const samples = [];

  try {
    for (const item of planned) {
      if (!item.slug) continue;
      stats.checked += 1;
      const before = await pool.query(
        `select id, slug, address, latitude, longitude, "heroImageUrl" from "Venue" where slug = $1 limit 1`,
        [item.slug],
      );
      const row = before.rows[0];
      if (!row) {
        stats.missingVenue += 1;
        continue;
      }

      const hero = heroMap.get(item.slug) || null;
      const heroOk = hero && heroExists(hero) ? hero : null;
      const emptyAddress = !String(row.address || '').trim();
      const hasGeo =
        Number.isFinite(Number(row.latitude)) &&
        Number.isFinite(Number(row.longitude)) &&
        !(Number(row.latitude) === 0 && Number(row.longitude) === 0);

      const nextAddress =
        item.address && (emptyAddress || item.force) ? item.address : null;
      const writeGeo =
        item.latitude != null &&
        item.longitude != null &&
        Number.isFinite(item.latitude) &&
        Number.isFinite(item.longitude) &&
        (item.force || forceGeo || !hasGeo);
      const nextLat = writeGeo ? item.latitude : null;
      const nextLng = writeGeo ? item.longitude : null;
      const nextHero =
        heroOk &&
        (!String(row.heroImageUrl || '').trim() ||
          /generated\/venue-auto/i.test(String(row.heroImageUrl || '')))
          ? heroOk
          : null;

      if (nextAddress == null && nextLat == null && nextLng == null && nextHero == null) {
        stats.skipped += 1;
        continue;
      }

      stats.wouldUpdate += 1;
      if (samples.length < 30) {
        samples.push({
          slug: item.slug,
          nextAddress,
          nextLat,
          nextLng,
          nextHero,
        });
      }

      if (!apply) continue;

      const sets = [];
      const params = [item.slug];
      if (nextAddress != null) {
        params.push(nextAddress);
        sets.push(`address = $${params.length}`);
      }
      if (nextLat != null) {
        params.push(nextLat);
        sets.push(`latitude = $${params.length}`);
      }
      if (nextLng != null) {
        params.push(nextLng);
        sets.push(`longitude = $${params.length}`);
      }
      if (nextHero != null) {
        params.push(nextHero);
        sets.push(`"heroImageUrl" = $${params.length}`);
      }
      sets.push(`"updatedAt" = now()`);
      await pool.query(`update "Venue" set ${sets.join(', ')} where slug = $1`, params);
      stats.updated += 1;
    }
  } finally {
    await pool.end();
  }

  console.log(JSON.stringify({ apply, forceGeo, stats, samples }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
