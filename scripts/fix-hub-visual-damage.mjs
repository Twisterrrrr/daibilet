/**
 * Detect + auto-unflip upside-down venue bases; flag collage/clone suspects.
 * Source of truth: apps/public/public/images/venues (mirrors to apps/web).
 *
 *   node scripts/fix-hub-visual-damage.mjs --cities=rostov-na-donu,omsk,tyumen,penza,chelyabinsk
 *   node scripts/fix-hub-visual-damage.mjs --cities=omsk --dry-run
 *   node scripts/fix-hub-visual-damage.mjs --unflip-only
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { writeVenueStillVariants } from './lib/venue-still-variants.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const publicVenues = path.join(root, 'apps/public/public/images/venues');
const webVenues = path.join(root, 'apps/web/public/images/venues');
const sharp = createRequire(path.join(root, 'apps/web/package.json'))('sharp');

const citiesArg = process.argv.find((a) => a.startsWith('--cities='));
const cityFilter = citiesArg
  ? citiesArg
      .slice('--cities='.length)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : [
      'rostov-na-donu',
      'omsk',
      'tyumen',
      'penza',
      'chelyabinsk',
      'novosibirsk',
      'barnaul',
      'voronezh',
      'ufa',
      'ryazan',
      'saratov',
      'volgograd',
      'smolensk',
      'tula',
      'tver',
    ];
const dryRun = process.argv.includes('--dry-run');
const unflipOnly = process.argv.includes('--unflip-only');
/** Bottom brighter than top by this much → likely upside-down outdoors. */
const UPSIDE_DELTA = 22;
/** Left/right or top/bottom mean abs-diff ratio → collage seam. */
const COLLAGE_SEAM = 28;

function isBaseJpg(name) {
  return /\.jpe?g$/i.test(name) && !/-(?:card|thumb)\.jpe?g$/i.test(name) && !/preview/i.test(name);
}

async function ahash(file) {
  const { data } = await sharp(file)
    .rotate()
    .greyscale()
    .resize(8, 8, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const avg = data.reduce((s, v) => s + v, 0) / data.length;
  return data.map((v) => (v >= avg ? '1' : '0')).join('');
}

async function metrics(file) {
  const { data, info } = await sharp(file)
    .rotate()
    .greyscale()
    .resize(64, 64, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  let top = 0;
  let nt = 0;
  let bot = 0;
  let nb = 0;
  let left = 0;
  let nl = 0;
  let right = 0;
  let nr = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = data[y * w + x];
      if (y < h * 0.2) {
        top += v;
        nt += 1;
      }
      if (y > h * 0.8) {
        bot += v;
        nb += 1;
      }
      if (x < w * 0.2) {
        left += v;
        nl += 1;
      }
      if (x > w * 0.8) {
        right += v;
        nr += 1;
      }
    }
  }
  const mt = top / nt;
  const mb = bot / nb;
  const ml = left / nl;
  const mr = right / nr;
  // Mid vertical seam: compare left half vs right half column means.
  let seamV = 0;
  let seamH = 0;
  for (let y = 0; y < h; y++) {
    let lSum = 0;
    let rSum = 0;
    for (let x = 0; x < w / 2; x++) lSum += data[y * w + x];
    for (let x = w / 2; x < w; x++) rSum += data[y * w + x];
    seamV += Math.abs(lSum / (w / 2) - rSum / (w / 2));
  }
  seamV /= h;
  for (let x = 0; x < w; x++) {
    let tSum = 0;
    let bSum = 0;
    for (let y = 0; y < h / 2; y++) tSum += data[y * w + x];
    for (let y = h / 2; y < h; y++) bSum += data[y * w + x];
    seamH += Math.abs(tSum / (h / 2) - bSum / (h / 2));
  }
  seamH /= w;

  return {
    top: +mt.toFixed(1),
    bot: +mb.toFixed(1),
    upsideDelta: +(mb - mt).toFixed(1),
    upside: mb - mt > UPSIDE_DELTA,
    seamV: +seamV.toFixed(1),
    seamH: +seamH.toFixed(1),
    collage: seamV > COLLAGE_SEAM || seamH > COLLAGE_SEAM,
    lrDelta: +Math.abs(mr - ml).toFixed(1),
  };
}

async function installBoth(city, stem, buf) {
  for (const rootDir of [publicVenues, webVenues]) {
    const dir = path.join(rootDir, city);
    fs.mkdirSync(dir, { recursive: true });
    await writeVenueStillVariants(sharp, buf, dir, stem);
  }
}

async function processCity(city) {
  const dir = path.join(publicVenues, city);
  if (!fs.existsSync(dir)) {
    console.warn('skip missing', city);
    return { city, bases: 0, unflipped: [], collage: [], clones: [] };
  }
  const bases = fs.readdirSync(dir).filter(isBaseJpg);
  const byHash = new Map();
  const upside = [];
  const collage = [];

  for (const file of bases) {
    const stem = file.replace(/\.jpe?g$/i, '');
    const full = path.join(dir, file);
    const m = await metrics(full);
    const h = await ahash(full);
    if (!byHash.has(h)) byHash.set(h, []);
    byHash.get(h).push(stem);
    if (m.upside) upside.push({ stem, ...m });
    if (m.collage) collage.push({ stem, ...m });
  }

  const unflipped = [];
  for (const row of upside) {
    if (dryRun) {
      unflipped.push(row.stem);
      continue;
    }
    const src = path.join(dir, `${row.stem}.jpg`);
    const buf = await sharp(src).rotate(180).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
    // Re-check: after unflip, upsideDelta should flip sign / drop.
    const tmp = await sharp(buf)
      .greyscale()
      .resize(64, 64, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });
    let top = 0;
    let nt = 0;
    let bot = 0;
    let nb = 0;
    const w = tmp.info.width;
    const h = tmp.info.height;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const v = tmp.data[y * w + x];
        if (y < h * 0.2) {
          top += v;
          nt += 1;
        }
        if (y > h * 0.8) {
          bot += v;
          nb += 1;
        }
      }
    }
    const newDelta = bot / nb - top / nt;
    // Only keep unflip if it improves (sky more on top → delta decreases).
    if (newDelta < row.upsideDelta - 8) {
      await installBoth(city, row.stem, buf);
      unflipped.push(row.stem);
      console.log(`unflip ${city}/${row.stem} delta ${row.upsideDelta} → ${newDelta.toFixed(1)}`);
    } else {
      console.log(`skip-unflip ${city}/${row.stem} (no improve ${row.upsideDelta} → ${newDelta.toFixed(1)})`);
    }
  }

  const clones = [...byHash.values()].filter((g) => g.length > 1);

  return {
    city,
    bases: bases.length,
    unflipped,
    upsideSuspects: upside.map((u) => u.stem),
    collage: unflipOnly ? [] : collage.map((c) => ({ stem: c.stem, seamV: c.seamV, seamH: c.seamH })),
    clones: unflipOnly ? [] : clones,
  };
}

async function main() {
  const summary = [];
  for (const city of cityFilter) {
    summary.push(await processCity(city));
  }
  const out = path.join(root, 'scripts/fix-hub-visual-damage-report.json');
  fs.writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  console.log('wrote', out);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
