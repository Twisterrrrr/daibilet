/**
 * Fill suburb nested preview gaps:
 * - add missing locationSlug into hub/registry place objects
 * - write unique JPEG per slug (modulate from parent suburb cover if any, else hash SVG)
 * - append map entries to city-place-images.ts
 * - write -card/-thumb
 *
 *   node scripts/fill-suburb-preview-gaps.mjs
 *   node scripts/fill-suburb-preview-gaps.mjs --dry-run
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dry = process.argv.includes('--dry-run');
const gapsPath = path.join(root, 'tmp-suburb-preview-gaps.json');
const mapPath = path.join(root, 'apps/web/src/lib/city-place-images.ts');
const venuesRoot = path.join(root, 'apps/public/public/images/venues');

const RU = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
};

function slugifyRu(name) {
  return String(name || '')
    .toLowerCase()
    .split('')
    .map((ch) => RU[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

function cityPrefixFromFile(file) {
  if (file === 'city-destination-registry.ts') return null;
  if (file.startsWith('saint-petersburg')) return 'saint-petersburg';
  if (file.startsWith('moscow')) return 'moscow';
  return file.replace(/-hub\.ts$|-suburbs\.ts$/, '');
}

function registryPrefix(suburb) {
  const s = String(suburb || '').toLowerCase();
  if (s.includes('зеленоград')) return 'kaliningrad-zelenogradsk';
  if (s.includes('светлогор')) return 'kaliningrad-svetlogorsk';
  if (s.includes('курш')) return 'kaliningrad-kurshskaya-kosa';
  if (s.includes('балтий')) return 'kaliningrad-baltiysk';
  if (s.includes('янтар')) return 'kaliningrad-yantarny';
  if (s.includes('городец')) return 'nizhny-novgorod-gorodets';
  if (s.includes('семён') || s.includes('семен')) return 'nizhny-novgorod-semyonov';
  if (s.includes('дивеев')) return 'nizhny-novgorod-diveevo';
  if (s.includes('макарь')) return 'nizhny-novgorod-makaryev';
  return 'place';
}

function loadSharp() {
  return createRequire(path.join(root, 'apps/web/package.json'))('sharp');
}

function hashHex(s) {
  return crypto.createHash('sha1').update(String(s)).digest('hex');
}

function buildSvg(seedHex) {
  const hues = [
    ['#0e7490', '#155e75', '#0f172a'],
    ['#0369a1', '#1e3a8a', '#0f172a'],
    ['#047857', '#115e59', '#0f172a'],
    ['#b45309', '#7c2d12', '#1e293b'],
    ['#334155', '#1e293b', '#0f172a'],
    ['#9a3412', '#7c2d12', '#1e293b'],
    ['#1d4ed8', '#1e3a8a', '#0f172a'],
    ['#0f766e', '#134e4a', '#0f172a'],
    ['#be123c', '#881337', '#0f172a'],
    ['#6d28d9', '#312e81', '#0f172a'],
  ];
  const n = Number.parseInt(seedHex.slice(0, 6), 16) || 0;
  const [c1, c2, c3] = hues[n % hues.length];
  const a = Number.parseInt(seedHex.slice(0, 2), 16) / 255;
  const b = Number.parseInt(seedHex.slice(2, 4), 16) / 255;
  const c = Number.parseInt(seedHex.slice(4, 6), 16) / 255;
  const d = Number.parseInt(seedHex.slice(6, 8), 16) / 255;
  const W = 1600;
  const H = 1200;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="55%" stop-color="${c2}"/>
      <stop offset="100%" stop-color="${c3}"/>
    </linearGradient>
    <radialGradient id="g" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <ellipse cx="${Math.round(200 + a * 1200)}" cy="${Math.round(150 + b * 900)}" rx="${Math.round(380 + a * 220)}" ry="${Math.round(280 + b * 180)}" fill="url(#g)"/>
  <ellipse cx="${Math.round(300 + c * 1000)}" cy="${Math.round(200 + d * 800)}" rx="${Math.round(300 + c * 200)}" ry="${Math.round(240 + d * 160)}" fill="url(#g)"/>
</svg>`;
}

function cityFolderFromSlug(slug) {
  const known = [
    'saint-petersburg', 'nizhny-novgorod', 'rostov-na-donu', 'krasnoyarsk', 'novosibirsk',
    'chelyabinsk', 'ekaterinburg', 'kaliningrad', 'voronezh', 'krasnodar', 'samara',
    'tyumen', 'omsk', 'ufa', 'perm', 'kazan', 'moscow', 'ryazan', 'penza', 'tver',
  ];
  for (const k of known) if (slug.startsWith(k + '-')) return k;
  return slug.split('-')[0] || 'misc';
}

function stemFromSlug(slug, city) {
  let s = slug.startsWith(city + '-') ? slug.slice(city.length + 1) : slug;
  return s.replace(/[^a-z0-9-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || hashHex(slug).slice(0, 10);
}

function insertSlugInFile(fileRel, placeName, locationSlug) {
  const abs = path.join(root, 'apps/web/src/lib', fileRel);
  let src = fs.readFileSync(abs, 'utf8');
  const escaped = placeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `(name:\\s*'${escaped}'[\\s\\S]*?desc:\\s*'[^']*',)(\\s*)(?!locationSlug:)`,
    'm',
  );
  if (!re.test(src)) {
    // try double quotes
    const re2 = new RegExp(
      `(name:\\s*"${escaped}"[\\s\\S]*?desc:\\s*"[^"]*",)(\\s*)(?!locationSlug:)`,
      'm',
    );
    if (!re2.test(src)) return false;
    src = src.replace(re2, `$1$2locationSlug: '${locationSlug}',$2`);
  } else {
    src = src.replace(re, `$1$2locationSlug: '${locationSlug}',$2`);
  }
  if (!dry) fs.writeFileSync(abs, src);
  return true;
}

async function ensureImage(sharp, slug, preferParentUrl) {
  const city = cityFolderFromSlug(slug);
  const stem = stemFromSlug(slug, city);
  const dir = path.join(venuesRoot, city);
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `${stem}.jpg`);
  const url = `/images/venues/${city}/${stem}.jpg`;
  if (fs.existsSync(out)) return url;

  if (dry) return url;

  let buf;
  if (preferParentUrl) {
    const parentAbs = path.join(venuesRoot, preferParentUrl.replace(/^\/images\/venues\//, ''));
    if (fs.existsSync(parentAbs)) {
      const hue = (Number.parseInt(hashHex(slug).slice(0, 4), 16) % 60) - 30;
      const sat = 0.92 + (Number.parseInt(hashHex(slug).slice(4, 6), 16) % 20) / 100;
      buf = await sharp(parentAbs)
        .modulate({ hue, saturation: sat, brightness: 0.96 + (Number.parseInt(hashHex(slug).slice(6, 8), 16) % 10) / 100 })
        .jpeg({ quality: 84, mozjpeg: true })
        .toBuffer();
    }
  }
  if (!buf) {
    const svg = Buffer.from(buildSvg(hashHex(slug)));
    buf = await sharp(svg).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
  }
  await sharp(buf).jpeg({ quality: 86, mozjpeg: true }).toFile(out);
  await sharp(buf).resize(640, null, { withoutEnlargement: true }).jpeg({ quality: 65, mozjpeg: true }).toFile(path.join(dir, `${stem}-card.jpg`));
  await sharp(buf).resize(320, null, { withoutEnlargement: true }).jpeg({ quality: 62, mozjpeg: true }).toFile(path.join(dir, `${stem}-thumb.jpg`));
  return url;
}

function findParentCover(mapSrc, suburbSlugHint) {
  // crude: look for suburb locationSlug in gaps context - passed separately
  return null;
}

async function main() {
  const gaps = JSON.parse(fs.readFileSync(gapsPath, 'utf8'));
  const sharp = loadSharp();
  const mapSrc = fs.readFileSync(mapPath, 'utf8');
  const existing = new Set([...mapSrc.matchAll(/'([a-z0-9-]+)':\s*'\/images\/venues\//g)].map((m) => m[1]));

  const newMap = [];
  const slugAssignments = [];

  // 1) missing slugs
  for (const row of gaps.missingSlug) {
    const prefix =
      cityPrefixFromFile(row.file) || registryPrefix(row.suburb);
    const locationSlug = `${prefix}-${slugifyRu(row.name)}`;
    slugAssignments.push({ ...row, locationSlug });
    const ok = insertSlugInFile(row.file, row.name, locationSlug);
    if (!ok) console.warn('slug insert failed', row.file, row.name);
  }

  // also sync public mirrors for patched hub files
  const patchedFiles = [...new Set(slugAssignments.map((r) => r.file))];
  for (const f of patchedFiles) {
    if (f === 'city-destination-registry.ts') continue;
    const web = path.join(root, 'apps/web/src/lib', f);
    const pub = path.join(root, 'apps/public/src/lib', f);
    if (fs.existsSync(web) && fs.existsSync(path.dirname(pub))) {
      let body = fs.readFileSync(web, 'utf8');
      // public often drops .ts in imports
      body = body.replace(/from '\.\/([^']+)\.ts'/g, "from './$1'");
      if (!dry) fs.writeFileSync(pub, body);
    }
  }

  // 2) all slugs needing editorial = missingEditorial + newly assigned
  const needEditorial = [
    ...gaps.missingEditorial.map((r) => ({ slug: r.slug, name: r.name, file: r.file, suburb: r.suburb })),
    ...slugAssignments.map((r) => ({ slug: r.locationSlug, name: r.name, file: r.file, suburb: r.suburb })),
  ];

  // parent covers for modulate: map suburb name → first editorial found for suburb parent slug in map
  const parentBySuburb = new Map();
  for (const m of mapSrc.matchAll(/'([a-z0-9-]+)':\s*'(\/images\/venues\/[^']+)'/g)) {
    parentBySuburb.set(m[1], m[2]);
  }

  let made = 0;
  for (const row of needEditorial) {
    if (existing.has(row.slug) && !gaps.missingEditorial.some((x) => x.slug === row.slug)) {
      // newly assigned still need files
    }
    // skip if already uniquely mapped to non-shared? still regenerate if missingEditorial
    const city = cityFolderFromSlug(row.slug);
    // try parent: strip last segments
    let parentUrl = null;
    const parts = row.slug.split('-');
    for (let i = parts.length - 1; i >= 2; i--) {
      const cand = parts.slice(0, i).join('-');
      if (parentBySuburb.has(cand)) {
        parentUrl = parentBySuburb.get(cand);
        break;
      }
    }
    const url = await ensureImage(sharp, row.slug, parentUrl);
    newMap.push(`  '${row.slug}': '${url}',`);
    made++;
  }

  // Map merge: dedicated auto block; spread LAST so it overrides shared parent clones
  if (!dry && newMap.length) {
    let next = fs.readFileSync(mapPath, 'utf8');
    const uniqueLines = [...new Set(newMap)];
    if (next.includes('SUBURB_NESTED_AUTO_IMAGES')) {
      next = next.replace(
        /const SUBURB_NESTED_AUTO_IMAGES: Record<string, string> = \{[\s\S]*?\n\};/,
        `const SUBURB_NESTED_AUTO_IMAGES: Record<string, string> = {\n${uniqueLines.join('\n')}\n};`,
      );
    } else {
      next = next.replace(
        'const EDITORIAL_IMAGES_BY_SLUG: Record<string, string> = {',
        `const SUBURB_NESTED_AUTO_IMAGES: Record<string, string> = {\n${uniqueLines.join('\n')}\n};\n\nconst EDITORIAL_IMAGES_BY_SLUG: Record<string, string> = {`,
      );
    }
    if (!next.includes('...SUBURB_NESTED_AUTO_IMAGES')) {
      next = next.replace(
        /(\.\.\.NOVOSIBIRSK_HUB_IMAGES,\n\};)/,
        '...NOVOSIBIRSK_HUB_IMAGES,\n  ...SUBURB_NESTED_AUTO_IMAGES,\n};',
      );
      if (!next.includes('...SUBURB_NESTED_AUTO_IMAGES')) {
        next = next.replace(
          /(const EDITORIAL_IMAGES_BY_SLUG: Record<string, string> = \{[\s\S]*?)(\n\};)/,
          '$1\n  ...SUBURB_NESTED_AUTO_IMAGES,$2',
        );
      }
    }
    fs.writeFileSync(mapPath, next);
  }

  console.log(JSON.stringify({ dry, slugAssigned: slugAssignments.length, editorialWritten: made }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
