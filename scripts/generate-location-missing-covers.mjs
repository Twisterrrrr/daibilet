/**
 * Unique JPEG covers for location-family places still on venue-auto stubs.
 * Same sharp/SVG pipeline as moscow/nizhny packs (bulk catalog, not AI).
 *
 *   node scripts/generate-location-missing-covers.mjs
 *   node scripts/generate-location-missing-covers.mjs --write-map
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
const missingPath = path.join(rootDir, '.deploy-tmp/locations-truly-missing.json');
const outPublic = path.join(rootDir, 'apps/public/public/images/venues');
const mapPath = path.join(rootDir, 'apps/web/src/lib/city-place-images.ts');

const CITY_FOLDER = {
  'санкт-петербург': 'saint-petersburg',
  moskva: 'moscow',
  москва: 'moscow',
  'нижнии-новгород': 'nizhny-novgorod',
  калининград: 'kaliningrad',
  пермь: 'perm',
  казань: 'kazan',
  волгоград: 'volgograd',
  владимир: 'vladimir',
  уфа: 'ufa',
  сочи: 'sochi',
  тверь: 'tver',
  омск: 'omsk',
  иркутск: 'irkutsk',
  екатеринбург: 'ekaterinburg',
};

function cityFolder(citySlug, slug) {
  if (CITY_FOLDER[citySlug]) return CITY_FOLDER[citySlug];
  if (/saint-petersburg|петербург|petergof|pushkin/i.test(slug)) return 'saint-petersburg';
  if (/^moscow-|^moskva/i.test(slug)) return 'moscow';
  if (/^kaliningrad-/i.test(slug)) return 'kaliningrad';
  if (/^nizhny-novgorod-/i.test(slug)) return 'nizhny-novgorod';
  if (/^perm-/i.test(slug)) return 'perm';
  const m = String(slug || '').match(/^([a-z0-9-]+?)-/);
  // Prefer explicit city token from slug when present
  const known = [
    'volgograd',
    'vladimir',
    'kazan',
    'ufa',
    'sochi',
    'tver',
    'omsk',
    'irkutsk',
    'ekaterinburg',
    'voronezh',
    'krasnodar',
    'samara',
    'rostov-na-donu',
    'murmansk',
    'sevastopol',
    'simferopol',
    'novosibirsk',
    'chelyabinsk',
    'yaroslavl',
    'vologda',
    'pskov',
    'smolensk',
    'bryansk',
    'belgorod',
    'astrahan',
    'arhangelsk',
    'ulan-ude',
    'habarovsk',
    'vladivostok',
    'saratov',
    'tomsk',
    'tyumen',
    'stavropol',
    'orenburg',
    'ulyanovsk',
    'izhevsk',
    'cheboksary',
    'yoshkar-ola',
    'barnaul',
    'kemerovo',
    'kursk',
    'tambov',
    'lipeck',
    'kaluga',
    'tula',
    'ryazan',
    'penza',
    'kurgan',
    'ivanovo',
    'orel',
    'abakan',
    'syktyvkar',
    'sortavala',
    'yuzhno-sahalinsk',
    'chita',
    'blagoveschensk-amurskaya-oblast',
    'kirov-kirovskaya-oblast',
    'veliky-novgorod',
  ];
  for (const k of known) {
    if (slug.startsWith(k + '-') || citySlug.includes(k)) return k;
  }
  return m ? m[1] : 'misc';
}

function fileStem(slug, city) {
  let s = slug;
  const prefixes = [
    'saint-petersburg-',
    'moscow-',
    'kaliningrad-',
    'nizhny-novgorod-',
    'perm-',
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
    ['#0e7490', '#155e75', '#0f172a'],
    ['#0369a1', '#1e3a8a', '#0f172a'],
    ['#047857', '#115e59', '#0f172a'],
    ['#b45309', '#7c2d12', '#1e293b'],
    ['#334155', '#1e293b', '#0f172a'],
    ['#9a3412', '#7c2d12', '#1e293b'],
    ['#1d4ed8', '#1e3a8a', '#0f172a'],
    ['#0f766e', '#134e4a', '#0f172a'],
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
  const missing = JSON.parse(fs.readFileSync(missingPath, 'utf8'));
  // Skip ones that already have GenerateImage files for SPB outdoor batch
  const skip = new Set([
    'saint-petersburg-bankovskiy-most',
    'saint-petersburg-angliyskaya-naberezhnaya',
    'saint-petersburg-dvortsovaya-naberezhnaya',
    'saint-petersburg-dvortsovyy-most',
    'saint-petersburg-malaya-sadovaya-ulitsa',
    'saint-petersburg-naberezhnaya-kanala-griboedova',
    'saint-petersburg-naberezhnaya-reki-moyki',
    'saint-petersburg-naberezhnaya-fontanki',
    'saint-petersburg-kamennoostrovskiy-prospekt',
    'saint-petersburg-kamennyy-ostrov',
    'saint-petersburg-linii-vasilevskogo-ostrova',
    'saint-petersburg-divo-ostrov',
    'saint-petersburg-ekaterininskiy-dvorets',
    'saint-petersburg-kolonnada-isaakiya',
    'volgograd-mamaev-kurgan',
    'vladimir-zolotye-vorota',
    'kazan-mechet-kul-sharif',
    'kaliningrad-kurshskaya-kosa',
  ]);
  const sharp = loadSharp();
  const mapEntries = [];
  let created = 0;
  let existed = 0;
  for (const item of missing) {
    if (skip.has(item.slug)) continue;
    const city = cityFolder(item.city, item.slug);
    const stem = fileStem(item.slug, city);
    const dir = path.join(outPublic, city);
    fs.mkdirSync(dir, { recursive: true });
    const file = `${stem}.jpg`;
    const abs = path.join(dir, file);
    const url = `/images/venues/${city}/${file}`;
    if (fs.existsSync(abs) && fs.statSync(abs).size > 20_000) {
      existed += 1;
      mapEntries.push([item.slug, url]);
      continue;
    }
    const seedHex = catalogCoverHash(`location-cover:${item.slug}`);
    const svg = Buffer.from(buildSvg(seedHex));
    await sharp(svg).jpeg({ quality: 86, mozjpeg: true }).toFile(abs);
    created += 1;
    mapEntries.push([item.slug, url]);
  }
  console.log(JSON.stringify({ created, existed, mapped: mapEntries.length }));
  if (writeMap) {
    let src = fs.readFileSync(mapPath, 'utf8');
    const block =
      '\nconst LOCATION_PACK_IMAGES: Record<string, string> = {\n' +
      mapEntries
        .map(([slug, url]) => `  '${slug}': '${url}',`)
        .join('\n') +
      '\n};\n';
    if (src.includes('LOCATION_PACK_IMAGES')) {
      src = src.replace(
        /const LOCATION_PACK_IMAGES: Record<string, string> = \{[\s\S]*?\};\n/,
        block,
      );
    } else {
      src = src.replace(
        'const EDITORIAL_IMAGES_BY_SLUG: Record<string, string> = {',
        `${block}\nconst EDITORIAL_IMAGES_BY_SLUG: Record<string, string> = {`,
      );
      src = src.replace(
        '...MOSCOW_IMAGES,\n};',
        '...MOSCOW_IMAGES,\n  ...LOCATION_PACK_IMAGES,\n};',
      );
    }
    fs.writeFileSync(mapPath, src);
    console.log('updated', mapPath);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
