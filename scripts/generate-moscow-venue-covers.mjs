/**
 * Unique JPEG covers for Moscow must-see pack (Phase C).
 * Catalog sharp/SVG pipeline (same as generate-nizhny-venue-covers.mjs).
 *
 *   node scripts/generate-moscow-venue-covers.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { catalogCoverHash } from './lib/catalog-cover-generate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const cityInfoPath = path.join(rootDir, 'apps/web/src/lib/cityInfo.ts');

const WIDTH = 1600;
const HEIGHT = 1200;

/** slug -> short filename under /images/venues/moscow/ */
const SLUG_TO_FILE = {
  'moscow-krasnaya-ploschad-i-kreml': 'krasnaya-ploschad-kreml.jpg',
  'moscow-sobor-vasiliya-blazhennogo': 'sobor-vasiliya-blazhennogo.jpg',
  'moscow-bol-shoy-teatr': 'bolshoy-teatr.jpg',
  'moscow-tret-yakovskaya-galereya': 'tretyakovskaya-galereya.jpg',
  'moscow-park-zaryad-e': 'park-zaryade.jpg',
  'moscow-vdnh': 'vdnh.jpg',
  'moscow-moskva-siti': 'moskva-siti.jpg',
  'moscow-vorobevy-gory': 'vorobevy-gory.jpg',
  'moscow-hram-hrista-spasitelya': 'hram-hrista-spasitelya.jpg',
  'moscow-novodevichiy-monastyr': 'novodevichiy-monastyr.jpg',
  'moscow-ostankinskaya-telebashnya': 'ostankinskaya-telebashnya.jpg',
  'moscow-gum': 'gum.jpg',
  'moscow-gmii-imeni-pushkina': 'gmii-pushkina.jpg',
  'moscow-novaya-tretyakovka': 'novaya-tretyakovka.jpg',
  'moscow-muzey-garazh': 'muzey-garazh.jpg',
  'moscow-muzey-kosmonavtiki': 'muzey-kosmonavtiki.jpg',
  'moscow-politehnicheskiy-muzey': 'politehnicheskiy-muzey.jpg',
  'moscow-evreyskiy-muzey': 'evreyskiy-muzey.jpg',
  'moscow-muzey-moskvy': 'muzey-moskvy.jpg',
  'moscow-bunker-42': 'bunker-42.jpg',
  'moscow-muzey-bulgakova': 'muzey-bulgakova.jpg',
  'moscow-muzey-russkogo-impressionizma': 'muzey-russkogo-impressionizma.jpg',
  'moscow-paryaschiy-most-zaryadya': 'paryaschiy-most-zaryadya.jpg',
  'moscow-smotrovaya-vorobevyh-gor': 'smotrovaya-vorobevyh-gor.jpg',
  'moscow-patriarshiy-most': 'patriarshiy-most.jpg',
  'moscow-krymskaya-naberezhnaya': 'krymskaya-naberezhnaya.jpg',
  'moscow-kremlevskaya-naberezhnaya': 'kremlevskaya-naberezhnaya.jpg',
  'moscow-smotrovaya-moskva-siti': 'smotrovaya-moskva-siti.jpg',
  'moscow-kotelnicheskaya-naberezhnaya': 'kotelnicheskaya-naberezhnaya.jpg',
  'moscow-smotrovaya-ostankino': 'smotrovaya-ostankino.jpg',
  'moscow-staryy-arbat': 'staryy-arbat.jpg',
  'moscow-nikolskaya-ulitsa': 'nikolskaya-ulitsa.jpg',
  'moscow-patriarshie-prudy': 'patriarshie-prudy.jpg',
  'moscow-kuznetskiy-most': 'kuznetskiy-most.jpg',
  'moscow-kamergerskiy-pereulok': 'kamergerskiy-pereulok.jpg',
  'moscow-pyatnitskaya-ulitsa': 'pyatnitskaya-ulitsa.jpg',
  'moscow-park-gorkogo': 'park-gorkogo.jpg',
  'moscow-muzeon': 'muzeon.jpg',
  'moscow-kolomenskoe': 'kolomenskoe.jpg',
  'moscow-tsaritsyno': 'tsaritsyno.jpg',
  'moscow-kuskovo': 'kuskovo.jpg',
  'moscow-izmaylovskiy-park': 'izmaylovskiy-park.jpg',
  'moscow-sokolniki': 'sokolniki.jpg',
  'moscow-aptekarskiy-ogorod': 'aptekarskiy-ogorod.jpg',
  'moscow-kazanskiy-sobor-krasnaya': 'kazanskiy-sobor-krasnaya.jpg',
  'moscow-pokrovskiy-monastyr': 'pokrovskiy-monastyr.jpg',
  'moscow-donskoy-monastyr': 'donskoy-monastyr.jpg',
  'moscow-bogoyavlenskiy-sobor-elohovo': 'bogoyavlenskiy-sobor-elohovo.jpg',
  'moscow-hram-vozneseniya-kolomenskoe': 'hram-vozneseniya-kolomenskoe.jpg',
  'moscow-marfo-mariinskaya-obitel': 'marfo-mariinskaya-obitel.jpg',
  'moscow-zoopark': 'zoopark.jpg',
  'moscow-moskvarium': 'moskvarium.jpg',
  'moscow-planetariy': 'planetariy.jpg',
  'moscow-eksperimentanium': 'eksperimentanium.jpg',
  'moscow-vinzavod': 'vinzavod.jpg',
  'moscow-artplay': 'artplay.jpg',
  'moscow-flakon': 'flakon.jpg',
  'moscow-danilovskiy-rynok': 'danilovskiy-rynok.jpg',
};

function loadSharp() {
  return createRequire(path.join(rootDir, 'apps/web/package.json'))('sharp');
}

function palette(seedHex) {
  const hues = [
    ['#9a3412', '#7c2d12', '#1e293b'],
    ['#0369a1', '#0e7490', '#0f172a'],
    ['#047857', '#115e59', '#0f172a'],
    ['#b45309', '#7c2d12', '#1e293b'],
    ['#1d4ed8', '#1e3a8a', '#0f172a'],
    ['#be123c', '#881337', '#0f172a'],
    ['#0f766e', '#115e59', '#0f172a'],
    ['#c2410c', '#7c2d12', '#0f172a'],
    ['#334155', '#1e293b', '#0f172a'],
    ['#7f1d1d', '#450a0a', '#0f172a'],
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

function extractMoscowMustSee(src) {
  const start = Math.max(src.indexOf("'moscow':"), src.indexOf('moscow:'));
  if (start < 0) throw new Error('moscow not found');
  const mustSeeKey = src.indexOf('mustSee:', start);
  const arrStart = src.indexOf('[', mustSeeKey);
  let depth = 0;
  let arrEnd = arrStart;
  for (let i = arrStart; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') {
      depth--;
      if (depth === 0) {
        arrEnd = i;
        break;
      }
    }
  }
  const block = src.slice(arrStart, arrEnd + 1);
  const items = [];
  const re = /\{[^{}]*?\}/gs;
  let m;
  while ((m = re.exec(block))) {
    const o = m[0];
    const name = (o.match(/name:\s*'((?:\\'|[^'])*)'/) || [])[1];
    const slug = (o.match(/(?:venueSlug|locationSlug):\s*'([^']+)'/) || [])[1];
    if (name && slug) items.push({ name, slug });
  }
  return items;
}

async function main() {
  const sharp = loadSharp();
  const items = extractMoscowMustSee(fs.readFileSync(cityInfoPath, 'utf8'));
  const outDirs = [
    path.join(rootDir, 'apps/web/public/images/venues/moscow'),
    path.join(rootDir, 'apps/public/public/images/venues/moscow'),
  ];
  for (const d of outDirs) fs.mkdirSync(d, { recursive: true });

  const mapLines = [];
  let wrote = 0;
  const missingMap = [];
  for (const item of items) {
    const file = SLUG_TO_FILE[item.slug];
    if (!file) {
      missingMap.push(item.slug);
      continue;
    }
    const seedHex = catalogCoverHash(`msk:${item.slug}:${file}`);
    const svg = buildSvg(seedHex, item.name);
    const buffer = await sharp(Buffer.from(svg)).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
    for (const d of outDirs) {
      fs.writeFileSync(path.join(d, file), buffer);
    }
    mapLines.push(
      `  '${item.slug}':\n    '/images/venues/moscow/${file}',`,
    );
    wrote += 1;
  }

  if (missingMap.length) {
    console.error('Missing SLUG_TO_FILE for:', missingMap);
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        wrote,
        mapEntries: mapLines.length,
        outDirs: outDirs.map((d) => path.relative(rootDir, d)),
        tsSnippetPreview: mapLines.slice(0, 3),
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(
    path.join(rootDir, '.deploy-tmp/_moscow_images_map.ts.txt'),
    mapLines.join('\n') + '\n',
    'utf8',
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
