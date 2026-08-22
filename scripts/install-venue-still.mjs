/**
 * Install venue still: base + card + thumb from assets/{stem}.jpg
 *   node scripts/install-venue-still.mjs <stem> <city-folder>
 *   node scripts/install-venue-still.mjs --batch scripts/duplicate-install-batch.json
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const assets = process.env.VENUE_ASSETS_DIR || 'C:/Users/user/.cursor/projects/f-coding-daibilet-push/assets';
const publicDir = path.join(root, 'apps/public/public/images/venues');
const sharp = createRequire(path.join(root, 'apps/web/package.json'))('sharp');

async function install(stem, city) {
  const src = path.join(assets, `${stem}.jpg`);
  const destDir = path.join(publicDir, city);
  if (!fs.existsSync(src)) return { stem, city, ok: false, reason: 'missing asset' };
  const buf = await sharp(src)
    .rotate()
    .resize(1600, 1067, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
  await sharp(buf).toFile(path.join(destDir, `${stem}.jpg`));
  await sharp(buf)
    .resize(640, null, { withoutEnlargement: true })
    .jpeg({ quality: 68 })
    .toFile(path.join(destDir, `${stem}-card.jpg`));
  await sharp(buf)
    .resize(320, null, { withoutEnlargement: true })
    .jpeg({ quality: 65 })
    .toFile(path.join(destDir, `${stem}-thumb.jpg`));
  return { stem, city, ok: true, bytes: buf.length };
}

const batchArg = process.argv.find((a) => a.startsWith('--batch='));
if (batchArg) {
  const items = JSON.parse(fs.readFileSync(batchArg.slice('--batch='.length), 'utf8'));
  let ok = 0;
  for (const { stem, city } of items) {
    const r = await install(stem, city);
    if (r.ok) ok++;
    else console.log('MISSING', stem);
  }
  console.log(JSON.stringify({ total: items.length, installed: ok }));
} else {
  const [, , stem, city] = process.argv;
  console.log(JSON.stringify(await install(stem, city)));
}
