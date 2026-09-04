/**
 * Enrich regenerate worklist with POI name/desc from hub place() + suburbs.
 *   node scripts/enrich-suburb-duplicates-worklist.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lib = path.join(path.resolve(__dirname, '..'), 'apps/web/src/lib');
const auditPath = path.join(__dirname, 'audit-city-suburbs-visual-output.json');

const meta = new Map();

function add(slug, name, desc, hubCity, routeName) {
  if (!slug) return;
  meta.set(slug, {
    slug,
    name: name || slug,
    desc: desc || '',
    hubCity: hubCity || slug.split('-')[0],
    routeName: routeName || '',
  });
}

for (const file of fs.readdirSync(lib).filter((f) => f.endsWith('-hub.ts') || f === 'moscow-suburbs.ts')) {
  const src = fs.readFileSync(path.join(lib, file), 'utf8');
  const hubCity = file.replace(/-hub\.ts$|-suburbs\.ts$/, '');

  for (const m of src.matchAll(
    /place\(\s*'([^']*)'\s*,\s*'([^']*)'[\s\S]*?locationSlug:\s*'([^']+)'/g,
  )) {
    add(m[3], m[1], m[2], hubCity, '');
  }

  const suburbs = src.match(/export const \w+_SUBURBS[^=]*=\s*\[[\s\S]*?\n\];/)?.[0] || '';
  for (const chunk of suburbs.split(/\{\s*\n\s*name:/).slice(1)) {
    const routeName = chunk.match(/^\s*'([^']+)'/)?.[1] || hubCity;
    const places = chunk.match(/places:\s*\[([\s\S]*?)\]\s*,?\s*\n\s*\}/)?.[1] || '';
    for (const b of places.split(/\{\s*\n/).slice(1)) {
      const slug = b.match(/locationSlug:\s*'([^']+)'/)?.[1];
      if (!slug) continue;
      add(slug, b.match(/name:\s*'([^']+)'/)?.[1], b.match(/desc:\s*'([^']+)'/)?.[1], hubCity, routeName);
    }
  }
}

const reg = fs.readFileSync(path.join(lib, 'city-destination-registry.ts'), 'utf8');
for (const chunk of reg.split(/export const \w+_SUBURB_CARD/)) {
  if (!chunk.includes('places:')) continue;
  const routeName = chunk.match(/name:\s*'([^']+)'/)?.[1] || 'registry';
  const hubSlug = chunk.match(/locationSlug:\s*'([^']+)'/)?.[1];
  const hubCity = hubSlug?.includes('nizhny-novgorod') ? 'nizhny-novgorod' : hubSlug?.split('-')[0];
  const places = chunk.match(/places:\s*\[([\s\S]*?)\]\s*,?\s*\n\s*\}/)?.[1] || '';
  for (const b of places.split(/\{\s*\n/).slice(1)) {
    const slug = b.match(/locationSlug:\s*'([^']+)'/)?.[1];
    if (!slug) continue;
    add(slug, b.match(/name:\s*'([^']+)'/)?.[1], b.match(/desc:\s*'([^']+)'/)?.[1], hubCity, routeName);
  }
}

const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
const enriched = audit.regenerateWorklist.map((row) => {
  const m = meta.get(row.slug) || {};
  const stem = row.url.split('/').pop().replace('.jpg', '');
  return {
    ...row,
    poiName: m.name || row.poiName || stem,
    desc: m.desc || row.desc || '',
    routeName: m.routeName || row.routeName || '',
    hubCity: m.hubCity || row.hubCity,
    stem,
    prompt: `Photorealistic wide 16:9 travel photo: ${m.name || stem}, ${m.desc || ''}, Russia, sunny day, editorial tourism, no text, no watermark`,
  };
});

const out = { ...audit, regenerateWorklist: enriched };
const outPath = path.join(__dirname, 'audit-city-suburbs-visual-output.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

const byCity = {};
for (const r of enriched) {
  const c = r.url.match(/\/venues\/([^/]+)\//)?.[1];
  byCity[c] = (byCity[c] || 0) + 1;
}
console.log(JSON.stringify({ enriched: enriched.length, byCity }, null, 2));
