/**
 * Disk sidecars and listing-weight compress (no /_next/image).
 *
 *   node scripts/compress-card-images.mjs [events|venues|blog|blog-inline|landings|all] [--dry-run]
 *
 * P0: events/** → sibling `-card.jpg` (width 640, q 60–70, 40–80KB).
 *     Does not overwrite originals (PDP keeps image.jpg).
 *     Skips sources already ≤80KB (lean stubs).
 * P0 venues: optional copy/compress from venues/** (places already have `-thumb`).
 * P0b: blog cover `blog/{slug}.jpg` → sibling `-card.jpg` (listing; PDP/cover stay original).
 * P1: blog `*-inline*.jpg` in place, max 1200px, q~75, 120–200KB.
 * P1b: landings PNG→JPEG ~1200px / <150KB (also caps oversized landing JPG).
 *
 * Source of truth: apps/public/public/images/ (mirrors to apps/web/public/images if present).
 *
 * Mass cut on MSK (owner / ops — do not commit thousands of binaries):
 *   ssh daibilet-msk
 *   cd /opt/daibilet
 *   node scripts/compress-card-images.mjs events --dry-run
 *   # review wrote/skipped; then without --dry-run
 *   node scripts/compress-card-images.mjs events
 * Sidecars stay next to originals on disk. `git reset --hard` on deploy does not
 * delete untracked `-card.jpg`. Do not `git add` the generated catalog sidecars.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const publicImages = path.join(rootDir, 'apps/public/public/images');
const webImages = path.join(rootDir, 'apps/web/public/images');

const CARD_WIDTH = 640;
const CARD_QUALITY = 65;
const CARD_QUALITY_MIN = 60;
const CARD_TARGET_MAX = 80 * 1024;
const LEAN_BYTES = 80 * 1024;
const INLINE_MAX_SIDE = 1200;
const INLINE_QUALITY = 75;
const INLINE_TARGET_MAX = 200 * 1024;
const INLINE_TARGET_MIN = 120 * 1024;
const LANDING_MAX_SIDE = 1200;
const LANDING_QUALITY = 72;
const LANDING_TARGET_MAX = 150 * 1024;
const CONCURRENCY = 4;

const SKIP_NAME =
  /-(?:card|thumb|hero|og|inline)(?:-2)?\.(?:jpe?g|png|webp)$/i;

function loadSharp() {
  try {
    return createRequire(path.join(rootDir, 'apps/web/package.json'))('sharp');
  } catch {
    return null;
  }
}

function walkImages(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkImages(full, acc);
      continue;
    }
    if (!/\.(jpe?g|png|webp)$/i.test(entry.name)) continue;
    acc.push(full);
  }
  return acc;
}

function isSourceName(file) {
  return !SKIP_NAME.test(path.basename(file));
}

function cardPathFor(file) {
  return file.replace(/\.(jpe?g|png|webp)$/i, '-card.jpg');
}

function thumbPathFor(file) {
  return file.replace(/\.(jpe?g|png|webp)$/i, '-thumb.jpg');
}

function jpegPathFor(file) {
  return file.replace(/\.(png|webp)$/i, '.jpg');
}

function mirrorToWeb(absPublic) {
  if (!fs.existsSync(path.dirname(webImages))) return;
  const rel = path.relative(publicImages, absPublic);
  if (rel.startsWith('..')) return;
  const dest = path.join(webImages, rel);
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
  const n = Math.min(Math.max(1, limit), Math.max(items.length, 1));
  if (!items.length) return stats;
  await Promise.all(Array.from({ length: n }, () => worker()));
  return stats;
}

function cardOk(file) {
  if (!fs.existsSync(file)) return false;
  const size = fs.statSync(file).size;
  return size >= 8 * 1024 && size <= 120 * 1024;
}

async function writeJpeg(sharp, input, output, { width, height, quality }) {
  const tmp = `${output}.tmp.jpg`;
  await sharp(input)
    .rotate()
    .resize({
      width,
      height,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality, mozjpeg: true, progressive: true })
    .toFile(tmp);
  fs.renameSync(tmp, output);
  return fs.statSync(output).size;
}

async function fitTarget(sharp, input, output, { width, height, quality, minQuality, maxBytes }) {
  let q = quality;
  let size = await writeJpeg(sharp, input, output, { width, height, quality: q });
  while (size > maxBytes && q > minQuality) {
    q -= 5;
    size = await writeJpeg(sharp, input, output, { width, height, quality: q });
  }
  return { size, quality: q };
}

async function processCard(sharp, file, dryRun) {
  const rel = path.relative(publicImages, file).replace(/\\/g, '/');
  const before = fs.statSync(file).size;
  const dest = cardPathFor(file);
  if (before <= LEAN_BYTES) {
    return { kind: 'card', file: rel, before, after: 0, action: 'skip-lean' };
  }
  if (cardOk(dest)) {
    return {
      kind: 'card',
      file: rel,
      before,
      after: fs.statSync(dest).size,
      action: 'exists',
    };
  }

  const thumb = thumbPathFor(file);
  if (cardOk(thumb) && path.extname(thumb).toLowerCase() === '.jpg') {
    if (dryRun) {
      return {
        kind: 'card',
        file: rel,
        before,
        after: fs.statSync(thumb).size,
        action: 'would-copy-thumb',
      };
    }
    fs.copyFileSync(thumb, dest);
    mirrorToWeb(dest);
    return {
      kind: 'card',
      file: rel,
      before,
      after: fs.statSync(dest).size,
      action: 'copy-thumb',
    };
  }

  if (dryRun) {
    return { kind: 'card', file: rel, before, after: 0, action: 'would-write' };
  }

  const { size } = await fitTarget(sharp, file, dest, {
    width: CARD_WIDTH,
    height: undefined,
    quality: CARD_QUALITY,
    minQuality: CARD_QUALITY_MIN,
    maxBytes: CARD_TARGET_MAX,
  });
  mirrorToWeb(dest);
  return { kind: 'card', file: rel, before, after: size, action: 'wrote' };
}

async function processInline(sharp, file, dryRun) {
  const rel = path.relative(publicImages, file).replace(/\\/g, '/');
  const before = fs.statSync(file).size;
  if (before <= INLINE_TARGET_MAX) {
    const meta = await sharp(file).metadata();
    const long = Math.max(Number(meta.width) || 0, Number(meta.height) || 0);
    if (long > 0 && long <= INLINE_MAX_SIDE) {
      return { kind: 'inline', file: rel, before, after: before, action: 'skip-ok' };
    }
  }
  if (dryRun) {
    return { kind: 'inline', file: rel, before, after: 0, action: 'would-write' };
  }
  const { size } = await fitTarget(sharp, file, file, {
    width: INLINE_MAX_SIDE,
    height: INLINE_MAX_SIDE,
    quality: INLINE_QUALITY,
    minQuality: 68,
    maxBytes: INLINE_TARGET_MAX,
  });
  mirrorToWeb(file);
  return { kind: 'inline', file: rel, before, after: size, action: 'wrote' };
}

async function processLanding(sharp, file, dryRun) {
  const rel = path.relative(publicImages, file).replace(/\\/g, '/');
  const before = fs.statSync(file).size;
  const isPng = /\.png$/i.test(file);
  const dest = isPng ? jpegPathFor(file) : file;
  if (!isPng && before <= LANDING_TARGET_MAX) {
    const meta = await sharp(file).metadata();
    const long = Math.max(Number(meta.width) || 0, Number(meta.height) || 0);
    if (long > 0 && long <= LANDING_MAX_SIDE) {
      return { kind: 'landing', file: rel, before, after: before, action: 'skip-ok' };
    }
  }
  if (dryRun) {
    return {
      kind: 'landing',
      file: rel,
      dest: path.relative(publicImages, dest).replace(/\\/g, '/'),
      before,
      after: 0,
      action: isPng ? 'would-png-to-jpg' : 'would-write',
    };
  }
  const { size } = await fitTarget(sharp, file, dest, {
    width: LANDING_MAX_SIDE,
    height: LANDING_MAX_SIDE,
    quality: LANDING_QUALITY,
    minQuality: 62,
    maxBytes: LANDING_TARGET_MAX,
  });
  mirrorToWeb(dest);
  if (isPng && dest !== file && fs.existsSync(file)) {
    fs.unlinkSync(file);
    const webPng = path.join(webImages, path.relative(publicImages, file));
    if (fs.existsSync(webPng)) fs.unlinkSync(webPng);
  }
  return {
    kind: 'landing',
    file: rel,
    dest: path.relative(publicImages, dest).replace(/\\/g, '/'),
    before,
    after: size,
    action: isPng ? 'png-to-jpg' : 'wrote',
  };
}

function summarize(label, rows) {
  const wrote = rows.filter((row) =>
    ['wrote', 'png-to-jpg', 'copy-thumb', 'would-write', 'would-copy-thumb', 'would-png-to-jpg'].includes(
      row.action,
    ),
  );
  const before = wrote.reduce((sum, row) => sum + row.before, 0);
  const after = wrote.reduce((sum, row) => sum + row.after, 0);
  const sample = wrote
    .slice()
    .sort((a, b) => b.before - a.before)
    .slice(0, 5)
    .map((row) => ({
      file: row.dest || row.file,
      beforeKB: Math.round(row.before / 1024),
      afterKB: Math.round(row.after / 1024),
      action: row.action,
    }));
  return {
    label,
    files: rows.length,
    wrote: wrote.length,
    skipped: rows.length - wrote.length,
    beforeMB: +(before / 1e6).toFixed(1),
    afterMB: +(after / 1e6).toFixed(1),
    sample,
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run') || process.env.DRY_RUN === '1';
  const mode = String(argv.find((arg) => !arg.startsWith('--')) || 'events').trim().toLowerCase();
  const allowed = new Set(['events', 'venues', 'blog', 'blog-inline', 'landings', 'all']);
  if (!allowed.has(mode)) {
    throw new Error(`Unknown mode "${mode}". Use events|venues|blog|blog-inline|landings|all [--dry-run]`);
  }
  const sharp = loadSharp();
  if (!sharp) {
    const { spawnSync } = await import('node:child_process');
    const py = path.join(rootDir, 'scripts/compress-card-images.py');
    const pyArgs = [py, mode, ...(dryRun ? ['--dry-run'] : [])];
    const result = spawnSync('python', pyArgs, { stdio: 'inherit', cwd: rootDir });
    process.exit(result.status ?? 1);
  }
  const venues = walkImages(path.join(publicImages, 'venues')).filter(isSourceName);
  const events = walkImages(path.join(publicImages, 'events')).filter((file) => {
    if (!isSourceName(file)) return false;
    return !/evt-auto-/i.test(path.basename(file));
  });
  const blogCovers = walkImages(path.join(publicImages, 'blog')).filter((file) => {
    if (!isSourceName(file)) return false;
    // Covers only: skip inline/og already handled by SKIP_NAME; keep top-level slug.jpg
    const base = path.basename(file);
    return !/-inline(?:-2)?\./i.test(base);
  });
  const inlines = walkImages(path.join(publicImages, 'blog')).filter((file) =>
    /-inline(?:-2)?\.(jpe?g|png|webp)$/i.test(path.basename(file)),
  );
  const landings = walkImages(path.join(publicImages, 'landings'));

  const report = {};
  if (mode === 'events' || mode === 'all') {
    report.cards = summarize(
      'events-card',
      await mapPool(events, CONCURRENCY, (file) => processCard(sharp, file, dryRun)),
    );
  }
  if (mode === 'venues' || mode === 'all') {
    report.venues = summarize(
      'venues-card',
      await mapPool(venues, CONCURRENCY, (file) => processCard(sharp, file, dryRun)),
    );
  }
  if (mode === 'blog' || mode === 'all') {
    report.blogCards = summarize(
      'blog-card',
      await mapPool(blogCovers, CONCURRENCY, (file) => processCard(sharp, file, dryRun)),
    );
  }
  if (mode === 'blog-inline' || mode === 'all') {
    report.blogInline = summarize(
      'blog-inline',
      await mapPool(inlines, CONCURRENCY, (file) => processInline(sharp, file, dryRun)),
    );
  }
  if (mode === 'landings' || mode === 'all') {
    report.landings = summarize(
      'landings',
      await mapPool(landings, CONCURRENCY, (file) => processLanding(sharp, file, dryRun)),
    );
  }
  if (dryRun) report.dryRun = true;
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
