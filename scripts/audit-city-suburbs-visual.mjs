/**
 * Visual audit: MD5 duplicate base JPGs in venue folders (suburb POI placeholders).
 * Scans all base *.jpg in city folders + maps slugs from editorial when possible.
 *
 *   node scripts/audit-city-suburbs-visual.mjs
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const lib = path.join(root, 'apps/web/src/lib');
const venuesRoot = path.join(root, 'apps/public/public/images/venues');

const SKIP = new Set(['perm', 'moscow', 'ekaterinburg', 'kazan', 'samara', 'krasnodar', 'saint-petersburg', 'vyborg']);
const PRIORITY = ['ufa', 'tver', 'penza', 'tyumen', 'rostov-na-donu', 'omsk', 'saratov', 'sochi'];

const imagesSrc = fs.readFileSync(path.join(lib, 'city-place-images.ts'), 'utf8');
const slugByUrl = new Map();
for (const m of imagesSrc.matchAll(/'([^']+)':\s*'(\/images\/venues\/[^']+)'/g)) {
  slugByUrl.set(m[2], m[1]);
}

function collectPoiMeta() {
  const bySlug = new Map();
  const ingest = (hubCity, routeName, slug, name, desc) => {
    if (!slug || bySlug.has(slug)) return;
    bySlug.set(slug, { hubCity, routeName, name: name || slug, desc: desc || '' });
  };
  for (const file of fs.readdirSync(lib).filter((f) => f.endsWith('-hub.ts'))) {
    const src = fs.readFileSync(path.join(lib, file), 'utf8');
    if (!/SUBURBS\s*:/.test(src)) continue;
    const hubCity = file.replace('-hub.ts', '');
    const block = src.match(/export const \w+_SUBURBS[^=]*=\s*\[[\s\S]*?\n\];/)?.[0] || '';
    for (const chunk of block.split(/\{\s*\n\s*name:/).slice(1)) {
      const routeName = chunk.match(/^\s*'([^']+)'/)?.[1] || hubCity;
      const places = chunk.match(/places:\s*\[([\s\S]*?)\]\s*,?\s*\n\s*\}/)?.[1] || '';
      for (const b of places.split(/\{\s*\n/).slice(1)) {
        const slug = b.match(/locationSlug:\s*'([^']+)'/)?.[1];
        if (!slug) continue;
        ingest(hubCity, routeName, slug, b.match(/name:\s*'([^']+)'/)?.[1], b.match(/desc:\s*'([^']+)'/)?.[1]);
      }
    }
  }
  const reg = fs.readFileSync(path.join(lib, 'city-destination-registry.ts'), 'utf8');
  for (const chunk of reg.split(/export const \w+_SUBURB_CARD/)) {
    if (!chunk.includes('places:')) continue;
    const routeName = chunk.match(/name:\s*'([^']+)'/)?.[1] || 'registry';
    const hubSlug = chunk.match(/locationSlug:\s*'([^']+)'/)?.[1];
    const hubCity = hubSlug?.includes('nizhny-novgorod') ? 'nizhny-novgorod' : hubSlug?.split('-')[0] || 'unknown';
    const places = chunk.match(/places:\s*\[([\s\S]*?)\]\s*,?\s*\n\s*\}/)?.[1] || '';
    for (const b of places.split(/\{\s*\n/).slice(1)) {
      const slug = b.match(/locationSlug:\s*'([^']+)'/)?.[1];
      if (!slug) continue;
      ingest(hubCity, routeName, slug, b.match(/name:\s*'([^']+)'/)?.[1], b.match(/desc:\s*'([^']+)'/)?.[1]);
    }
  }
  return bySlug;
}

const poiMeta = collectPoiMeta();

function isBase(name) {
  return /\.jpe?g$/i.test(name) && !/-(?:card|thumb)\.jpe?g$/i.test(name);
}

const allFiles = [];
for (const city of fs.readdirSync(venuesRoot, { withFileTypes: true })) {
  if (!city.isDirectory()) continue;
  const dir = path.join(venuesRoot, city.name);
  for (const f of fs.readdirSync(dir)) {
    if (!isBase(f)) continue;
    const abs = path.join(dir, f);
    const url = `/images/venues/${city.name}/${f}`;
    const hash = crypto.createHash('md5').update(fs.readFileSync(abs)).digest('hex');
    const slug = slugByUrl.get(url) || null;
    const meta = slug ? poiMeta.get(slug) : null;
    allFiles.push({
      url,
      hash,
      folder: city.name,
      slug,
      hubCity: meta?.hubCity || city.name,
      routeName: meta?.routeName || '',
      name: meta?.name || f.replace(/\.jpe?g$/i, ''),
      desc: meta?.desc || '',
      size: fs.statSync(abs).size,
    });
  }
}

const byHash = new Map();
for (const f of allFiles) {
  if (!byHash.has(f.hash)) byHash.set(f.hash, []);
  byHash.get(f.hash).push(f);
}

const exactDuplicateFiles = [];
const crossCityDuplicates = [];
const regenerateWorklist = [];

for (const [hash, files] of byHash.entries()) {
  const uniqueUrls = [...new Map(files.map((f) => [f.url, f])).values()];
  if (uniqueUrls.length < 2) continue;
  const folders = [...new Set(uniqueUrls.map((f) => f.folder))];
  const group = {
    hash,
    width: 1600,
    height: 1067,
    files: uniqueUrls.map((f) => ({
      url: f.url,
      slug: f.slug,
      hubCity: f.hubCity,
      routeName: f.routeName,
      name: f.name,
      folder: f.folder,
    })),
  };
  exactDuplicateFiles.push(group);
  if (folders.length > 1) crossCityDuplicates.push(group);

  const sorted = [...uniqueUrls].sort((a, b) => a.url.localeCompare(b.url));
  for (let i = 1; i < sorted.length; i++) {
    const f = sorted[i];
    if (SKIP.has(f.folder)) continue;
    if (!PRIORITY.includes(f.folder)) continue;
    regenerateWorklist.push({
      slug: f.slug,
      url: f.url,
      routeName: f.routeName,
      hubCity: f.hubCity,
      poiName: f.name,
      desc: f.desc,
      action: 'regenerate',
      duplicateHash: hash,
    });
  }
}

const byPriorityCity = {};
for (const r of regenerateWorklist) {
  const c = r.url.match(/\/venues\/([^/]+)\//)?.[1];
  byPriorityCity[c] = (byPriorityCity[c] || 0) + 1;
}

const output = {
  auditedAt: new Date().toISOString(),
  totalBaseFiles: allFiles.length,
  exactDuplicateGroups: exactDuplicateFiles.length,
  crossCityDuplicateGroups: crossCityDuplicates.length,
  regenerateCount: regenerateWorklist.length,
  byPriorityCity,
  exactDuplicateFiles: exactDuplicateFiles.filter((g) => g.files.some((f) => PRIORITY.includes(f.folder))),
  crossCityDuplicates,
  regenerateWorklist,
};

const outPath = path.join(__dirname, 'audit-city-suburbs-visual-output.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(JSON.stringify({
  totalBaseFiles: output.totalBaseFiles,
  exactDuplicateGroups: output.exactDuplicateGroups,
  regenerateCount: output.regenerateCount,
  byPriorityCity,
  wrote: outPath,
}, null, 2));
