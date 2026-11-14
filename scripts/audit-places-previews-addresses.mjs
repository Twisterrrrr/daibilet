/**
 * Audit /places completeness via live public venues API:
 * address, coords, hero (DB URL or city-place-images map + local file).
 *
 *   node scripts/audit-places-previews-addresses.mjs
 *   node scripts/audit-places-previews-addresses.mjs --cities=ekaterinburg,kazan
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const BASE = process.env.AUDIT_BASE_URL || 'https://daibilet.ru';

const DEFAULT_CITIES = [
  'ekaterinburg',
  'kazan',
  'samara',
  'krasnodar',
  'krasnoyarsk',
  'moscow',
  'sankt-peterburg',
  'kaliningrad',
  'nizhny-novgorod',
  'perm',
  'ufa',
];

const cityArg = process.argv.find((a) => a.startsWith('--cities='));
const cities = cityArg
  ? cityArg
      .slice('--cities='.length)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : DEFAULT_CITIES;

const imagesSrc = fs.readFileSync(path.join(rootDir, 'apps/web/src/lib/city-place-images.ts'), 'utf8');
const map = new Map();
for (const m of imagesSrc.matchAll(/'([^']+)':\s*'(\/images\/venues\/[^']+)'/g)) {
  map.set(m[1], m[2]);
}

function fileExists(relUrl) {
  if (!relUrl || !relUrl.startsWith('/')) return false;
  const rel = relUrl.replace(/^\//, '');
  return [
    path.join(rootDir, 'apps/web/public', rel),
    path.join(rootDir, 'apps/public/public', rel),
  ].some((p) => fs.existsSync(p));
}

function isRemoteHero(url) {
  return /^https?:\/\//i.test(String(url || ''));
}

function isStubHero(url) {
  return /generated\/venue-auto/i.test(String(url || ''));
}

async function fetchCityVenues(city) {
  const out = [];
  let cursor = null;
  for (let i = 0; i < 50; i++) {
    const qs = new URLSearchParams({ city, limit: '100' });
    if (cursor) qs.set('cursor', cursor);
    const url = `${BASE}/api/public/venues?${qs}`;
    const res = await fetch(url);
    if (!res.ok) return { error: `${res.status}`, items: out };
    const json = await res.json();
    const items = Array.isArray(json.venues) ? json.venues : [];
    out.push(...items);
    if (!json.hasMore || !json.nextCursor) break;
    cursor = json.nextCursor;
  }
  return { items: out };
}

function hasAddress(v) {
  const a = String(v.address || '').trim();
  return Boolean(a) && !/уточняет/i.test(a);
}

function hasCoords(v) {
  const lat = Number(v.latitude);
  const lng = Number(v.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
}

/** Effective card hero after resolveVenueHeroImage-ish logic. */
function resolveHero(v) {
  const slug = String(v.slug || '').trim();
  const fromDb = String(v.heroImageUrl || '').trim() || null;
  const fromMap = slug ? map.get(slug) || null : null;
  if (fromDb && !isStubHero(fromDb)) return fromDb;
  return fromMap || fromDb;
}

function heroStatus(hero) {
  if (!hero || isStubHero(hero)) return 'missing';
  if (isRemoteHero(hero)) return 'remote-ok';
  if (fileExists(hero)) return 'local-ok';
  return 'local-missing-file';
}

const LOCATION_TYPES = new Set([
  'attraction',
  'monument',
  'park',
  'outdoor_location',
  'temple',
  'pier',
  'pier_water',
  'bus',
  'sport_activity_space',
]);

const summary = [];
const worst = [];

for (const city of cities) {
  const { items, error } = await fetchCityVenues(city);
  if (error && !items.length) {
    summary.push({ city, error, total: 0 });
    continue;
  }

  const locations = items.filter((v) => LOCATION_TYPES.has(String(v.type || '').toLowerCase()));
  const buckets = [
    { key: 'all', list: items },
    { key: 'locations', list: locations },
  ];

  const cityRow = { city, total: items.length, locations: locations.length };
  for (const { key, list } of buckets) {
    let noAddress = 0;
    let noCoords = 0;
    let heroOk = 0;
    let heroMissing = 0;
    let heroFileMissing = 0;
    for (const v of list) {
      const addrOk = hasAddress(v);
      const coordsOk = hasCoords(v);
      if (!addrOk) noAddress += 1;
      if (!coordsOk) noCoords += 1;
      const hero = resolveHero(v);
      const st = heroStatus(hero);
      if (st === 'remote-ok' || st === 'local-ok') heroOk += 1;
      else if (st === 'local-missing-file') {
        heroFileMissing += 1;
        if (key === 'locations') {
          worst.push({ city, slug: v.slug, name: v.name, type: v.type, issue: 'hero-file-missing', hero });
        }
      } else {
        heroMissing += 1;
        if (key === 'locations') {
          worst.push({ city, slug: v.slug, name: v.name, type: v.type, issue: 'no-hero' });
        }
      }
      if (key === 'locations' && (!addrOk || !coordsOk)) {
        worst.push({
          city,
          slug: v.slug,
          name: v.name,
          type: v.type,
          issue: !addrOk && !coordsOk ? 'no-address+coords' : !addrOk ? 'no-address' : 'no-coords',
          hasHubMap: map.has(String(v.slug || '')),
        });
      }
    }
    const n = list.length || 1;
    cityRow[key] = {
      total: list.length,
      noAddress,
      noCoords,
      heroOk,
      heroMissing,
      heroFileMissing,
      addressPct: Math.round((100 * (list.length - noAddress)) / n),
      coordsPct: Math.round((100 * (list.length - noCoords)) / n),
      heroPct: Math.round((100 * heroOk) / n),
    };
  }
  summary.push(cityRow);
}

const outPath = path.join(rootDir, '.tmp-places-audit-report.json');
fs.writeFileSync(outPath, JSON.stringify({ base: BASE, generatedAt: new Date().toISOString(), summary, worst }, null, 2));

console.log('\n=== /places audit (live API) ===\n');
for (const row of summary) {
  if (row.error) {
    console.log(`${row.city}: ERROR ${row.error}`);
    continue;
  }
  const loc = row.locations;
  const all = row.all;
  console.log(
    `${row.city}: all ${all.total} (addr ${all.addressPct}% / coords ${all.coordsPct}% / hero ${all.heroPct}%) | ` +
      `locations ${loc.total} (addr ${loc.addressPct}% / coords ${loc.coordsPct}% / hero ${loc.heroPct}% | ` +
      `noAddr ${loc.noAddress} noCoords ${loc.noCoords} noHero ${loc.heroMissing} fileMiss ${loc.heroFileMissing})`,
  );
}
console.log(`\nworst location issues: ${worst.length}`);
console.log(`report: ${outPath}`);
