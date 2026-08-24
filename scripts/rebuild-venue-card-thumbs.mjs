/**
 * Rebuild all venue `-card.jpg` / `-thumb.jpg` sidecars at VENUE_STILL quality.
 * Does NOT rewrite editorial base `.jpg` files.
 *
 *   node scripts/rebuild-venue-card-thumbs.mjs
 *   node scripts/rebuild-venue-card-thumbs.mjs --cities=moscow,rostov-na-donu
 *   node scripts/rebuild-venue-card-thumbs.mjs --dry-run
 *   node scripts/rebuild-venue-card-thumbs.mjs --concurrency=6
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { writeVenueCardThumbSidecars, VENUE_STILL } from './lib/venue-still-variants.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const publicVenues = path.join(root, 'apps/public/public/images/venues');
const webVenues = path.join(root, 'apps/web/public/images/venues');
const sharp = createRequire(path.join(root, 'apps/web/package.json'))('sharp');

const SKIP_CITIES = new Set(['place', 'generated']);

const citiesArg = process.argv.find((a) => a.startsWith('--cities='));
const cityFilter = citiesArg
  ? citiesArg
      .slice('--cities='.length)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : null;
const dryRun = process.argv.includes('--dry-run');
const concurrencyArg = process.argv.find((a) => a.startsWith('--concurrency='));
const concurrency = Math.max(
  1,
  Number.parseInt(concurrencyArg?.slice('--concurrency='.length) || '5', 10) || 5,
);

function isBaseJpg(name) {
  return /\.jpe?g$/i.test(name) && !/-(?:card|thumb)\.jpe?g$/i.test(name);
}

function mirrorSidecars(publicDir, stem) {
  if (!fs.existsSync(webVenues)) return;
  const relCity = path.relative(publicVenues, publicDir);
  const destDir = path.join(webVenues, relCity);
  fs.mkdirSync(destDir, { recursive: true });
  for (const suffix of ['-card.jpg', '-thumb.jpg']) {
    const src = path.join(publicDir, `${stem}${suffix}`);
    if (!fs.existsSync(src)) continue;
    fs.copyFileSync(src, path.join(destDir, `${stem}${suffix}`));
  }
}

async function mapPool(items, limit, fn) {
  let index = 0;
  const results = [];
  async function worker() {
    while (index < items.length) {
      const i = index;
      index += 1;
      results[i] = await fn(items[i]);
    }
  }
  const n = Math.min(limit, Math.max(items.length, 1));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

function listCities() {
  return fs
    .readdirSync(publicVenues, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !SKIP_CITIES.has(d.name))
    .map((d) => d.name)
    .filter((name) => !cityFilter || cityFilter.includes(name))
    .sort((a, b) => a.localeCompare(b, 'en'));
}

async function rebuildCity(city) {
  const dir = path.join(publicVenues, city);
  const bases = fs
    .readdirSync(dir)
    .filter(isBaseJpg)
    .map((name) => path.basename(name, path.extname(name)));

  if (dryRun) {
    return { city, total: bases.length, ok: 0, fail: 0, dryRun: true };
  }

  let ok = 0;
  let fail = 0;
  const errors = [];

  await mapPool(bases, concurrency, async (stem) => {
    const basePath = path.join(dir, `${stem}.jpg`);
    const alt = path.join(dir, `${stem}.jpeg`);
    const src = fs.existsSync(basePath) ? basePath : fs.existsSync(alt) ? alt : null;
    if (!src) {
      fail += 1;
      errors.push(`${stem}: missing base`);
      return;
    }
    try {
      const st = await fsp.stat(src);
      if (st.size < 4_000) {
        fail += 1;
        errors.push(`${stem}: base too small (${st.size})`);
        return;
      }
      await writeVenueCardThumbSidecars(sharp, src, dir, stem);
      mirrorSidecars(dir, stem);
      ok += 1;
    } catch (error) {
      fail += 1;
      errors.push(`${stem}: ${error?.message || error}`);
    }
  });

  return { city, total: bases.length, ok, fail, errors: errors.slice(0, 8) };
}

const cities = listCities();
console.log(
  JSON.stringify({
    mode: dryRun ? 'dry-run' : 'write',
    card: VENUE_STILL.card,
    thumb: VENUE_STILL.thumb,
    cities: cities.length,
    concurrency,
  }),
);

const started = Date.now();
let grandOk = 0;
let grandFail = 0;
let grandTotal = 0;

for (const city of cities) {
  const t0 = Date.now();
  const result = await rebuildCity(city);
  grandOk += result.ok;
  grandFail += result.fail;
  grandTotal += result.total;
  console.log(
    JSON.stringify({
      ...result,
      ms: Date.now() - t0,
    }),
  );
}

console.log(
  JSON.stringify({
    done: true,
    cities: cities.length,
    total: grandTotal,
    ok: grandOk,
    fail: grandFail,
    ms: Date.now() - started,
  }),
);
