/**
 * Fix hub image map for one city: unique slug → path, ensure files, patch TS.
 *   node scripts/fix-city-image-map.mjs --city=ryazan
 *   node scripts/fix-city-image-map.mjs --city=ryazan --dry-run
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const venuesRoot = path.join(root, 'apps/public/public/images/venues');

const city = process.argv.find((a) => a.startsWith('--city='))?.slice('--city='.length);
const dryRun = process.argv.includes('--dry-run');
const rethumb = process.argv.includes('--rethumb');

if (!city) {
  console.error('Usage: node scripts/fix-city-image-map.mjs --city=ryazan [--dry-run]');
  process.exit(1);
}

const PACK_PREFIX = {
  ryazan: { pack: 'RYAZAN_IMAGES', file: 'city-place-images.ts' },
  ufa: { pack: 'UFA_HUB_IMAGES', file: 'city-place-images-region-packs.ts' },
  chelyabinsk: { pack: 'CHELYABINSK_IMAGES', file: 'city-place-images.ts' },
  omsk: { pack: 'OMSK_IMAGES', file: 'city-place-images.ts' },
  tyumen: { pack: 'TYUMEN_IMAGES', file: 'city-place-images.ts' },
  voronezh: { pack: 'VORONEZH_IMAGES', file: 'city-place-images.ts' },
  novosibirsk: { pack: 'NOVOSIBIRSK_HUB_IMAGES', file: 'city-place-images-region-packs.ts' },
  krasnoyarsk: { pack: 'KRASNOYARSK_IMAGES', file: 'city-place-images.ts' },
  kaliningrad: { pack: 'KALININGRAD_IMAGES', file: 'city-place-images.ts' },
};

const packCfg = PACK_PREFIX[city];
if (!packCfg) {
  console.error(`City ${city} has no image pack. Supported: ${Object.keys(PACK_PREFIX).join(', ')}`);
  process.exit(1);
}

const packName = packCfg.pack;
const mapPath = path.join(root, 'apps/web/src/lib', packCfg.file);

function hashHex(s) {
  return crypto.createHash('sha1').update(String(s)).digest('hex');
}

function stemOf(slug) {
  return slug.startsWith(`${city}-`) ? slug.slice(city.length + 1) : slug;
}

function expectedUrl(slug) {
  return `/images/venues/${city}/${stemOf(slug)}.jpg`;
}

function absOf(url) {
  return path.join(venuesRoot, url.replace(/^\/images\/venues\//, ''));
}

function exists(url) {
  return fs.existsSync(absOf(url));
}

function loadSharp() {
  return createRequire(path.join(root, 'apps/web/package.json'))('sharp');
}

function buildSvg(seedHex) {
  const hues = [
    ['#0e7490', '#155e75', '#0f172a'],
    ['#0369a1', '#1e3a8a', '#0f172a'],
    ['#047857', '#115e59', '#0f172a'],
    ['#b45309', '#7c2d12', '#1e293b'],
    ['#334155', '#1e293b', '#0f172a'],
  ];
  const n = Number.parseInt(seedHex.slice(0, 6), 16) || 0;
  const [c1, , c3] = hues[n % hues.length];
  const a = Number.parseInt(seedHex.slice(0, 2), 16) / 255;
  const b = Number.parseInt(seedHex.slice(2, 4), 16) / 255;
  return `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200"><defs><linearGradient id="g" x1="${Math.round(a * 100)}%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c3}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${Math.round(300 + a * 900)}" cy="${Math.round(300 + b * 600)}" r="180" fill="#fff" fill-opacity="0.12"/></svg>`;
}

async function ensureVariants(sharp, absBase, { rethumb: force = false } = {}) {
  const { writeVenueStillVariants } = await import('./lib/venue-still-variants.mjs');
  const stem = path.basename(absBase, '.jpg');
  const dir = path.dirname(absBase);
  const cardPath = path.join(dir, `${stem}-card.jpg`);
  const thumbPath = path.join(dir, `${stem}-thumb.jpg`);
  if (!force && fs.existsSync(cardPath) && fs.existsSync(thumbPath)) {
    return;
  }
  await writeVenueStillVariants(sharp, absBase, dir, stem);
}

async function ensureFile(sharp, slug, parentUrl) {
  const url = expectedUrl(slug);
  const abs = absOf(url);
  if (exists(url) && fs.statSync(abs).size >= 25000) {
    if (!dryRun) await ensureVariants(sharp, abs, { rethumb });
    return { slug, url, action: 'exists' };
  }
  if (dryRun) return { slug, url, action: 'would-create' };

  fs.mkdirSync(path.dirname(abs), { recursive: true });
  let buf = null;
  if (parentUrl && exists(parentUrl) && fs.statSync(absOf(parentUrl)).size >= 40000) {
    const h = hashHex(slug);
    buf = await sharp(absOf(parentUrl))
      .rotate()
      .modulate({
        hue: (Number.parseInt(h.slice(0, 4), 16) % 80) - 40,
        saturation: 0.85 + (Number.parseInt(h.slice(4, 6), 16) % 30) / 100,
        brightness: 0.9 + (Number.parseInt(h.slice(6, 8), 16) % 20) / 100,
      })
      .jpeg({ quality: 84, mozjpeg: true })
      .toBuffer();
  }
  if (!buf) {
    buf = await sharp(Buffer.from(buildSvg(hashHex(slug))))
      .jpeg({ quality: 86, mozjpeg: true })
      .toBuffer();
  }
  await sharp(buf)
    .resize(1600, 1067, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(abs);
  const stem = path.basename(abs, '.jpg');
  const dir = path.dirname(abs);
  const { writeVenueStillVariants } = await import('./lib/venue-still-variants.mjs');
  await writeVenueStillVariants(sharp, abs, dir, stem);
  return { slug, url, action: 'created' };
}

function extractBlock(name, src) {
  const exportRe = new RegExp(`export const ${name}: Record<string, string> = \\{([\\s\\S]*?)\\n\\};`);
  const constRe = new RegExp(`const ${name}: Record<string, string> = \\{([\\s\\S]*?)\\n\\};`);
  const m = src.match(exportRe) || src.match(constRe);
  if (!m) return {};
  const obj = {};
  for (const line of m[1].split('\n')) {
    const mm = line.match(/^\s*'([^']+)':\s*(.+?),?\s*$/);
    if (!mm) continue;
    obj[mm[1]] = mm[2].trim().replace(/,$/, '');
  }
  return obj;
}

function resolveValue(raw, src) {
  if (raw.startsWith("'")) return raw.slice(1, -1);
  const re = new RegExp(`const ${raw}\\s*=\\s*'([^']+)';`);
  const m = src.match(re);
  return m ? m[1] : raw;
}

const src = fs.readFileSync(mapPath, 'utf8');
const rawPack = extractBlock(packName, src);
const slugs = Object.keys(rawPack).filter((s) => s.startsWith(`${city}-`));

const sharp = loadSharp();
const parentByStem = {};
for (const slug of slugs) {
  const stem = stemOf(slug);
  const cur = resolveValue(rawPack[slug], src);
  if (cur && !cur.includes('/identity-')) parentByStem[stem] = cur;
}

const newEntries = {};
const fileOps = [];

for (const slug of slugs.sort()) {
  const url = expectedUrl(slug);
  const parent = parentByStem[stemOf(slug)] || null;
  fileOps.push(await ensureFile(sharp, slug, parent));
  newEntries[slug] = url;
}

const lines = Object.entries(newEntries)
  .map(([slug, url]) => `  '${slug}': '${url}',`)
  .join('\n');

const blockRe = new RegExp(
  `(export )?const ${packName}: Record<string, string> = \\{[\\s\\S]*?\\n\\};`,
);
const exportKw = packCfg.file.includes('region-packs') ? 'export ' : '';
const newBlock = `${exportKw}const ${packName}: Record<string, string> = {\n${lines}\n};`;

if (!dryRun) {
  const next = src.replace(blockRe, newBlock);
  writeRetry(mapPath, next);
}

function writeRetry(p, content, tries = 8) {
  for (let i = 0; i < tries; i++) {
    try {
      const tmp = `${p}.tmp-${process.pid}`;
      fs.writeFileSync(tmp, content);
      fs.renameSync(tmp, p);
      return;
    } catch (e) {
      if (i === tries - 1) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500 * (i + 1));
    }
  }
}

const created = fileOps.filter((o) => o.action === 'created').length;
const existed = fileOps.filter((o) => o.action === 'exists').length;
console.log(JSON.stringify({ city, packName, slugs: slugs.length, created, existed, dryRun }, null, 2));
