/**
 * Fast-loading venue covers: catalog thumbs ~640px + hero cap ~1200px.
 *
 * `/images/*` bypasses `/_next/image` on MSK (nginx alias). Card grids must
 * not fetch 2-4MB GenerateImage originals. Writes sibling `-thumb.jpg` and
 * recompresses oversized originals in place.
 *
 *   node scripts/lean-venue-catalog-images.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const publicVenues = path.join(rootDir, 'apps/public/public/images/venues');
const webVenues = path.join(rootDir, 'apps/web/public/images/venues');

const THUMB_WIDTH = 640;
const HERO_WIDTH = 1200;
const THUMB_QUALITY = 70;
const HERO_QUALITY = 76;
const LEAN_BYTES = 80 * 1024;
const HERO_SKIP_BYTES = 250 * 1024;
const CONCURRENCY = 3;

function loadSharp() {
  const candidates = [
    path.join(rootDir, 'apps/web/package.json'),
    path.join(rootDir, 'package.json'),
  ];
  let lastError;
  for (const pkg of candidates) {
    try {
      return createRequire(pkg)('sharp');
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('sharp not installed');
}

function walkJpgs(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkJpgs(full, acc);
      continue;
    }
    if (!/\.jpe?g$/i.test(entry.name)) continue;
    if (/-thumb\.jpe?g$/i.test(entry.name)) continue;
    acc.push(full);
  }
  return acc;
}

function thumbPathFor(file) {
  return file.replace(/\.jpe?g$/i, '-thumb.jpg');
}

function mirrorToWeb(absPublic) {
  if (!fs.existsSync(webVenues)) return;
  const rel = path.relative(publicVenues, absPublic);
  const dest = path.join(webVenues, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(absPublic, dest);
}

async function mapPool(items, limit, fn) {
  const stats = [];
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      stats.push(await fn(current));
    }
  }
  const n = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: n }, () => worker()));
  return stats;
}

async function processFile(sharp, file) {
  const before = fs.statSync(file).size;
  const meta = await sharp(file).metadata();
  const width = Number(meta.width) || 0;
  const thumbFile = thumbPathFor(file);
  let originalAfter = before;
  let thumbBytes = 0;
  let wroteHero = false;
  let wroteThumb = false;

  const alreadyLean = before <= LEAN_BYTES && width > 0 && width <= THUMB_WIDTH;

  if (!alreadyLean && (width > HERO_WIDTH || before > HERO_SKIP_BYTES)) {
    const tmp = `${file}.hero-tmp.jpg`;
    await sharp(file)
      .rotate()
      .resize({ width: HERO_WIDTH, withoutEnlargement: true, fit: 'inside' })
      .jpeg({ quality: HERO_QUALITY, mozjpeg: true, progressive: true })
      .toFile(tmp);
    fs.renameSync(tmp, file);
    originalAfter = fs.statSync(file).size;
    wroteHero = true;
    mirrorToWeb(file);
  }

  const thumbExists = fs.existsSync(thumbFile);
  const thumbOk =
    thumbExists &&
    fs.statSync(thumbFile).size >= 8 * 1024 &&
    fs.statSync(thumbFile).size <= 120 * 1024;

  if (!thumbOk) {
    if (alreadyLean) {
      fs.copyFileSync(file, thumbFile);
    } else {
      await sharp(file)
        .rotate()
        .resize({ width: THUMB_WIDTH, withoutEnlargement: true, fit: 'inside' })
        .jpeg({ quality: THUMB_QUALITY, mozjpeg: true, progressive: true })
        .toFile(thumbFile);
    }
    wroteThumb = true;
    mirrorToWeb(thumbFile);
  }

  thumbBytes = fs.existsSync(thumbFile) ? fs.statSync(thumbFile).size : 0;
  originalAfter = fs.statSync(file).size;

  return {
    file: path.relative(publicVenues, file).replace(/\\/g, '/'),
    before,
    originalAfter,
    thumbBytes,
    wroteHero,
    wroteThumb,
  };
}

async function main() {
  const sharp = loadSharp();
  const files = walkJpgs(publicVenues);
  if (!files.length) {
    console.error('No venue jpgs under', publicVenues);
    process.exit(1);
  }

  const beforeTotal = files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
  const results = await mapPool(files, CONCURRENCY, (file) => processFile(sharp, file));

  const originalAfter = results.reduce((sum, row) => sum + row.originalAfter, 0);
  const thumbTotal = results.reduce((sum, row) => sum + row.thumbBytes, 0);
  const thumbs = results.filter((row) => row.thumbBytes > 0);
  const typicalThumb = [...thumbs.map((row) => row.thumbBytes)].sort((a, b) => a - b)[
    Math.floor(thumbs.length / 2)
  ];
  const typicalBefore = [...results.map((row) => row.before)].sort((a, b) => a - b)[
    Math.floor(results.length / 2)
  ];

  console.log(
    JSON.stringify(
      {
        files: files.length,
        wroteHero: results.filter((row) => row.wroteHero).length,
        wroteThumb: results.filter((row) => row.wroteThumb).length,
        beforeMB: +(beforeTotal / 1e6).toFixed(1),
        originalAfterMB: +(originalAfter / 1e6).toFixed(1),
        thumbsMB: +(thumbTotal / 1e6).toFixed(1),
        typicalBeforeKB: Math.round((typicalBefore || 0) / 1024),
        typicalThumbKB: Math.round((typicalThumb || 0) / 1024),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
