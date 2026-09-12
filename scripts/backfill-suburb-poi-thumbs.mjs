/**
 * Backfill missing `-thumb.jpg` for venue POI cards (suburb nested rail).
 * Source: base `.jpg` or existing `-card.jpg`. Target: 480px wide, q78 (sharp nested rails).
 *
 *   node scripts/backfill-suburb-poi-thumbs.mjs
 *   node scripts/backfill-suburb-poi-thumbs.mjs --cities=perm,moscow,ekaterinburg
 *   node scripts/backfill-suburb-poi-thumbs.mjs --from-audit
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const publicVenues = path.join(root, 'apps/public/public/images/venues');
const webVenues = path.join(root, 'apps/web/public/images/venues');
const auditPath = path.join(__dirname, 'audit-city-suburbs-output.json');

const sharp = createRequire(path.join(root, 'apps/web/package.json'))('sharp');

const THUMB_WIDTH = 480;
const THUMB_QUALITY = 78;

const citiesArg = process.argv.find((a) => a.startsWith('--cities='));
const cityFilter = citiesArg
  ? citiesArg
      .slice('--cities='.length)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : null;
const fromAudit = process.argv.includes('--from-audit');

function mirrorToWeb(absPublic) {
  if (!fs.existsSync(webVenues)) return;
  const rel = path.relative(publicVenues, absPublic);
  const dest = path.join(webVenues, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(absPublic, dest);
}

function isBaseJpg(name) {
  return /\.jpe?g$/i.test(name) && !/-(?:card|thumb)\.jpe?g$/i.test(name);
}

async function writeThumbFrom(srcFile, thumbFile) {
  await sharp(srcFile)
    .rotate()
    .resize(THUMB_WIDTH, null, { withoutEnlargement: true })
    .jpeg({ quality: THUMB_QUALITY, mozjpeg: true })
    .toFile(thumbFile);
  mirrorToWeb(thumbFile);
}

async function ensureThumb(baseFile) {
  const thumbFile = baseFile.replace(/\.jpe?g$/i, '-thumb.jpg');
  if (fs.existsSync(thumbFile)) {
    const size = fs.statSync(thumbFile).size;
    if (size >= 4000) return { action: 'skip-exists', thumbFile };
  }
  const cardFile = baseFile.replace(/\.jpe?g$/i, '-card.jpg');
  const src = fs.existsSync(cardFile) ? cardFile : baseFile;
  if (!fs.existsSync(src)) return { action: 'skip-no-source', thumbFile, baseFile };
  await writeThumbFrom(src, thumbFile);
  return {
    action: 'wrote',
    thumbFile,
    bytes: fs.statSync(thumbFile).size,
    from: path.basename(src),
  };
}

function collectBaseFilesFromAudit() {
  if (!fs.existsSync(auditPath)) throw new Error(`Missing ${auditPath} — run tmp-audit-city-suburbs.mjs first`);
  const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
  const bases = new Set();
  for (const row of audit.all404Thumbs || []) {
    const baseUrl = String(row.baseUrl || '').trim();
    if (!baseUrl.startsWith('/images/venues/')) continue;
    bases.add(path.join(publicVenues, baseUrl.replace(/^\/images\/venues\//, '')));
  }
  return [...bases];
}

function collectBaseFilesFromDisk() {
  const out = [];
  if (!fs.existsSync(publicVenues)) return out;
  for (const cityDir of fs.readdirSync(publicVenues, { withFileTypes: true })) {
    if (!cityDir.isDirectory()) continue;
    if (cityFilter && !cityFilter.includes(cityDir.name)) continue;
    const dir = path.join(publicVenues, cityDir.name);
    for (const file of fs.readdirSync(dir)) {
      if (!isBaseJpg(file)) continue;
      out.push(path.join(dir, file));
    }
  }
  return out;
}

async function main() {
  let bases = fromAudit ? collectBaseFilesFromAudit() : collectBaseFilesFromDisk();
  if (!fromAudit && !cityFilter) {
    // default: all cities, only where thumb missing
    bases = bases.filter((f) => {
      const thumb = f.replace(/\.jpe?g$/i, '-thumb.jpg');
      return !fs.existsSync(thumb) || fs.statSync(thumb).size < 4000;
    });
  }

  const results = [];
  for (const baseFile of bases) {
    results.push(await ensureThumb(baseFile));
  }

  const wrote = results.filter((r) => r.action === 'wrote');
  const skipped = results.filter((r) => r.action.startsWith('skip'));
  const byCity = {};
  for (const r of wrote) {
    const city = r.thumbFile.split(path.sep).slice(-2, -1)[0];
    byCity[city] = (byCity[city] || 0) + 1;
  }

  console.log(
    JSON.stringify(
      {
        scanned: bases.length,
        wrote: wrote.length,
        skipped: skipped.length,
        byCity,
        sample: wrote.slice(0, 8).map((r) => ({
          file: path.relative(publicVenues, r.thumbFile).replace(/\\/g, '/'),
          bytes: r.bytes,
          from: r.from,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
