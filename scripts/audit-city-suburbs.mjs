/**
 * Audit suburb POI thumb coverage for city hub #city-suburbs cards.
 *
 *   node scripts/audit-city-suburbs.mjs
 *   node scripts/audit-city-suburbs.mjs --prod
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const lib = path.join(root, 'apps/web/src/lib');
const publicRoot = path.join(root, 'apps/public/public');
const checkProd = process.argv.includes('--prod');
const PROD = 'https://daibilet.ru';

const PRIORITY_CITIES = [
  'perm', 'moscow', 'ekaterinburg', 'kazan', 'samara', 'krasnodar', 'saint-petersburg', 'vyborg',
];

const IDENTITY_CITY_PREFIXES = [
  'moscow', 'saint-petersburg', 'sankt-peterburg', 'novosibirsk', 'ekaterinburg',
  'nizhny-novgorod', 'kazan', 'krasnoyarsk', 'samara', 'ufa', 'krasnodar', 'voronezh',
  'perm', 'volgograd', 'rostov-on-don', 'chelyabinsk', 'omsk', 'tyumen', 'kaliningrad',
  'sochi', 'tver', 'yaroslavl', 'ryazan', 'penza', 'saratov', 'vyborg',
];

const imagesSrc = fs.readFileSync(path.join(lib, 'city-place-images.ts'), 'utf8');
const EDITORIAL = new Map();
for (const m of imagesSrc.matchAll(/'([^']+)':\s*'(\/images\/venues\/[^']+)'/g)) {
  EDITORIAL.set(m[1], m[2]);
}

function inferConventional(slug) {
  const key = String(slug || '').trim().toLowerCase();
  if (!key) return null;
  for (const city of IDENTITY_CITY_PREFIXES) {
    if (key === city) continue;
    if (!key.startsWith(`${city}-`)) continue;
    const stem = key.slice(city.length + 1);
    if (!stem || stem.includes('/')) return null;
    return `/images/venues/${city}/${stem}.jpg`;
  }
  return null;
}

function lookupBase(slug) {
  return EDITORIAL.get(slug) || inferConventional(slug) || null;
}

function localExists(url) {
  if (!url) return false;
  return fs.existsSync(path.join(publicRoot, url.replace(/^\//, '')));
}

async function prodOk(url) {
  if (!url) return false;
  try {
    const res = await fetch(`${PROD}${url}`, { method: 'HEAD', redirect: 'follow' });
    return res.ok;
  } catch {
    return false;
  }
}

function collectNestedPoiSlugs() {
  const rows = [];
  for (const extra of ['moscow-suburbs.ts']) {
    const fp = path.join(lib, extra);
    if (!fs.existsSync(fp)) continue;
    const src = fs.readFileSync(fp, 'utf8');
    const citySlug = extra.replace('-suburbs.ts', '');
    for (const chunk of src.split(/places:\s*\[/).slice(1)) {
      for (const m of chunk.matchAll(/locationSlug:\s*'([^']+)'/g)) {
        rows.push({ citySlug, routeName: citySlug, slug: m[1] });
      }
    }
  }
  for (const file of fs.readdirSync(lib).filter((f) => f.endsWith('-hub.ts'))) {
    const src = fs.readFileSync(path.join(lib, file), 'utf8');
    if (!/SUBURBS\s*:/.test(src)) continue;
    const citySlug = file.replace('-hub.ts', '');
    const suburbsMatch = src.match(/export const \w+_SUBURBS[^=]*=\s*\[[\s\S]*?\n\];/);
    if (!suburbsMatch) continue;
    for (const chunk of suburbsMatch[0].split(/\{\s*\n\s*name:/).slice(1)) {
      const routeName = chunk.match(/^\s*'([^']+)'/)?.[1] || 'unknown';
      const placesMatch = chunk.match(/places:\s*\[([\s\S]*?)\]\s*,?\s*\n\s*\}/);
      if (!placesMatch) continue;
      for (const m of placesMatch[1].matchAll(/locationSlug:\s*'([^']+)'/g)) {
        rows.push({ citySlug, routeName, slug: m[1] });
      }
    }
  }
  const regSrc = fs.readFileSync(path.join(lib, 'city-destination-registry.ts'), 'utf8');
  for (const chunk of regSrc.split(/export const \w+_SUBURB_CARD/)) {
    if (!chunk.includes('places:')) continue;
    const routeName = chunk.match(/name:\s*'([^']+)'/)?.[1] || 'registry';
    const placesBlock = chunk.match(/places:\s*\[([\s\S]*?)\]\s*,?\s*\n\s*\}/);
    if (!placesBlock) continue;
    for (const m of placesBlock[1].matchAll(/locationSlug:\s*'([^']+)'/g)) {
      const slug = m[1];
      const citySlug = slug.includes('nizhny-novgorod') ? 'nizhny-novgorod' : slug.split('-')[0];
      rows.push({ citySlug, routeName, slug });
    }
  }
  return rows;
}

const pois = collectNestedPoiSlugs();
const byCity = new Map();
const all404Thumbs = [];
let totalUiBroken = 0;

for (const poi of pois) {
  const baseUrl = lookupBase(poi.slug);
  const thumbUrl = baseUrl ? baseUrl.replace(/\.jpg$/i, '-thumb.jpg') : null;
  const folder = baseUrl?.match(/\/venues\/([^/]+)\//)?.[1] || poi.slug.split('-')[0];
  const thumbLocal = localExists(thumbUrl);
  let thumbProd = null;
  if (checkProd && thumbUrl) thumbProd = await prodOk(thumbUrl);
  const uiBroken = !thumbLocal || (checkProd && thumbProd === false);
  if (uiBroken) {
    totalUiBroken++;
    all404Thumbs.push({
      city: folder,
      cityName: poi.citySlug,
      routeName: poi.routeName,
      slug: poi.slug,
      url: thumbUrl,
      baseUrl,
      baseLocal: localExists(baseUrl),
      thumbLocal,
      thumbProd,
    });
  }
  if (!byCity.has(folder)) byCity.set(folder, { city: folder, total: 0, broken: 0, worstRoutes: new Map() });
  const bucket = byCity.get(folder);
  bucket.total++;
  if (uiBroken) {
    bucket.broken++;
    bucket.worstRoutes.set(poi.routeName, (bucket.worstRoutes.get(poi.routeName) || 0) + 1);
  }
}

const details = [...byCity.values()]
  .map((b) => ({
    city: b.city,
    total: b.total,
    broken: b.broken,
    uiBrokenPct: b.total ? Math.round((1000 * b.broken) / b.total) / 10 : 0,
    worstRoutes: [...b.worstRoutes.entries()]
      .map(([name, broken]) => ({ name, broken }))
      .sort((a, c) => c.broken - a.broken)
      .slice(0, 8),
  }))
  .sort((a, b) => b.uiBrokenPct - a.uiBrokenPct);

const output = {
  auditedAt: new Date().toISOString(),
  checkProd,
  totalPoi: pois.length,
  totalUiBroken,
  uiBrokenPct: pois.length ? Math.round((1000 * totalUiBroken) / pois.length) / 10 : 0,
  details,
  all404Thumbs,
};

const outPath = path.join(__dirname, 'audit-city-suburbs-output.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(JSON.stringify({ totalPoi: output.totalPoi, totalUiBroken: output.totalUiBroken, wrote: outPath }, null, 2));
