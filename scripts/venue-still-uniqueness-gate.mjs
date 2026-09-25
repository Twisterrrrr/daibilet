/**
 * Reject venue stills that collide by MD5 or near-duplicate aHash vs city folder / denylist.
 *   node scripts/venue-still-uniqueness-gate.mjs <src.jpg> <city> [--stem=foo]
 * Exit 0 = unique OK; 1 = reject (print JSON reason).
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'apps/public/public/images/venues');
const sharp = createRequire(path.join(root, 'apps/web/package.json'))('sharp');

const DENYLIST_PATH = path.join(root, 'scripts/venue-still-denylist.json');

function md5(buf) {
  return crypto.createHash('md5').update(buf).digest('hex');
}

/** 8x8 grayscale average hash → 64-bit hex */
async function aHash(buf) {
  const raw = await sharp(buf)
    .rotate()
    .greyscale()
    .resize(8, 8, { fit: 'fill' })
    .raw()
    .toBuffer();
  let sum = 0;
  for (const v of raw) sum += v;
  const avg = sum / raw.length;
  let bits = 0n;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] >= avg) bits |= 1n << BigInt(i);
  }
  return bits.toString(16).padStart(16, '0');
}

function hamming(a, b) {
  const x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let n = 0n;
  let y = x;
  while (y) {
    y &= y - 1n;
    n++;
  }
  return Number(n);
}

async function main() {
  const src = process.argv[2];
  const city = process.argv[3];
  const stemArg = process.argv.find((a) => a.startsWith('--stem='));
  const stem = stemArg ? stemArg.slice('--stem='.length) : null;
  const maxDist = Number(process.env.AHASH_MAX_DIST || 8);

  if (!src || !city) {
    console.error('Usage: node scripts/venue-still-uniqueness-gate.mjs <src.jpg> <city> [--stem=]');
    process.exit(2);
  }
  if (!fs.existsSync(src)) {
    console.log(JSON.stringify({ ok: false, reason: 'missing_src', src }));
    process.exit(1);
  }

  const buf = fs.readFileSync(src);
  const hash = md5(buf);
  const ah = await aHash(buf);

  const deny = fs.existsSync(DENYLIST_PATH)
    ? JSON.parse(fs.readFileSync(DENYLIST_PATH, 'utf8'))
    : { md5: [], ahash: [] };
  if ((deny.md5 || []).includes(hash)) {
    console.log(JSON.stringify({ ok: false, reason: 'denylist_md5', md5: hash, ahash: ah }));
    process.exit(1);
  }
  for (const d of deny.ahash || []) {
    if (hamming(ah, d) <= maxDist) {
      console.log(JSON.stringify({ ok: false, reason: 'denylist_ahash', md5: hash, ahash: ah, vs: d }));
      process.exit(1);
    }
  }

  const dir = path.join(publicDir, city);
  if (fs.existsSync(dir)) {
    for (const name of fs.readdirSync(dir)) {
      if (!/\.jpe?g$/i.test(name)) continue;
      if (/-card\.|-thumb\./i.test(name)) continue;
      const base = name.replace(/\.jpe?g$/i, '');
      if (stem && base === stem) continue;
      const other = fs.readFileSync(path.join(dir, name));
      const oMd5 = md5(other);
      if (oMd5 === hash) {
        console.log(JSON.stringify({ ok: false, reason: 'city_md5_clone', vs: name, md5: hash }));
        process.exit(1);
      }
      const oAh = await aHash(other);
      const dist = hamming(ah, oAh);
      if (dist <= maxDist) {
        console.log(
          JSON.stringify({ ok: false, reason: 'city_ahash_near', vs: name, dist, ahash: ah, other: oAh }),
        );
        process.exit(1);
      }
    }
  }

  console.log(JSON.stringify({ ok: true, md5: hash, ahash: ah, bytes: buf.length }));
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
