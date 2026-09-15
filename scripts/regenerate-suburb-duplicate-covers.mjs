/**
 * Regenerate unique suburb POI base+card+thumb for duplicate placeholders.
 * Deterministic sharp/SVG per slug (unique MD5, no external API).
 *
 *   node scripts/regenerate-suburb-duplicate-covers.mjs
 *   node scripts/regenerate-suburb-duplicate-covers.mjs --cities=ufa,tver
 *   node scripts/regenerate-suburb-duplicate-covers.mjs --dry-run
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
const venuesRoot = path.join(root, 'apps/public/public/images/venues');

const WIDTH = 1600;
const HEIGHT = 1067;

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

function stemFromUrl(url) {
  return url.split('/').pop().replace(/\.jpe?g$/i, '');
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
    .slice(0, 48);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="55%" stop-color="${c2}"/>
      <stop offset="100%" stop-color="${c3}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="24"/></filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <ellipse cx="${cx1}" cy="${cy1}" rx="${r1}" ry="${Math.round(r1 * 0.65)}" fill="url(#glow)" filter="url(#soft)"/>
  <rect x="0" y="${HEIGHT - 120}" width="${WIDTH}" height="120" fill="#0f172a" opacity="0.45"/>
  <text x="48" y="${HEIGHT - 48}" fill="#f8fafc" font-family="Arial,sans-serif" font-size="42" font-weight="600">${safeTitle}</text>
</svg>`;
}

async function writeStill(stem, city, title, dryRun) {
  const seedHex = catalogCoverHash(`${city}/${stem}`);
  const svg = buildSvg(seedHex, title);
  const buf = await sharp(Buffer.from(svg))
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
  const dir = path.join(venuesRoot, city);
  if (dryRun) return { stem, city, ok: true, bytes: buf.length, dryRun: true };
  fs.mkdirSync(dir, { recursive: true });
  await sharp(buf).toFile(path.join(dir, `${stem}.jpg`));
  await sharp(buf)
    .resize(640, null, { withoutEnlargement: true })
    .jpeg({ quality: 68 })
    .toFile(path.join(dir, `${stem}-card.jpg`));
  await sharp(buf)
    .resize(320, null, { withoutEnlargement: true })
    .jpeg({ quality: 65 })
    .toFile(path.join(dir, `${stem}-thumb.jpg`));
  return { stem, city, ok: true, bytes: buf.length };
}

const dryRun = process.argv.includes('--dry-run');
const citiesArg = process.argv.find((a) => a.startsWith('--cities='));
const cityFilter = citiesArg
  ? new Set(citiesArg.slice('--cities='.length).split(',').map((s) => s.trim()))
  : null;

const auditPath = path.join(__dirname, 'audit-city-suburbs-visual-output.json');
let wl = JSON.parse(fs.readFileSync(auditPath, 'utf8')).regenerateWorklist;
if (cityFilter) wl = wl.filter((r) => cityFilter.has(r.hubCity));

let ok = 0;
let skipped = 0;
const failures = [];
for (const row of wl) {
  const city = row.hubCity || row.url.match(/\/venues\/([^/]+)\//)?.[1];
  const stem = row.stem || stemFromUrl(row.url);
  const basePath = path.join(venuesRoot, city, `${stem}.jpg`);
  if (fs.existsSync(basePath) && row.duplicateHash) {
    const md5 = crypto.createHash('md5').update(fs.readFileSync(basePath)).digest('hex');
    if (md5 !== row.duplicateHash) {
      skipped++;
      continue;
    }
  }
  const title = row.poiName && row.poiName !== stem ? row.poiName : stem.replace(/-/g, ' ');
  try {
    const r = await writeStill(stem, city, title, dryRun);
    if (r.ok) ok++;
  } catch (e) {
    failures.push({ stem, city, error: String(e) });
  }
}

console.log(JSON.stringify({ total: wl.length, written: ok, skipped, failures: failures.length, dryRun }, null, 2));
if (failures.length) console.error(JSON.stringify(failures.slice(0, 5), null, 2));
