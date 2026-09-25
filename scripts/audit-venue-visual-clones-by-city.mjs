#!/usr/bin/env node
/** Visual clone audit across venue city folders (MD5 + aHash). */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sharp = createRequire(path.join(root, 'apps/web/package.json'))('sharp');
const venuesRoot = path.join(root, 'apps/public/public/images/venues');
const THRESH = Number(process.env.AHASH_MAX || 8);

async function ahash(file) {
  const { data } = await sharp(file)
    .greyscale()
    .resize(8, 8, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let sum = 0;
  for (const v of data) sum += v;
  const avg = sum / data.length;
  let bits = 0n;
  for (let i = 0; i < data.length; i++) if (data[i] >= avg) bits |= 1n << BigInt(i);
  return bits;
}
function ham(a, b) {
  let x = a ^ b;
  let c = 0;
  while (x) {
    c += Number(x & 1n);
    x >>= 1n;
  }
  return c;
}

const only = process.argv.slice(2);
const cities = only.length
  ? only
  : fs
      .readdirSync(venuesRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();

const bad = [];
const report = {};

for (const city of cities) {
  const dir = path.join(venuesRoot, city);
  const files = fs
    .readdirSync(dir)
    .filter((f) => /\.jpe?g$/i.test(f) && !/-(card|thumb)\./i.test(f) && !f.includes('-uniq'));
  const rows = [];
  for (const f of files) {
    const full = path.join(dir, f);
    const buf = fs.readFileSync(full);
    if (buf.length < 5000) {
      rows.push({ f, bytes: buf.length, md5: null, ah: null, tiny: true });
      continue;
    }
    const md5 = crypto.createHash('md5').update(buf).digest('hex');
    const ah = await ahash(full);
    rows.push({ f, bytes: buf.length, md5, ah, tiny: false });
  }
  const byMd5 = {};
  for (const r of rows) {
    if (!r.md5) continue;
    (byMd5[r.md5] = byMd5[r.md5] || []).push(r.f);
  }
  const md5Dups = Object.values(byMd5).filter((a) => a.length > 1);
  const near = [];
  const ok = rows.filter((r) => r.ah != null);
  for (let i = 0; i < ok.length; i++) {
    for (let j = i + 1; j < ok.length; j++) {
      const d = ham(ok[i].ah, ok[j].ah);
      if (d <= THRESH) near.push({ d, a: ok[i].f, b: ok[j].f });
    }
  }
  near.sort((a, b) => a.d - b.d);
  const tiny = rows.filter((r) => r.tiny).map((r) => r.f);
  report[city] = {
    files: files.length,
    md5DupGroups: md5Dups.length,
    md5Dups: md5Dups.slice(0, 20),
    ahashPairs: near.length,
    ahashNear: near.slice(0, 30),
    tiny,
  };
  if (md5Dups.length || near.length || tiny.length) {
    bad.push({
      city,
      md5DupGroups: md5Dups.length,
      ahashPairs: near.length,
      tiny: tiny.length,
      top: near.slice(0, 10),
      md5Sample: md5Dups.slice(0, 5),
    });
  }
}

const out = path.join(root, 'scripts/audit-venue-visual-clones-by-city.json');
fs.writeFileSync(out, JSON.stringify({ thresh: THRESH, badCities: bad.length, bad, report }, null, 2));
console.log(JSON.stringify({ cities: cities.length, badCities: bad.length, bad: bad.slice(0, 40) }, null, 2));
console.log('Wrote', out);
