#!/usr/bin/env node
/** Strict visual clone audit (MD5 + aHash d<=THRESH). */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sharp = createRequire(path.join(root, 'apps/web/package.json'))('sharp');
const venuesRoot = path.join(root, 'apps/public/public/images/venues');
const THRESH = Number(process.env.AHASH_MAX || 2);
const only = process.argv.slice(2);

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
function clustersFrom(near) {
  const parent = new Map();
  const find = (x) => {
    if (!parent.has(x)) parent.set(x, x);
    if (parent.get(x) !== x) parent.set(x, find(parent.get(x)));
    return parent.get(x);
  };
  for (const p of near) {
    const ra = find(p.a);
    const rb = find(p.b);
    if (ra !== rb) parent.set(ra, rb);
  }
  const groups = new Map();
  for (const f of parent.keys()) {
    const r = find(f);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(f);
  }
  return [...groups.values()].filter((g) => g.length > 1).sort((a, b) => b.length - a.length);
}

const cities = only.length
  ? only
  : fs
      .readdirSync(venuesRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();

const summary = [];
const full = {};

for (const city of cities) {
  const dir = path.join(venuesRoot, city);
  if (!fs.existsSync(dir)) continue;
  const files = fs
    .readdirSync(dir)
    .filter((f) => /\.jpe?g$/i.test(f) && !/-(card|thumb)\./i.test(f) && !f.includes('-uniq'));
  const rows = [];
  for (const f of files) {
    const fullp = path.join(dir, f);
    const buf = fs.readFileSync(fullp);
    if (buf.length < 5000) {
      rows.push({ f, tiny: true });
      continue;
    }
    rows.push({
      f,
      md5: crypto.createHash('md5').update(buf).digest('hex'),
      ah: await ahash(fullp),
      tiny: false,
    });
  }
  const byMd5 = {};
  for (const r of rows) {
    if (!r.md5) continue;
    (byMd5[r.md5] = byMd5[r.md5] || []).push(r.f);
  }
  const md5Dups = Object.values(byMd5).filter((a) => a.length > 1);
  const ok = rows.filter((r) => r.ah != null);
  const near = [];
  for (let i = 0; i < ok.length; i++) {
    for (let j = i + 1; j < ok.length; j++) {
      const d = ham(ok[i].ah, ok[j].ah);
      if (d <= THRESH) near.push({ d, a: ok[i].f, b: ok[j].f });
    }
  }
  near.sort((a, b) => a.d - b.d || a.a.localeCompare(b.a));
  const clusters = clustersFrom(near);
  const d0 = near.filter((e) => e.d === 0).length;
  summary.push({
    city,
    files: files.length,
    md5: md5Dups.length,
    pairs: near.length,
    d0,
    clusters: clusters.length,
    topCluster: clusters[0]?.length || 0,
  });
  full[city] = { md5Dups, near, clusters };
}

summary.sort((a, b) => b.d0 - a.d0 || b.pairs - a.pairs || b.md5 - a.md5);
const out = path.join(root, 'scripts/audit-venue-visual-clones-strict.json');
fs.writeFileSync(out, JSON.stringify({ thresh: THRESH, summary, full }, null, 2));
console.log(
  summary
    .filter((s) => s.pairs || s.md5)
    .map(
      (s) =>
        `${s.city}: files=${s.files} d0=${s.d0} d<=${THRESH}=${s.pairs} md5=${s.md5} clusters=${s.clusters} top=${s.topCluster}`,
    )
    .join('\n'),
);
console.log('Wrote', out);
if (full.ryazan) {
  console.log('\n=== RYAZAN clusters ===');
  for (const g of full.ryazan.clusters) console.log(g.length, g.sort().join(' | '));
}
