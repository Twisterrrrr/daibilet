#!/usr/bin/env node
/**
 * Per-city visual shelf audit: must-see first N + identity + scenario covers.
 *   node scripts/audit-city-visual-shelf.mjs [city ...]
 * Writes scripts/city-visual-shelf-audit.json
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lib = path.join(root, 'apps/web/src/lib');
const venuesRoot = path.join(root, 'apps/public/public/images/venues');
const mapPath = path.join(root, 'apps/public/public', 'apps/public'); // noop guard
const sharp = createRequire(path.join(root, 'apps/web/package.json'))('sharp');
const THRESH = Number(process.env.AHASH_MAX || 2);
const SHELF_N = Number(process.env.SHELF_N || 12);

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

function slugToStem(slug, city) {
  return slug.replace(new RegExp(`^${city}-`), '');
}

function readMustSeeSlugs(city) {
  const hubPath = path.join(lib, `${city}-hub.ts`);
  if (!fs.existsSync(hubPath)) return [];
  const text = fs.readFileSync(hubPath, 'utf8');
  const m = text.match(/export const \w+_MUST_SEE[^=]*=\s*\[/);
  if (!m) return [];
  const start = m.index + m[0].length - 1;
  let depth = 0;
  let end = start;
  for (; end < text.length; end++) {
    if (text[end] === '[') depth++;
    else if (text[end] === ']') {
      depth--;
      if (depth === 0) {
        end++;
        break;
      }
    }
  }
  const chunk = text.slice(start, end);
  const slugs = [];
  for (const sm of chunk.matchAll(/(?:locationSlug|venueSlug):\s*'([^']+)'/g)) {
    if (sm[1].startsWith(city)) slugs.push(sm[1]);
  }
  return slugs;
}

function readScenarioCovers(city) {
  const files = [`${city}-hub.ts`, `${city}-line-presets.ts`].map((f) => path.join(lib, f));
  const covers = [];
  for (const fp of files) {
    if (!fs.existsSync(fp)) continue;
    const text = fs.readFileSync(fp, 'utf8');
    for (const m of text.matchAll(/coverImageUrl:\s*'\/images\/venues\/[^/]+\/([^']+)'/g)) {
      covers.push(m[1]);
    }
  }
  return [...new Set(covers)];
}

function readIdentityStems(city) {
  const packPath = path.join(lib, 'city-place-images-region-packs.ts');
  if (!fs.existsSync(packPath)) return [];
  const text = fs.readFileSync(packPath, 'utf8');
  const re = new RegExp(`${city}:\\s*'/images/venues/${city}/identity-([^']+)\\.jpg'`, 'g');
  const stems = [];
  let m;
  while ((m = re.exec(text))) stems.push(`identity-${m[1]}.jpg`);
  // also scan folder
  const dir = path.join(venuesRoot, city);
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) {
      if (/^identity-.*\.jpg$/i.test(f) && !/-(card|thumb)\./i.test(f)) stems.push(f);
    }
  }
  return [...new Set(stems)];
}

async function auditCity(city) {
  const dir = path.join(venuesRoot, city);
  if (!fs.existsSync(dir)) return null;
  const files = fs
    .readdirSync(dir)
    .filter((f) => /\.jpe?g$/i.test(f) && !/-(card|thumb)\./i.test(f) && !f.includes('-uniq'));
  const rows = [];
  for (const f of files) {
    const full = path.join(dir, f);
    const buf = fs.readFileSync(full);
    if (buf.length < 5000) {
      rows.push({ f, tiny: true });
      continue;
    }
    rows.push({
      f,
      md5: crypto.createHash('md5').update(buf).digest('hex'),
      ah: await ahash(full),
      bytes: buf.length,
    });
  }
  const ok = rows.filter((r) => r.ah != null);
  const near = [];
  for (let i = 0; i < ok.length; i++) {
    for (let j = i + 1; j < ok.length; j++) {
      const d = ham(ok[i].ah, ok[j].ah);
      if (d <= THRESH) near.push({ d, a: ok[i].f, b: ok[j].f });
    }
  }
  const clusters = clustersFrom(near);
  const mustSee = readMustSeeSlugs(city);
  const shelfSlugs = mustSee.slice(0, SHELF_N);
  const shelfFiles = shelfSlugs.map((s) => `${slugToStem(s, city)}.jpg`);
  const identity = readIdentityStems(city);
  const scenarioCovers = readScenarioCovers(city);
  const priorityFiles = [...new Set([...shelfFiles, ...identity, ...scenarioCovers])];

  const fileCluster = new Map();
  for (const cl of clusters) {
    for (const f of cl) fileCluster.set(f, cl);
  }

  const shelfPairs = near.filter((p) => shelfFiles.includes(p.a) && shelfFiles.includes(p.b));
  const regen = [];
  const seenClusters = new Set();
  for (const f of priorityFiles) {
    const cl = fileCluster.get(f);
    if (!cl) continue;
    const key = [...cl].sort().join('|');
    if (seenClusters.has(key)) continue;
    seenClusters.add(key);
    // keep first alphabetically in cluster, regen rest in priority set
    const sorted = [...cl].sort();
    const keeper = sorted.find((x) => priorityFiles.includes(x)) || sorted[0];
    for (const x of sorted) {
      if (x === keeper) continue;
      if (priorityFiles.includes(x)) {
        regen.push({
          stem: x.replace(/\.jpg$/i, ''),
          file: x,
          cluster: sorted.map((s) => s.replace(/\.jpg$/i, '')),
          keeper: keeper.replace(/\.jpg$/i, ''),
        });
      }
    }
  }
  // also flag priority files in tiny/broken
  for (const f of priorityFiles) {
    const row = rows.find((r) => r.f === f);
    if (!row || row.tiny || (row.bytes && row.bytes < 40000)) {
      const stem = f.replace(/\.jpg$/i, '');
      if (!regen.some((r) => r.stem === stem)) {
        regen.push({ stem, file: f, cluster: [], keeper: null, reason: row?.tiny ? 'tiny' : 'small' });
      }
    }
  }

  return {
    city,
    files: files.length,
    d0: near.filter((p) => p.d === 0).length,
    pairs: near.length,
    clusters: clusters.length,
    topCluster: clusters[0]?.length || 0,
    mustSeeCount: mustSee.length,
    shelfFiles,
    identity,
    scenarioCovers,
    shelfPairs: shelfPairs.length,
    regen: regen.sort((a, b) => a.stem.localeCompare(b.stem)),
  };
}

const only = process.argv.slice(2);
const cities = only.length
  ? only
  : fs
      .readdirSync(venuesRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== 'place')
      .map((d) => d.name)
      .sort();

const out = {};
const summary = [];
for (const city of cities) {
  const r = await auditCity(city);
  if (!r) continue;
  out[city] = r;
  summary.push({
    city: r.city,
    d0: r.d0,
    clusters: r.clusters,
    shelfPairs: r.shelfPairs,
    regen: r.regen.length,
  });
}
summary.sort((a, b) => b.regen - a.regen || b.d0 - a.d0);

const outPath = path.join(root, 'scripts/city-visual-shelf-audit.json');
fs.writeFileSync(outPath, JSON.stringify({ thresh: THRESH, shelfN: SHELF_N, summary, cities: out }, null, 2));
console.log(
  summary
    .filter((s) => s.regen || s.shelfPairs)
    .map((s) => `${s.city}: regen=${s.regen} shelfPairs=${s.shelfPairs} d0=${s.d0}`)
    .join('\n'),
);
console.log('Wrote', outPath);
