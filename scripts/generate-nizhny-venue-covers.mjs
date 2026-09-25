/**
 * Unique JPEG covers for Nizhny editorial pack (owner filenames).
 * Uses same sharp SVG approach as catalog-cover-generate - unique per seed, not city placeholders.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { writeGeneratedCatalogCover, catalogCoverHash } from './lib/catalog-cover-generate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const nnPath = path.join(rootDir, 'scripts/data/must-see-editorial-nizhny.json');
const rows = JSON.parse(fs.readFileSync(nnPath, 'utf8'));

const WIDTH = 1600;
const HEIGHT = 1200;

function loadSharp() {
  return createRequire(path.join(rootDir, 'apps/web/package.json'))('sharp');
}

function palette(seedHex) {
  const hues = [
    ['#b45309', '#7c2d12', '#1e293b'],
    ['#0369a1', '#0e7490', '#0f172a'],
    ['#047857', '#115e59', '#0f172a'],
    ['#9a3412', '#7c2d12', '#1e293b'],
    ['#1d4ed8', '#1e3a8a', '#0f172a'],
    ['#be123c', '#881337', '#0f172a'],
    ['#6d28d9', '#312e81', '#0f172a'],
    ['#0f766e', '#115e59', '#0f172a'],
    ['#c2410c', '#7c2d12', '#0f172a'],
    ['#334155', '#1e293b', '#0f172a'],
  ];
  const n = Number.parseInt(seedHex.slice(0, 6), 16) || 0;
  return hues[n % hues.length];
}

function buildSvg(seedHex, title) {
  const [c1, c2, c3] = palette(seedHex);
  const a = Number.parseInt(seedHex.slice(0, 2), 16) / 255;
  const b = Number.parseInt(seedHex.slice(2, 4), 16) / 255;
  const c = Number.parseInt(seedHex.slice(4, 6), 16) / 255;
  const d = Number.parseInt(seedHex.slice(6, 8), 16) / 255;
  const cx1 = Math.round(200 + a * 1200);
  const cy1 = Math.round(150 + b * 900);
  const cx2 = Math.round(300 + c * 1000);
  const cy2 = Math.round(200 + d * 800);
  const r1 = Math.round(380 + a * 220);
  const r2 = Math.round(320 + b * 260);
  const rotate = Math.round(a * 40 - 20);
  const safeTitle = String(title || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;')
    .slice(0, 42);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="55%" stop-color="${c2}"/>
      <stop offset="100%" stop-color="${c3}"/>
    </linearGradient>
    <radialGradient id="glow1" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="28"/></filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <g transform="rotate(${rotate} ${WIDTH / 2} ${HEIGHT / 2})">
    <ellipse cx="${cx1}" cy="${cy1}" rx="${r1}" ry="${Math.round(r1 * 0.72)}" fill="url(#glow1)" filter="url(#soft)"/>
    <ellipse cx="${cx2}" cy="${cy2}" rx="${r2}" ry="${Math.round(r2 * 0.65)}" fill="url(#glow1)" filter="url(#soft)"/>
  </g>
  <rect x="0" y="${HEIGHT - 220}" width="${WIDTH}" height="220" fill="#0f172a" opacity="0.45"/>
  <text x="72" y="${HEIGHT - 100}" fill="#f8fafc" font-family="Georgia, serif" font-size="42">${safeTitle}</text>
</svg>`;
}

async function main() {
  const sharp = loadSharp();
  const outDirs = [
    path.join(rootDir, 'apps/web/public/images/venues/nizhny-novgorod'),
    path.join(rootDir, 'apps/public/public/images/venues/nizhny-novgorod'),
  ];
  for (const d of outDirs) fs.mkdirSync(d, { recursive: true });

  let wrote = 0;
  for (const row of rows) {
    const file = row.coverFile;
    if (!file) continue;
    const seedHex = catalogCoverHash(`nn:${row.slug}:${file}`);
    const svg = buildSvg(seedHex, row.title);
    const buffer = await sharp(Buffer.from(svg)).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
    for (const d of outDirs) {
      fs.writeFileSync(path.join(d, file), buffer);
    }
    wrote += 1;
    console.log('ok', file, buffer.length);
  }
  console.log(JSON.stringify({ wrote, total: rows.length }));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
