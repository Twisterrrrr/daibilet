/**
 * Verify Ryazan must-see slugs resolve to unique thumb paths.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hubPath = path.join(root, 'apps/web/src/lib/ryazan-hub.ts');
const mapPath = path.join(root, 'apps/web/src/lib/city-place-images.ts');
const regionPath = path.join(root, 'apps/web/src/lib/city-place-images-region-packs.ts');
const venuesRoot = path.join(root, 'apps/public/public/images/venues');

const hubSrc = fs.readFileSync(hubPath, 'utf8');
const src = fs.readFileSync(mapPath, 'utf8') + '\n' + fs.readFileSync(regionPath, 'utf8');

const slugs = [...hubSrc.matchAll(/'ryazan-[^']+'/g)].map((m) => m[0].slice(1, -1));
const uniqueSlugs = [...new Set(slugs)];

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
    obj[mm[1]] = val.startsWith("'") ? val.slice(1, -1) : resolveConst(val) || val;
  }
  return obj;
}

const PACK_ORDER = [
  'KAZAN_IMAGES', 'SAMARA_IMAGES', 'KRASNODAR_IMAGES', 'NIZHNY_NOVGOROD_IMAGES',
  'SAINT_PETERSBURG_IMAGES', 'KALININGRAD_IMAGES', 'PERM_IMAGES', 'MOSCOW_IMAGES',
  'EXTRA_AI_LOCATION_IMAGES', 'LOCATION_PACK_IMAGES', 'GASTRO_PACK_IMAGES', 'MONUMENT_PACK_IMAGES',
  'KRASNOYARSK_IMAGES', 'PAINTED_LINE_IMAGES_20260815', 'VORONEZH_IMAGES', 'RYAZAN_IMAGES',
  'OMSK_IMAGES', 'CHELYABINSK_IMAGES', 'TYUMEN_IMAGES', 'UFA_HUB_IMAGES', 'NOVOSIBIRSK_HUB_IMAGES',
  'SUBURB_NESTED_AUTO_IMAGES',
];

const merged = {};
for (const pack of PACK_ORDER) Object.assign(merged, extractBlock(pack));

function thumbUrl(baseUrl) {
  return baseUrl.replace(/\.jpg$/, '-thumb.jpg');
}

function md5File(rel) {
  const abs = path.join(venuesRoot, rel.replace(/^\/images\/venues\//, ''));
  if (!fs.existsSync(abs)) return null;
  return crypto.createHash('md5').update(fs.readFileSync(abs)).digest('hex');
}

const kremlGroup = [
  'ryazan-dvorets-olega', 'ryazan-pevcheskiy-korpus', 'ryazan-konsistorskiy-korpus',
  'ryazan-uspenskiy-sobor', 'ryazan-ryazanskiy-kreml',
];

console.log('=== Kreml group ===');
const kremlMd5 = new Set();
for (const slug of kremlGroup) {
  const url = merged[slug];
  const thumb = thumbUrl(url);
  const md5 = md5File(thumb);
  console.log(slug, '->', thumb, md5 ? 'OK' : 'MISSING', md5 || '');
  if (md5) kremlMd5.add(md5);
}
console.log('Unique thumb MD5 in kreml group:', kremlMd5.size, '/', kremlGroup.length);

const byThumb = {};
let missing = 0;
for (const slug of uniqueSlugs) {
  const url = merged[slug];
  if (!url) {
    console.log('NO MAP', slug);
    missing++;
    continue;
  }
  const thumb = thumbUrl(url);
  const md5 = md5File(thumb);
  if (!md5) missing++;
  (byThumb[thumb] ||= []).push(slug);
}

const dupes = Object.entries(byThumb).filter(([, s]) => s.length > 1);
console.log('\n=== Summary ===');
console.log('must-see slugs:', uniqueSlugs.length);
console.log('missing thumbs:', missing);
console.log('duplicate thumb paths:', dupes.length);
if (dupes.length) {
  for (const [thumb, s] of dupes.slice(0, 10)) {
    console.log(thumb, s.join(', '));
  }
}
