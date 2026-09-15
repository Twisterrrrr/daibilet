/**
 * Break pixel-clone venue stills + unflip upside-down bases for hub cities.
 * Deterministic unique JPEG per stem (sharp SVG), preserves one canonical keep per clone group.
 *
 *   node scripts/break-hub-image-clones.mjs --cities=chelyabinsk,voronezh,novosibirsk,krasnoyarsk
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { catalogCoverHash } from './lib/catalog-cover-generate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const sharp = createRequire(path.join(root, 'apps/web/package.json'))('sharp');

const WIDTH = 1600;
const HEIGHT = 1067;
const venuesRoot = path.join(root, 'apps/web/public/images/venues');

const HUES = [
  ['#0ea5e9', '#0369a1', '#0f172a'],
  ['#d97706', '#92400e', '#1e293b'],
  ['#16a34a', '#166534', '#0f172a'],
  ['#db2777', '#9d174d', '#0f172a'],
  ['#6d28d9', '#312e81', '#0f172a'],
  ['#0f766e', '#115e59', '#0f172a'],
  ['#c2410c', '#7c2d12', '#1e293b'],
  ['#1d4ed8', '#1e3a8a', '#0f172a'],
];

/** Prefer keeping these stems as the "real" photo when they collide with clones. */
const KEEP_PRIORITY = [
  'gosudarstvennyy-istoricheskiy-muzey-yuzhnogo-urala',
  'pamyatnik-laboratornoy-myshi',
  'koltsovo',
  'koltsovo-ozero-s-lebedyami',
  'identity-gastro',
  'identity-symbol',
  'akademgorodok',
  'taganay',
  'divnogorskaya-naberezhnaya',
];

const FORCE_UNFLIP = new Set([
  'chelyabinsk/identity-gastro',
  'voronezh/identity-art',
  // bim: was sideways (90°), not 180 - do not force-unflip here
  'krasnoyarsk/divnogorskaya-naberezhnaya',
  'krasnoyarsk/tsar-ryba-sliznevo',
  'novosibirsk/plyazh-zvezda-obskoe-more',
]);

/** Koltsovo park wrongly had the Akademgorodok mouse — replace from lake still. */
const FORCE_COPY = [
  {
    city: 'novosibirsk',
    from: 'koltsovo-ozero-s-lebedyami',
    to: 'koltsovo-park',
  },
];

function titleFromStem(stem) {
  return stem
    .replace(/^identity-/, '')
    .split('-')
    .slice(0, 5)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function buildSvg(seedHex, title) {
  const n = Number.parseInt(seedHex.slice(0, 6), 16) || 0;
  const [c1, c2, c3] = HUES[n % HUES.length];
  const a = Number.parseInt(seedHex.slice(0, 2), 16) / 255;
  const b = Number.parseInt(seedHex.slice(2, 4), 16) / 255;
  const cx1 = Math.round(200 + a * 1200);
  const cy1 = Math.round(100 + b * 700);
  const r1 = Math.round(300 + a * 200);
  const safeTitle = String(title || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .slice(0, 42);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="55%" stop-color="${c2}"/>
      <stop offset="100%" stop-color="${c3}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <ellipse cx="${cx1}" cy="${cy1}" rx="${r1}" ry="${Math.round(r1 * 0.62)}" fill="url(#glow)"/>
  <rect x="0" y="${HEIGHT - 140}" width="${WIDTH}" height="140" fill="#0f172a" opacity="0.5"/>
  <text x="48" y="${HEIGHT - 56}" fill="#f8fafc" font-family="Arial,sans-serif" font-size="40" font-weight="600">${safeTitle}</text>
</svg>`;
}

async function writeVariants(dir, stem, buf) {
  const { writeVenueStillVariants } = await import('./lib/venue-still-variants.mjs');
  await writeVenueStillVariants(sharp, buf, dir, stem);
}

async function regenStem(city, stem) {
  const seedHex = catalogCoverHash(`${city}/${stem}`);
  const svg = buildSvg(seedHex, titleFromStem(stem));
  const buf = await sharp(Buffer.from(svg)).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
  const dir = path.join(venuesRoot, city);
  await writeVariants(dir, stem, buf);
}

async function ahashFile(filePath) {
  const { data, info } = await sharp(filePath)
    .greyscale()
    .resize(8, 8, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const avg = data.reduce((s, v) => s + v, 0) / data.length;
  let bits = '';
  for (const v of data) bits += v >= avg ? '1' : '0';
  return bits;
}

function pickKeep(stems) {
  for (const preferred of KEEP_PRIORITY) {
    if (stems.includes(preferred)) return preferred;
  }
  return stems.slice().sort()[0];
}

async function processCity(city) {
  const dir = path.join(venuesRoot, city);
  if (!fs.existsSync(dir)) {
    console.warn('skip missing', city);
    return { city, regenerated: 0, unflipped: 0 };
  }

  const bases = fs
    .readdirSync(dir)
    .filter(
      (f) =>
        f.endsWith('.jpg') &&
        !f.endsWith('-card.jpg') &&
        !f.endsWith('-thumb.jpg') &&
        !f.includes('preview'),
    );

  const byHash = new Map();
  for (const file of bases) {
    const stem = file.replace(/\.jpg$/i, '');
    const h = await ahashFile(path.join(dir, file));
    if (!byHash.has(h)) byHash.set(h, []);
    byHash.get(h).push(stem);
  }

  let regenerated = 0;
  for (const stems of byHash.values()) {
    if (stems.length < 2) continue;
    const keep = pickKeep(stems);
    for (const stem of stems) {
      if (stem === keep) continue;
      await regenStem(city, stem);
      regenerated += 1;
      console.log(`regen ${city}/${stem} (clone of ${keep})`);
    }
  }

  let unflipped = 0;
  for (const key of FORCE_UNFLIP) {
    const [c, stem] = key.split('/');
    if (c !== city) continue;
    const file = path.join(dir, `${stem}.jpg`);
    if (!fs.existsSync(file)) continue;
    const buf = await sharp(file).rotate(180).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
    await writeVariants(dir, stem, buf);
    unflipped += 1;
    console.log(`unflip ${city}/${stem}`);
  }

  return { city, regenerated, unflipped };
}

async function main() {
  const citiesArg = process.argv.find((a) => a.startsWith('--cities='));
  const cities = citiesArg
    ? citiesArg.slice('--cities='.length).split(',').map((s) => s.trim())
    : ['chelyabinsk', 'voronezh', 'novosibirsk', 'krasnoyarsk'];

  for (const { city, from, to } of FORCE_COPY) {
    if (!cities.includes(city)) continue;
    const dir = path.join(venuesRoot, city);
    const src = path.join(dir, `${from}.jpg`);
    if (!fs.existsSync(src)) continue;
    const buf = await sharp(src).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
    await writeVariants(dir, to, buf);
    console.log(`copy ${city}/${from} → ${to}`);
  }

  const summary = [];
  for (const city of cities) {
    summary.push(await processCity(city));
  }
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
