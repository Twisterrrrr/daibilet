#!/usr/bin/env node
/**
 * Backfill empty Venue.address from:
 * 1) VenueAlias.address
 * 2) cityInfo mustSee/significantSuburbs address by venueSlug/locationSlug
 * 3) scripts/data packs (spb-kgd-venue-coords EXTRA is in backfill-spb script)
 * 4) optional Nominatim reverse for rows with coords (--geocode)
 *
 *   node scripts/backfill-empty-venue-addresses.js --dry-run
 *   node scripts/backfill-empty-venue-addresses.js --apply
 *   node scripts/backfill-empty-venue-addresses.js --apply --geocode
 */
const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

const rootDir = path.resolve(__dirname, '..');
loadRootEnv(rootDir);

const apply = process.argv.includes('--apply');
const useGeocode = process.argv.includes('--geocode');
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeAddress(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function isUsefulAddress(value) {
  const text = normalizeAddress(value);
  if (text.length < 4) return false;
  if (/^адрес уточняется$/i.test(text)) return false;
  return true;
}

/** Pull {slug -> address} and {normTitle|cityKey -> address} from cityInfo.ts. */
function loadCityInfoAddresses() {
  const src = fs.readFileSync(path.join(rootDir, 'apps/web/src/lib/cityInfo.ts'), 'utf8');
  const bySlug = new Map();
  const byTitle = new Map();
  const itemRe = /\{([^{}]{20,800})\}/g;
  let m;
  while ((m = itemRe.exec(src))) {
    const block = m[1];
    const address = (block.match(/address:\s*['"]([^'"]+)['"]/) || [])[1];
    if (!isUsefulAddress(address)) continue;
    const name = (block.match(/name:\s*['"]([^'"]+)['"]/) || [])[1];
    const venueSlug = (block.match(/venueSlug:\s*['"]([^'"]+)['"]/) || [])[1];
    const locationSlug = (block.match(/locationSlug:\s*['"]([^'"]+)['"]/) || [])[1];
    const addr = normalizeAddress(address);
    for (const slug of [venueSlug, locationSlug]) {
      if (slug && !bySlug.has(slug)) bySlug.set(slug, addr);
    }
    if (name) {
      const key = normTitle(name);
      if (key && !byTitle.has(key)) byTitle.set(key, addr);
    }
  }
  return { bySlug, byTitle };
}

function normTitle(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»"'()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadPackAddresses() {
  const map = new Map();
  const files = [
    'scripts/data/spb-kgd-venue-coords.json',
    'scripts/data/catalog-monuments-2026-08-13.json',
    'scripts/data/venue-address-curated-2026-08-13.json',
  ];
  for (const rel of files) {
    const packPath = path.join(rootDir, rel);
    if (!fs.existsSync(packPath)) continue;
    const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
    if (pack && !Array.isArray(pack) && typeof pack === 'object' && !pack.venues && !pack.items) {
      // slug -> address map
      for (const [slug, address] of Object.entries(pack)) {
        const text = normalizeAddress(address);
        if (slug && isUsefulAddress(text) && !map.has(slug)) map.set(slug, text);
      }
      continue;
    }
    const list = Array.isArray(pack) ? pack : pack.venues || pack.items || [];
    for (const row of list) {
      const slug = String(row.slug || row.venueSlug || row.locationSlug || '').trim();
      const address = normalizeAddress(row.address);
      if (slug && isUsefulAddress(address) && !map.has(slug)) map.set(slug, address);
    }
  }
  // Inline EXTRA from backfill-spb-mustsee-coords.js (slug -> [lat,lng,address])
  const extraPath = path.join(rootDir, 'scripts/backfill-spb-mustsee-coords.js');
  if (fs.existsSync(extraPath)) {
    const src = fs.readFileSync(extraPath, 'utf8');
    const re = /'([^']+)':\s*\[[^\]]+,\s*[^\]]+,\s*'((?:\\'|[^'])*)'\]/g;
    let m;
    while ((m = re.exec(src))) {
      const slug = m[1];
      const address = normalizeAddress(m[2].replace(/\\'/g, "'"));
      if (isUsefulAddress(address) && !map.has(slug)) map.set(slug, address);
    }
  }
  return map;
}

async function reverseGeocode(lat, lon) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('zoom', '18');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('accept-language', 'ru');
  return fetchNominatimAddress(url);
}

async function forwardGeocode(title, city) {
  const q = [title, city, 'Россия'].filter(Boolean).join(', ');
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('q', q);
  url.searchParams.set('limit', '1');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('accept-language', 'ru');
  return fetchNominatimAddress(url, true);
}

async function fetchNominatimAddress(url, fromSearch = false) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'daibilet-address-backfill/1.0 (ops@daibilet.ru)',
      },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const data = fromSearch ? (Array.isArray(payload) ? payload[0] : null) : payload;
    if (!data) return null;
    const a = data.address || {};
    const road =
      a.road || a.pedestrian || a.footway || a.square || a.suburb || a.neighbourhood || a.quarter;
    const house = a.house_number;
    const parts = [];
    if (road && house) parts.push(`${road}, ${house}`);
    else if (road) parts.push(road);
    else if (a.attraction) parts.push(a.attraction);
    else if (data.name && !/^[0-9.]+$/.test(data.name)) parts.push(data.name);
    const text = normalizeAddress(parts.join(', '));
    return isUsefulAddress(text) ? text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const cityInfo = loadCityInfoAddresses();
  const packs = loadPackAddresses();
  console.error(
    `sources: cityInfo.slug=${cityInfo.bySlug.size} cityInfo.title=${cityInfo.byTitle.size} packs=${packs.size}`,
  );

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet',
  });

  try {
    const { rows } = await pool.query(`
      SELECT v.id, v.slug, v.title, c.title AS city, c.slug AS "citySlug",
             v.latitude, v.longitude
      FROM "Venue" v
      LEFT JOIN "City" c ON c.id = v."cityId"
      WHERE v."pageStatus" = 'PUBLISHED'
        AND NULLIF(TRIM(v.address), '') IS NULL
      ORDER BY c.title NULLS LAST, v.title
    `);

    const aliasRows = await pool.query(`
      SELECT DISTINCT ON (a."venueId")
        a."venueId",
        NULLIF(TRIM(a.address), '') AS address
      FROM "VenueAlias" a
      WHERE NULLIF(TRIM(a.address), '') IS NOT NULL
      ORDER BY a."venueId", length(a.address) DESC
    `);
    const aliasByVenue = new Map(aliasRows.rows.map((r) => [r.venueId, normalizeAddress(r.address)]));

    const plan = [];
    let updated = 0;
    for (const row of rows) {
      let address = null;
      let source = null;
      if (cityInfo.bySlug.has(row.slug)) {
        address = cityInfo.bySlug.get(row.slug);
        source = 'cityInfo';
      } else if (cityInfo.byTitle.has(normTitle(row.title))) {
        address = cityInfo.byTitle.get(normTitle(row.title));
        source = 'cityInfoTitle';
      } else if (packs.has(row.slug)) {
        address = packs.get(row.slug);
        source = 'pack';
      } else if (aliasByVenue.has(row.id)) {
        address = aliasByVenue.get(row.id);
        source = 'alias';
      } else if (useGeocode) {
        if (Number.isFinite(Number(row.latitude)) && Number.isFinite(Number(row.longitude))) {
          address = await reverseGeocode(row.latitude, row.longitude);
          source = address ? 'nominatim-reverse' : null;
        }
        if (!address) {
          address = await forwardGeocode(row.title, row.city);
          source = address ? 'nominatim-forward' : null;
        }
        await sleep(1100);
      }
      if (!isUsefulAddress(address)) continue;
      const item = {
        id: row.id,
        slug: row.slug,
        title: row.title,
        city: row.city,
        address,
        source,
      };
      plan.push(item);
      if (apply) {
        const result = await pool.query(
          `
            UPDATE "Venue"
            SET address = $2, "updatedAt" = NOW()
            WHERE id = $1
              AND NULLIF(TRIM(address), '') IS NULL
          `,
          [item.id, item.address],
        );
        updated += result.rowCount || 0;
        if (updated % 10 === 0) console.error(`updated=${updated}`);
      }
    }

    const bySource = plan.reduce((acc, item) => {
      acc[item.source] = (acc[item.source] || 0) + 1;
      return acc;
    }, {});
    console.log(
      JSON.stringify(
        {
          empty: rows.length,
          planned: plan.length,
          leftover: rows.length - plan.length,
          bySource,
          sample: plan.slice(0, 40),
          dryRun: !apply,
          updated: apply ? updated : 0,
        },
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
