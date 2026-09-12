/**
 * Sharp/SVG covers for PUBLISHED GASTRO locations still without editorial file.
 * AI top covers are skipped via --skip-slugs / existing files.
 *
 *   node scripts/generate-gastro-missing-covers.mjs
 *   node scripts/generate-gastro-missing-covers.mjs --write-map
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { catalogCoverHash } from './lib/catalog-cover-generate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const WIDTH = 1600;
const HEIGHT = 1200;
const missingPath = path.join(rootDir, '.deploy-tmp/gastro-missing.json');
const outPublic = path.join(rootDir, 'apps/public/public/images/venues');
const outWeb = path.join(rootDir, 'apps/web/public/images/venues');
const mapPath = path.join(rootDir, 'apps/web/src/lib/city-place-images.ts');

const CITY_FOLDER = {
  'санкт-петербург': 'saint-petersburg',
  moskva: 'moscow',
  москва: 'moscow',
  калининград: 'kaliningrad',
  астрахань: 'astrahan',
  'ростов-на-дону': 'rostov-na-donu',
};

function cityFolder(citySlug, slug) {
  if (CITY_FOLDER[citySlug]) return CITY_FOLDER[citySlug];
  if (/saint-petersburg/i.test(slug)) return 'saint-petersburg';
  if (/^moscow-/i.test(slug)) return 'moscow';
  if (/^kaliningrad-/i.test(slug)) return 'kaliningrad';
  if (/^astrahan-/i.test(slug)) return 'astrahan';
  if (/^rostov-na-donu-/i.test(slug)) return 'rostov-na-donu';
  const m = String(slug || '').match(/^([a-z0-9-]+?)-/);
  return m ? m[1] : 'misc';
}

function fileStem(slug, city) {
  let s = slug;
  const prefixes = [
    'saint-petersburg-',
    'moscow-',
    'kaliningrad-',
    'astrahan-',
    'rostov-na-donu-',
    city + '-',
  ];
  for (const p of prefixes) {
    if (s.startsWith(p)) {
      s = s.slice(p.length);
      break;
    }
  }
  return s.replace(/[^a-z0-9-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || catalogCoverHash(slug);
}

function loadSharp() {
  return createRequire(path.join(rootDir, 'apps/web/package.json'))('sharp');
}

function palette(seedHex) {
  const hues = [
    ['#9a3412', '#7c2d12', '#1e293b'],
    ['#b45309', '#92400e', '#1e293b'],
    ['#0f766e', '#115e59', '#0f172a'],
    ['#7c2d12', '#451a03', '#1e293b'],
    ['#a16207', '#713f12', '#1e293b'],
    ['#be123c', '#9f1239', '#1e293b'],
    ['#0369a1', '#1e3a8a', '#0f172a'],
    ['#334155', '#1e293b', '#0f172a'],
  ];
  const n = Number.parseInt(seedHex.slice(0, 6), 16) || 0;
  return hues[n % hues.length];
}

function buildSvg(seedHex) {
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
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="55%" stop-color="${c2}"/>
      <stop offset="100%" stop-color="${c3}"/>
    </linearGradient>
    <radialGradient id="glow1" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="28"/></filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <g transform="rotate(${rotate} ${WIDTH / 2} ${HEIGHT / 2})">
    <ellipse cx="${cx1}" cy="${cy1}" rx="${r1}" ry="${Math.round(r1 * 0.72)}" fill="url(#glow1)" filter="url(#soft)"/>
    <ellipse cx="${cx2}" cy="${cy2}" rx="${r2}" ry="${Math.round(r2 * 0.65)}" fill="url(#glow1)" filter="url(#soft)"/>
  </g>
</svg>`;
}

async function main() {
  const writeMap = process.argv.includes('--write-map');
  const skipArg = process.argv.find((a) => a.startsWith('--skip-slugs='));
  const skip = new Set(
    skipArg
      ? skipArg
          .slice('--skip-slugs='.length)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
  );
  const missing = JSON.parse(fs.readFileSync(missingPath, 'utf8'));
  const sharp = loadSharp();
  const mapEntries = [];
  let created = 0;
  let existed = 0;
  let skipped = 0;
  for (const item of missing) {
    if (skip.has(item.slug)) {
      skipped += 1;
      continue;
    }
    const city = cityFolder(item.city, item.slug);
    const stem = fileStem(item.slug, city);
    const file = `${stem}.jpg`;
    const url = `/images/venues/${city}/${file}`;
    for (const base of [outPublic, outWeb]) {
      fs.mkdirSync(path.join(base, city), { recursive: true });
    }
    const absPublic = path.join(outPublic, city, file);
    const absWeb = path.join(outWeb, city, file);
    if (fs.existsSync(absPublic) && fs.statSync(absPublic).size > 20_000) {
      existed += 1;
      if (!fs.existsSync(absWeb) || fs.statSync(absWeb).size < 20_000) {
        fs.copyFileSync(absPublic, absWeb);
      }
      mapEntries.push([item.slug, url]);
      continue;
    }
    const seedHex = catalogCoverHash(`gastro-cover:${item.slug}`);
    const svg = Buffer.from(buildSvg(seedHex));
    await sharp(svg).jpeg({ quality: 86, mozjpeg: true }).toFile(absPublic);
    fs.copyFileSync(absPublic, absWeb);
    created += 1;
    mapEntries.push([item.slug, url]);
  }
  console.log(JSON.stringify({ created, existed, skipped, mapped: mapEntries.length }));
  if (writeMap) {
    const blockLines = mapEntries.map(([slug, url]) => `  '${slug}': '${url}',`);
    const markerStart = '// GASTRO_PACK_IMAGES_START';
    const markerEnd = '// GASTRO_PACK_IMAGES_END';
    let src = fs.readFileSync(mapPath, 'utf8');
    const block =
      `${markerStart}\n` +
      `const GASTRO_PACK_IMAGES: Record<string, string> = {\n` +
      blockLines.join('\n') +
      `\n};\n` +
      `${markerEnd}\n`;
    if (src.includes(markerStart)) {
      src = src.replace(
        new RegExp(`${markerStart}[\\s\\S]*?${markerEnd}\\n`),
        block,
      );
    } else {
      src = src.replace(
        'const EDITORIAL_IMAGES_BY_SLUG: Record<string, string> = {',
        `${block}\nconst EDITORIAL_IMAGES_BY_SLUG: Record<string, string> = {`,
      );
      if (!src.includes('...GASTRO_PACK_IMAGES')) {
        src = src.replace(
          '...LOCATION_PACK_IMAGES,\n};',
          '...LOCATION_PACK_IMAGES,\n  ...GASTRO_PACK_IMAGES,\n};',
        );
      }
    }
    fs.writeFileSync(mapPath, src);
    console.log('updated', mapPath);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
