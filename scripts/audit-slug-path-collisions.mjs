/**
 * Audit slug → image path collisions in city-place-images.ts merged map.
 *   node scripts/audit-slug-path-collisions.mjs
 *   node scripts/audit-slug-path-collisions.mjs --city=ryazan
 * Writes scripts/audit-slug-path-collisions.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mapPath = path.join(root, 'apps/web/src/lib/city-place-images.ts');
const regionPath = path.join(root, 'apps/web/src/lib/city-place-images-region-packs.ts');
const outPath = path.join(root, 'scripts/audit-slug-path-collisions.json');

const cityFilter = process.argv.find((a) => a.startsWith('--city='))?.slice('--city='.length) || null;

const src = fs.readFileSync(mapPath, 'utf8') + '\n' + fs.readFileSync(regionPath, 'utf8');

function resolveConst(name) {
  const re = new RegExp(`const ${name}\\s*=\\s*'([^']+)';`);
  const m = src.match(re);
  return m ? m[1] : null;
}

function extractBlock(name) {
  const re = new RegExp(`const ${name}: Record<string, string> = \\{([\\s\\S]*?)\\n\\};`);
  const m = src.match(re);
  if (!m) return {};
  const obj = {};
  for (const line of m[1].split('\n')) {
    const mm = line.match(/^\s*'([^']+)':\s*(.+?),?\s*$/);
    if (!mm) continue;
    let val = mm[2].trim().replace(/,$/, '');
    if (val.startsWith("'")) {
      obj[mm[1]] = val.slice(1, -1);
    } else {
      obj[mm[1]] = resolveConst(val) || val;
    }
  }
  return obj;
}

const PACK_ORDER = [
  'KAZAN_IMAGES',
  'SAMARA_IMAGES',
  'KRASNODAR_IMAGES',
  'NIZHNY_NOVGOROD_IMAGES',
  'SAINT_PETERSBURG_IMAGES',
  'KALININGRAD_IMAGES',
  'PERM_IMAGES',
  'MOSCOW_IMAGES',
  'EXTRA_AI_LOCATION_IMAGES',
  'LOCATION_PACK_IMAGES',
  'GASTRO_PACK_IMAGES',
  'MONUMENT_PACK_IMAGES',
  'KRASNOYARSK_IMAGES',
  'PAINTED_LINE_IMAGES_20260815',
  'VORONEZH_IMAGES',
  'RYAZAN_IMAGES',
  'OMSK_IMAGES',
  'CHELYABINSK_IMAGES',
  'TYUMEN_IMAGES',
  'UFA_HUB_IMAGES',
  'NOVOSIBIRSK_HUB_IMAGES',
  'SUBURB_NESTED_AUTO_IMAGES',
];

const merged = {};
for (const pack of PACK_ORDER) {
  Object.assign(merged, extractBlock(pack));
}

function cityOf(slug) {
  const known = [
    'saint-petersburg',
    'nizhny-novgorod',
    'rostov-na-donu',
    'krasnoyarsk',
    'novosibirsk',
    'chelyabinsk',
    'ekaterinburg',
    'kaliningrad',
    'voronezh',
    'krasnodar',
    'samara',
    'tyumen',
    'omsk',
    'ufa',
    'perm',
    'kazan',
    'moscow',
    'ryazan',
    'penza',
    'tver',
    'sochi',
    'saratov',
    'yaroslavl',
    'volgograd',
  ];
  for (const c of known) {
    if (slug.startsWith(`${c}-`)) return c;
  }
  return slug.split('-')[0];
}

const entries = Object.entries(merged).filter(([slug]) => !cityFilter || cityOf(slug) === cityFilter);

const byPath = {};
for (const [slug, url] of entries) {
  if (!url || typeof url !== 'string') continue;
  (byPath[url] ||= []).push(slug);
}

const identityGroups = [];
const collisionGroups = [];
const crossCityGroups = [];

for (const [url, slugs] of Object.entries(byPath)) {
  if (slugs.length < 2) continue;
  const sorted = [...slugs].sort();
  const group = { url, count: slugs.length, slugs: sorted };
  if (url.includes('/identity-')) {
    identityGroups.push(group);
    continue;
  }
  const cities = new Set(sorted.map(cityOf));
  if (cities.size > 1) {
    crossCityGroups.push({ ...group, cities: [...cities] });
  } else {
    collisionGroups.push(group);
  }
}

identityGroups.sort((a, b) => b.count - a.count);
collisionGroups.sort((a, b) => b.count - a.count);
crossCityGroups.sort((a, b) => b.count - a.count);

const report = {
  generatedAt: new Date().toISOString(),
  cityFilter,
  totalSlugs: entries.length,
  collisionGroups: collisionGroups.length,
  collisionSlugs: collisionGroups.reduce((n, g) => n + g.count, 0),
  crossCityGroups: crossCityGroups.length,
  crossCitySlugs: crossCityGroups.reduce((n, g) => n + g.count, 0),
  identityGroups: identityGroups.length,
  identitySlugs: identityGroups.reduce((n, g) => n + g.count, 0),
  collisions: collisionGroups,
  crossCity: crossCityGroups,
  identity: identityGroups,
};

fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

console.log(JSON.stringify({
  out: outPath,
  cityFilter,
  collisionGroups: report.collisionGroups,
  collisionSlugs: report.collisionSlugs,
  crossCityGroups: report.crossCityGroups,
  crossCitySlugs: report.crossCitySlugs,
  identityGroups: report.identityGroups,
}));

if (collisionGroups.length) {
  console.log('\nTop non-identity collisions:');
  for (const g of collisionGroups.slice(0, 10)) {
    console.log(`  ${g.count} → ${g.url}`);
    for (const s of g.slugs) console.log(`    ${s}`);
  }
}

if (crossCityGroups.length) {
  console.log('\nCross-city collisions:');
  for (const g of crossCityGroups.slice(0, 10)) {
    console.log(`  ${g.count} → ${g.url} [${g.cities.join(', ')}]`);
  }
}
