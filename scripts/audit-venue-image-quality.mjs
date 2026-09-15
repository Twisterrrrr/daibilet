/**
 * Audit venue images: duplicates, broken thumbs, EXIF orientation, crop size.
 *   node scripts/audit-venue-image-quality.mjs
 *   node scripts/audit-venue-image-quality.mjs --city=ryazan
 * Writes scripts/audit-venue-image-quality.json
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lib = path.join(root, 'apps/web/src/lib');
const venuesRoot = path.join(root, 'apps/public/public/images/venues');
const outPath = path.join(root, 'scripts/audit-venue-image-quality.json');

const cityFilter = process.argv.find((a) => a.startsWith('--city='))?.slice('--city='.length) || null;
const checkMode = process.argv.includes('--check');
/** Tiny thumb under this size (bytes) fails quality check. */
const TINY_THUMB_BYTES = 5000;

const SCAN_CITIES = [
  'ryazan', 'ufa', 'tver', 'penza', 'tyumen', 'rostov-na-donu', 'omsk', 'saratov', 'sochi',
];

const sharp = createRequire(path.join(root, 'apps/web/package.json'))('sharp');

function collectMustSeeSlugs() {
  const slugs = new Set();
  for (const file of fs.readdirSync(lib).filter((f) => f.endsWith('-hub.ts'))) {
    const src = fs.readFileSync(path.join(lib, file), 'utf8');
    const city = file.replace('-hub.ts', '');
    if (cityFilter && city !== cityFilter) continue;
    if (!cityFilter && !SCAN_CITIES.includes(city)) continue;
    const m = src.match(new RegExp(`export const \\w+_MUST_SEE[^=]*=\\s*(\\[[\\s\\S]*?\\n\\]);`));
    if (!m) continue;
    const block = m[1];
    for (const sm of block.matchAll(/locationSlug:\s*'([^']+)'/g)) slugs.add(sm[1]);
    for (const sm of block.matchAll(/venueSlug:\s*'([^']+)'/g)) slugs.add(sm[1]);
    for (const sm of block.matchAll(/\bloc\(\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'([^']+)'/g)) {
      slugs.add(sm[1]);
    }
    for (const sm of block.matchAll(/\bvenue\(\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'([^']+)'/g)) {
      slugs.add(sm[1]);
    }
  }
  return [...slugs].filter((s) => SCAN_CITIES.some((c) => s.startsWith(`${c}-`)));
}

function stemOf(slug, city) {
  return slug.startsWith(`${city}-`) ? slug.slice(city.length + 1) : slug;
}

function relPaths(city, stem) {
  const base = `/images/venues/${city}/${stem}.jpg`;
  return { base, card: base.replace('.jpg', '-card.jpg'), thumb: base.replace('.jpg', '-thumb.jpg') };
}

async function metaOf(rel) {
  const abs = path.join(venuesRoot, rel.replace(/^\/images\/venues\//, ''));
  if (!fs.existsSync(abs)) {
    return { abs, exists: false, bytes: 0 };
  }
  const bytes = fs.statSync(abs).size;
  let orientation = null;
  let width = null;
  let height = null;
  try {
    const m = await sharp(abs).metadata();
    orientation = m.orientation ?? 1;
    width = m.width ?? null;
    height = m.height ?? null;
  } catch {
    orientation = -1;
  }
  const md5 = crypto.createHash('md5').update(fs.readFileSync(abs)).digest('hex');
  return { abs, exists: true, bytes, orientation, width, height, md5, rel };
}

const slugs = collectMustSeeSlugs();
const byCity = {};
const issues = {
  missingBase: [],
  missingThumb: [],
  tinyThumb: [],
  badOrientation: [],
  badAspect: [],
  duplicateThumbMd5: [],
};

for (const slug of slugs.sort()) {
  const city = SCAN_CITIES.find((c) => slug.startsWith(`${c}-`)) || slug.split('-')[0];
  if (cityFilter && city !== cityFilter) continue;
  if (!SCAN_CITIES.includes(city)) continue;
  const stem = stemOf(slug, city);
  const paths = relPaths(city, stem);
  const base = await metaOf(paths.base);
  const thumb = await metaOf(paths.thumb);

  if (!byCity[city]) byCity[city] = { slugs: 0, issues: 0 };
  byCity[city].slugs++;

  if (!base.exists) {
    issues.missingBase.push({ slug, ...paths });
    byCity[city].issues++;
    continue;
  }
  if (!thumb.exists) {
    issues.missingThumb.push({ slug, thumb: paths.thumb });
    byCity[city].issues++;
  } else if (thumb.bytes < TINY_THUMB_BYTES) {
    issues.tinyThumb.push({ slug, bytes: thumb.bytes, thumb: paths.thumb });
    byCity[city].issues++;
  }
  if (base.orientation && base.orientation !== 1) {
    issues.badOrientation.push({ slug, kind: 'base', orientation: base.orientation, path: paths.base });
    byCity[city].issues++;
  }
  if (thumb.exists && thumb.orientation && thumb.orientation !== 1) {
    issues.badOrientation.push({ slug, kind: 'thumb', orientation: thumb.orientation, path: paths.thumb });
    byCity[city].issues++;
  }
  if (base.width && base.height) {
    const ratio = base.width / base.height;
    if (ratio < 1.2 || ratio > 2.0 || base.width < 400) {
      issues.badAspect.push({ slug, width: base.width, height: base.height, ratio: Number(ratio.toFixed(2)) });
      byCity[city].issues++;
    }
  }
}

const thumbByMd5 = new Map();
for (const slug of slugs) {
  const city = SCAN_CITIES.find((c) => slug.startsWith(`${c}-`));
  if (!city) continue;
  const { thumb } = relPaths(city, stemOf(slug, city));
  const m = await metaOf(thumb);
  if (!m.exists) continue;
  if (!thumbByMd5.has(m.md5)) thumbByMd5.set(m.md5, []);
  thumbByMd5.get(m.md5).push(slug);
}
for (const [md5, group] of thumbByMd5.entries()) {
  if (group.length < 2) continue;
  issues.duplicateThumbMd5.push({ md5: md5.slice(0, 8), slugs: group.sort() });
}

const cityFolders = cityFilter ? [cityFilter] : SCAN_CITIES;
const md5DupesInCity = {};
for (const city of cityFolders) {
  const dir = path.join(venuesRoot, city);
  if (!fs.existsSync(dir)) continue;
  const byHash = new Map();
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.jpg') || f.includes('-card') || f.includes('-thumb')) continue;
    const abs = path.join(dir, f);
    if (fs.statSync(abs).size < 10000) continue;
    const h = crypto.createHash('md5').update(fs.readFileSync(abs)).digest('hex');
    if (!byHash.has(h)) byHash.set(h, []);
    byHash.get(h).push(f);
  }
  const groups = [...byHash.values()].filter((g) => g.length > 1);
  if (groups.length) md5DupesInCity[city] = groups.map((g) => g.sort());
}

const report = {
  generatedAt: new Date().toISOString(),
  cityFilter,
  mustSeeSlugs: slugs.length,
  byCity,
  issueCounts: Object.fromEntries(Object.entries(issues).map(([k, v]) => [k, v.length])),
  md5DupesInCity,
  issues,
};

fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

console.log(JSON.stringify({
  out: outPath,
  mustSeeSlugs: slugs.length,
  issueCounts: report.issueCounts,
  md5DupesInCity: Object.fromEntries(Object.entries(md5DupesInCity).map(([k, v]) => [k, v.length])),
}, null, 2));

for (const [city, stat] of Object.entries(byCity)) {
  console.log(`  ${city}: ${stat.slugs} must-see, ${stat.issues} issues`);
}

if (issues.duplicateThumbMd5.length) {
  console.log('\nDuplicate thumb MD5 (must-see):');
  for (const g of issues.duplicateThumbMd5.slice(0, 8)) {
    console.log(`  ${g.md5}: ${g.slugs.join(', ')}`);
  }
}

if (Object.keys(md5DupesInCity).length) {
  console.log('\nBase JPG MD5 duplicates in city folder:');
  for (const [city, groups] of Object.entries(md5DupesInCity)) {
    console.log(`  ${city}: ${groups.length} group(s)`);
    for (const g of groups.slice(0, 3)) console.log(`    ${g.join(' = ')}`);
  }
}

if (checkMode) {
  let failed = false;
  const blockers = [
    ['missingBase', issues.missingBase],
    ['missingThumb', issues.missingThumb],
    ['tinyThumb', issues.tinyThumb],
    ['badOrientation', issues.badOrientation],
    ['duplicateThumbMd5', issues.duplicateThumbMd5],
  ];
  for (const [name, rows] of blockers) {
    if (!rows.length) continue;
    failed = true;
    console.error(`\nCHECK FAIL: ${name} (${rows.length})`);
    for (const row of rows.slice(0, 12)) {
      console.error(`  ${JSON.stringify(row)}`);
    }
  }
  if (failed) {
    console.error('\nCHECK FAIL: scan-city must-see images must exist, be oriented, and thumbs >= 5KB.');
    console.error('Fix: GenerateImage + node scripts/install-venue-still.mjs <stem> <city>');
    process.exit(1);
  }
  console.log('\nCHECK OK: scan-city must-see image quality.');
}
