/**
 * Card thumbs for /cities catalog + home rails from cities/top/*.jpg.
 * Does NOT touch cities/night (hub heroes) or shrink the full top JPG used as medium.
 *
 *   node scripts/lean-city-top-card-thumbs.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const publicTop = path.join(rootDir, 'apps/public/public/images/cities/top');
const webTop = path.join(rootDir, 'apps/web/public/images/cities/top');

const THUMB_WIDTH = 640;
const THUMB_QUALITY = 70;
const CONCURRENCY = 4;

function loadSharp() {
  const candidates = [
    path.join(rootDir, '.tmp-sharp/package.json'),
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

function listTopJpgs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => /\.jpe?g$/i.test(name) && !/-thumb\.jpe?g$/i.test(name))
    .map((name) => path.join(dir, name));
}

function thumbPathFor(file) {
  return file.replace(/\.jpe?g$/i, '-thumb.jpg');
}

function mirrorToWeb(absPublic) {
  if (!fs.existsSync(webTop)) return;
  const rel = path.relative(publicTop, absPublic);
  const dest = path.join(webTop, rel);
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
  const thumbFile = thumbPathFor(file);
  const before = fs.statSync(file).size;
  const thumbExists = fs.existsSync(thumbFile);
  const thumbOk =
    thumbExists &&
    fs.statSync(thumbFile).size >= 6 * 1024 &&
    fs.statSync(thumbFile).size <= 140 * 1024;

  if (thumbOk) {
    mirrorToWeb(thumbFile);
    return { file, skipped: true, before, thumbBytes: fs.statSync(thumbFile).size };
  }

  const tmp = `${thumbFile}.tmp.jpg`;
  await sharp(file)
    .rotate()
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true, fit: 'inside' })
    .jpeg({ quality: THUMB_QUALITY, mozjpeg: true, progressive: true })
    .toFile(tmp);
  fs.renameSync(tmp, thumbFile);
  const thumbBytes = fs.statSync(thumbFile).size;
  mirrorToWeb(thumbFile);
  return { file, skipped: false, before, thumbBytes };
}

async function main() {
  const sharp = loadSharp();
  const files = listTopJpgs(publicTop);
  if (!files.length) {
    console.error('No JPGs in', publicTop);
    process.exit(1);
  }
  const stats = await mapPool(files, CONCURRENCY, (file) => processFile(sharp, file));
  const wrote = stats.filter((s) => !s.skipped);
  const avg =
    wrote.length > 0
      ? Math.round(wrote.reduce((a, s) => a + s.thumbBytes, 0) / wrote.length / 1024)
      : 0;
  console.log(
    JSON.stringify(
      {
        total: stats.length,
        wrote: wrote.length,
        skippedOk: stats.length - wrote.length,
        avgThumbKb: avg,
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
