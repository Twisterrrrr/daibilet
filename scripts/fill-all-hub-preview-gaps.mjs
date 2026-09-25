/**
 * Fill ALL tourist-hub preview gaps + break same-URL clones in a rail/list.
 *
 * - suburb nested places[]
 * - mustSee top-level
 * - dayRoutePreset coverImageUrl missing files
 * - remaps duplicate editorial URLs so each slug gets a unique file
 * - regenerates tiny stub JPGs (<40KB) when a parent photo exists (modulate)
 *
 * Merges into SUBURB_NESTED_AUTO_IMAGES without wiping prior keys.
 *
 *   node scripts/fill-all-hub-preview-gaps.mjs
 *   node scripts/fill-all-hub-preview-gaps.mjs --dry-run
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dry = process.argv.includes('--dry-run');
const mapPath = path.join(root, 'apps/web/src/lib/city-place-images.ts');
const venuesRoot = path.join(root, 'apps/public/public/images/venues');
const lib = path.join(root, 'apps/web/src/lib');

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
    ['#ca8a04', '#854d0e', '#1e293b'],
    ['#0891b2', '#164e63', '#0f172a'],
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
    <linearGradient id="bg" x1="${Math.round(a * 100)}%" y1="0%" x2="${Math.round(100 - b * 100)}%" y2="100%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="50%" stop-color="${c2}"/>
      <stop offset="100%" stop-color="${c3}"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <circle cx="${Math.round(200 + a * 1200)}" cy="${Math.round(200 + b * 800)}" r="${Math.round(120 + c * 180)}" fill="#fff" fill-opacity="0.12"/>
  <rect x="${Math.round(100 + d * 900)}" y="${Math.round(400 + a * 400)}" width="${Math.round(400 + b * 400)}" height="${Math.round(200 + c * 200)}" fill="#fff" fill-opacity="0.08" rx="24"/>
</svg>`;
}

const KNOWN_CITIES = [
  'saint-petersburg',
  'nizhny-novgorod',
  'rostov-na-donu',
  'krasnoyarsk',
  'novosibirsk',
  'chelyabinsk',
  'ekaterinburg',
  'kaliningrad',
  'voronezh',
  'krasnodar',
  'samara',
  'tyumen',
  'omsk',
  'ufa',
  'perm',
  'kazan',
  'moscow',
  'ryazan',
  'penza',
  'tver',
  'sochi',
  'saratov',
  'yaroslavl',
  'volgograd',
];

function cityFolderFromSlug(slug) {
  for (const k of KNOWN_CITIES) if (slug.startsWith(k + '-')) return k;
  return slug.split('-')[0] || 'misc';
}

function stemFromSlug(slug, city) {
  let s = slug.startsWith(city + '-') ? slug.slice(city.length + 1) : slug;
  return s.replace(/[^a-z0-9-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || hashHex(slug).slice(0, 10);
}

function parseMap(src) {
  const map = new Map();
  for (const m of src.matchAll(/'([a-z0-9-]+)':\s*'(\/images\/venues\/[^']+)'/g)) {
    map.set(m[1], m[2]);
  }
  return map;
}

function fileExists(url) {
  if (!url) return false;
  return fs.existsSync(path.join(venuesRoot, url.replace(/^\/images\/venues\//, '')));
}

function fileSize(url) {
  if (!fileExists(url)) return 0;
  return fs.statSync(path.join(venuesRoot, url.replace(/^\/images\/venues\//, ''))).size;
}

function extractPlacesBlocks(src) {
  const lines = src.split('\n');
  const blocks = [];
  let depth = 0;
  let inPlaces = false;
  let buf = [];
  let suburbHint = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inPlaces && /places:\s*\[/.test(line)) {
      for (let j = i; j >= Math.max(0, i - 40); j--) {
        const nm = lines[j].match(/name:\s*['"]([^'"]+)['"]/);
        if (nm) {
          suburbHint = nm[1];
          break;
        }
      }
      inPlaces = true;
      depth = (line.match(/\[/g) || []).length - (line.match(/\]/g) || []).length;
      if (depth <= 0) inPlaces = false;
      continue;
    }
    if (!inPlaces) continue;
    depth += (line.match(/\[/g) || []).length;
    depth -= (line.match(/\]/g) || []).length;
    buf.push(line);
    if (depth <= 0) {
      const places = [];
      for (const o of buf.join('\n').matchAll(/\{([^{}]*)\}/g)) {
        const body = o[1];
        const nm = body.match(/name:\s*['"]([^'"]+)['"]/);
        if (!nm) continue;
        const sl =
          body.match(/locationSlug:\s*['"]([^'"]+)['"]/)?.[1] ||
          body.match(/venueSlug:\s*['"]([^'"]+)['"]/)?.[1] ||
          null;
        places.push({ name: nm[1], slug: sl });
      }
      blocks.push({ suburb: suburbHint, places });
      buf = [];
      inPlaces = false;
      suburbHint = '';
    }
  }
  return blocks;
}

function extractArrayExport(src, exportName) {
  const m = src.match(new RegExp(`export const ${exportName}[^=]*=\\s*(\\[[\\s\\S]*?\\n\\]);`));
  return m ? m[1] : null;
}

function topLevelItems(arrSrc) {
  if (!arrSrc) return [];
  const items = [];
  const lines = arrSrc.split('\n');
  let i = 0;
  while (i < lines.length) {
    if (!/^\s{2}\{\s*$/.test(lines[i])) {
      i++;
      continue;
    }
    let depth = 0;
    const buf = [];
    for (; i < lines.length; i++) {
      const line = lines[i];
      depth += (line.match(/\{/g) || []).length;
      depth -= (line.match(/\}/g) || []).length;
      buf.push(line);
      if (depth <= 0) {
        i++;
        break;
      }
    }
    const body = buf.join('\n');
    const beforePlaces = body.split(/\n\s{4}places:\s*\[/)[0];
    const name = beforePlaces.match(/name:\s*['"]([^'"]+)['"]/)?.[1];
    if (!name) continue;
    const slug =
      beforePlaces.match(/locationSlug:\s*['"]([^'"]+)['"]/)?.[1] ||
      beforePlaces.match(/venueSlug:\s*['"]([^'"]+)['"]/)?.[1] ||
      null;
    items.push({ name, slug });
  }
  return items;
}

const HUB_PREFIX = {
  'sochi-hub.ts': 'SOCHI',
  'saratov-hub.ts': 'SARATOV',
  'yaroslavl-hub.ts': 'YAROSLAVL',
  'volgograd-hub.ts': 'VOLGOGRAD',
  'voronezh-hub.ts': 'VORONEZH',
  'ufa-hub.ts': 'UFA',
  'ryazan-hub.ts': 'RYAZAN',
  'omsk-hub.ts': 'OMSK',
  'tyumen-hub.ts': 'TYUMEN',
  'penza-hub.ts': 'PENZA',
  'tver-hub.ts': 'TVER',
  'chelyabinsk-hub.ts': 'CHELYABINSK',
  'rostov-na-donu-hub.ts': 'ROSTOV_NA_DONU',
  'novosibirsk-hub.ts': 'NOVOSIBIRSK',
  'krasnoyarsk-hub.ts': 'KRASNOYARSK',
  'krasnodar-hub.ts': 'KRASNODAR',
  'samara-hub.ts': 'SAMARA',
  'kazan-hub.ts': 'KAZAN',
  'ekaterinburg-hub.ts': 'EKB',
  'perm-hub.ts': 'PERM',
};

async function writeUniqueImage(sharp, slug, preferParentUrl, force = false) {
  const city = cityFolderFromSlug(slug);
  const stem = stemFromSlug(slug, city);
  const dir = path.join(venuesRoot, city);
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `${stem}.jpg`);
  const url = `/images/venues/${city}/${stem}.jpg`;
  if (!force && fs.existsSync(out) && fs.statSync(out).size >= 40000) return url;

  if (dry) return url;

  let buf = null;
  if (preferParentUrl) {
    const parentAbs = path.join(venuesRoot, preferParentUrl.replace(/^\/images\/venues\//, ''));
    if (fs.existsSync(parentAbs) && fs.statSync(parentAbs).size >= 40000) {
      const h = hashHex(slug);
      const hue = (Number.parseInt(h.slice(0, 4), 16) % 80) - 40;
      const sat = 0.85 + (Number.parseInt(h.slice(4, 6), 16) % 30) / 100;
      const bri = 0.9 + (Number.parseInt(h.slice(6, 8), 16) % 20) / 100;
      buf = await sharp(parentAbs)
        .modulate({ hue, saturation: sat, brightness: bri })
        .jpeg({ quality: 84, mozjpeg: true })
        .toBuffer();
    }
  }
  if (!buf) {
    buf = await sharp(Buffer.from(buildSvg(hashHex(slug))))
      .jpeg({ quality: 86, mozjpeg: true })
      .toBuffer();
  }
  await sharp(buf).jpeg({ quality: 86, mozjpeg: true }).toFile(out);
  await sharp(buf)
    .resize(640, null, { withoutEnlargement: true })
    .jpeg({ quality: 65, mozjpeg: true })
    .toFile(path.join(dir, `${stem}-card.jpg`));
  await sharp(buf)
    .resize(320, null, { withoutEnlargement: true })
    .jpeg({ quality: 62, mozjpeg: true })
    .toFile(path.join(dir, `${stem}-thumb.jpg`));
  return url;
}

function findParentUrl(map, slug) {
  const parts = slug.split('-');
  for (let i = parts.length - 1; i >= 2; i--) {
    const cand = parts.slice(0, i).join('-');
    const url = map.get(cand);
    if (url && fileSize(url) >= 40000) return url;
  }
  const city = cityFolderFromSlug(slug);
  for (const key of [`${city}-identity-symbol`, `${city}-identity-architecture`, city]) {
    // identity keys are usually path not slug - try folder heroes
  }
  const identity = `/images/venues/${city}/identity-symbol.jpg`;
  if (fileExists(identity) && fileSize(identity) >= 40000) return identity;
  // any large jpg in city folder
  const dir = path.join(venuesRoot, city);
  if (fs.existsSync(dir)) {
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.jpg') && !f.includes('-card') && !f.includes('-thumb'))
      .map((f) => ({ f, size: fs.statSync(path.join(dir, f)).size }))
      .filter((x) => x.size >= 80000)
      .sort((a, b) => b.size - a.size);
    if (files[0]) return `/images/venues/${city}/${files[0].f}`;
  }
  return null;
}

function mergeAutoBlock(mapSrc, additions) {
  // additions: Map slug -> url
  const existingAuto = new Map();
  const autoMatch = mapSrc.match(
    /const SUBURB_NESTED_AUTO_IMAGES: Record<string, string> = \{([\s\S]*?)\n\};/,
  );
  if (autoMatch) {
    for (const m of autoMatch[1].matchAll(/'([a-z0-9-]+)':\s*'(\/images\/venues\/[^']+)'/g)) {
      existingAuto.set(m[1], m[2]);
    }
  }
  for (const [k, v] of additions) existingAuto.set(k, v);
  const lines = [...existingAuto.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `  '${k}': '${v}',`);
  const block = `const SUBURB_NESTED_AUTO_IMAGES: Record<string, string> = {\n${lines.join('\n')}\n};`;
  if (autoMatch) {
    return mapSrc.replace(
      /const SUBURB_NESTED_AUTO_IMAGES: Record<string, string> = \{[\s\S]*?\n\};/,
      block,
    );
  }
  return mapSrc.replace(
    'const EDITORIAL_IMAGES_BY_SLUG: Record<string, string> = {',
    `${block}\n\nconst EDITORIAL_IMAGES_BY_SLUG: Record<string, string> = {`,
  );
}

async function main() {
  const sharp = loadSharp();
  let mapSrc = fs.readFileSync(mapPath, 'utf8');
  let map = parseMap(mapSrc);
  const additions = new Map();
  const stats = {
    missingFilled: 0,
    dupesBroken: 0,
    stubsRegen: 0,
    presetFiles: 0,
  };

  const hubFiles = fs
    .readdirSync(lib)
    .filter((f) => f.endsWith('-hub.ts') || f.endsWith('-suburbs.ts'));
  hubFiles.push('city-destination-registry.ts');

  /** @type {Array<{slug:string, group:string, force?:boolean}>} */
  const work = [];

  // Collect suburb rails + mustSee lists
  for (const f of hubFiles) {
    const src = fs.readFileSync(path.join(lib, f), 'utf8');
    for (const block of extractPlacesBlocks(src)) {
      if (block.places.length < 1) continue;
      const group = `suburb:${f}:${block.suburb}`;
      for (const p of block.places) {
        if (!p.slug) continue;
        work.push({ slug: p.slug, group });
      }
    }
    const prefix = HUB_PREFIX[f];
    if (prefix) {
      const items = topLevelItems(extractArrayExport(src, `${prefix}_MUST_SEE`));
      const group = `mustSee:${f}`;
      for (const p of items) {
        if (!p.slug) continue;
        work.push({ slug: p.slug, group });
      }
      // presets covers
      const city = f.replace(/-hub\.ts$/, '');
      const texts = [src];
      const lineFile = path.join(lib, `${city}-line-presets.ts`);
      if (fs.existsSync(lineFile)) texts.push(fs.readFileSync(lineFile, 'utf8'));
      for (const text of texts) {
        for (const m of text.matchAll(/coverImageUrl:\s*['"](\/images\/venues\/[^']+)['"]/g)) {
          const url = m[1];
          if (!fileExists(url) || fileSize(url) < 10000) {
            // invent slug from path
            const rel = url.replace(/^\/images\/venues\//, '');
            const [folder, file] = rel.split('/');
            const stem = file.replace(/\.jpg$/, '');
            const slug = `${folder}-${stem}`;
            work.push({ slug, group: `preset:${city}`, force: true, preferredUrl: url });
          }
        }
      }
    }
  }

  // Phase 1: ensure every slug has unique editorial file
  // First pass: fill missing / tiny / force
  for (const row of work) {
    const current = map.get(row.slug);
    const needs =
      row.force ||
      !current ||
      !fileExists(current) ||
      fileSize(current) < 40000;
    if (!needs) continue;
    const parent = findParentUrl(map, row.slug);
    // If preferredUrl path from coverImageUrl - write to that exact path
    if (row.preferredUrl) {
      const city = cityFolderFromSlug(row.slug);
      const abs = path.join(venuesRoot, row.preferredUrl.replace(/^\/images\/venues\//, ''));
      if (!dry) {
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        const parentAbs = parent
          ? path.join(venuesRoot, parent.replace(/^\/images\/venues\//, ''))
          : null;
        let buf;
        if (parentAbs && fs.existsSync(parentAbs)) {
          const h = hashHex(row.slug);
          buf = await sharp(parentAbs)
            .modulate({
              hue: (Number.parseInt(h.slice(0, 4), 16) % 80) - 40,
              saturation: 0.9,
              brightness: 0.95,
            })
            .jpeg({ quality: 84, mozjpeg: true })
            .toBuffer();
        } else {
          buf = await sharp(Buffer.from(buildSvg(hashHex(row.slug))))
            .jpeg({ quality: 86, mozjpeg: true })
            .toBuffer();
        }
        await sharp(buf).toFile(abs);
        const stem = path.basename(abs, '.jpg');
        const dir = path.dirname(abs);
        await sharp(buf).resize(640, null, { withoutEnlargement: true }).jpeg({ quality: 65 }).toFile(path.join(dir, `${stem}-card.jpg`));
        await sharp(buf).resize(320, null, { withoutEnlargement: true }).jpeg({ quality: 62 }).toFile(path.join(dir, `${stem}-thumb.jpg`));
      }
      additions.set(row.slug, row.preferredUrl);
      map.set(row.slug, row.preferredUrl);
      stats.presetFiles++;
      continue;
    }
    const url = await writeUniqueImage(sharp, row.slug, parent, true);
    additions.set(row.slug, url);
    map.set(row.slug, url);
    stats.missingFilled++;
    if (current && fileSize(current) < 40000) stats.stubsRegen++;
  }

  // Phase 2: break duplicate URLs within each group
  const byGroup = new Map();
  for (const row of work) {
    if (!byGroup.has(row.group)) byGroup.set(row.group, []);
    byGroup.get(row.group).push(row.slug);
  }

  for (const [group, slugs] of byGroup) {
    const urlToSlugs = new Map();
    for (const slug of [...new Set(slugs)]) {
      const url = map.get(slug);
      if (!url) continue;
      if (!urlToSlugs.has(url)) urlToSlugs.set(url, []);
      urlToSlugs.get(url).push(slug);
    }
    for (const [, shared] of urlToSlugs) {
      if (shared.length < 2) continue;
      // keep first slug on original URL; remake others
      for (let i = 1; i < shared.length; i++) {
        const slug = shared[i];
        const parent = findParentUrl(map, slug) || map.get(shared[0]);
        const url = await writeUniqueImage(sharp, slug, parent, true);
        additions.set(slug, url);
        map.set(slug, url);
        stats.dupesBroken++;
      }
    }
  }

  if (!dry && additions.size) {
    mapSrc = fs.readFileSync(mapPath, 'utf8');
    let next = mergeAutoBlock(mapSrc, additions);
    if (!next.includes('...SUBURB_NESTED_AUTO_IMAGES')) {
      next = next.replace(
        /(const EDITORIAL_IMAGES_BY_SLUG: Record<string, string> = \{[\s\S]*?)(\n\};)/,
        '$1\n  ...SUBURB_NESTED_AUTO_IMAGES,$2',
      );
    }
    fs.writeFileSync(mapPath, next);
  }

  console.log(JSON.stringify({ dry, additions: additions.size, ...stats }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
