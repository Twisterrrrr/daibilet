#!/usr/bin/env node
/**
 * Master queue: Barnaul pending + small must-see + d0 regen worklists.
 *   node scripts/build-full-visual-regen-queue.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lib = path.join(root, 'apps/web/src/lib');
const venuesRoot = path.join(root, 'apps/public/public/images/venues');
const outPath = path.join(root, 'scripts/full-visual-regen-queue.json');

function readMustSee(city) {
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
  const names = [...chunk.matchAll(/place\(\s*'([^']+)'/g)].map((x) => x[1]);
  let ni = 0;
  for (const sm of chunk.matchAll(/(?:locationSlug|venueSlug):\s*'([^']+)'/g)) {
    if (!sm[1].startsWith(`${city}-`)) continue;
    slugs.push({
      stem: sm[1].slice(city.length + 1),
      name: names[ni] || sm[1].slice(city.length + 1).replace(/-/g, ' '),
    });
    ni++;
  }
  return slugs;
}

function fileNeedsRegen(city, stem) {
  const p = path.join(venuesRoot, city, `${stem}.jpg`);
  if (!fs.existsSync(p)) return 'missing';
  const bytes = fs.statSync(p).size;
  if (bytes < 5000) return 'tiny';
  if (bytes < 40000) return 'small';
  return null;
}

const queue = [];
const seen = new Set();

function add(city, stem, name, reason, wave) {
  const key = `${city}:${stem}`;
  if (seen.has(key)) return;
  seen.add(key);
  queue.push({ city, stem, name, reason, wave });
}

// Wave 1: Barnaul pending
const barnaulWl = JSON.parse(
  fs.readFileSync(path.join(root, 'scripts/barnaul-regen-worklist.json'), 'utf8'),
);
const barnaulNames = new Map(readMustSee('barnaul').map((x) => [x.stem, x.name]));
for (const stem of barnaulWl.pending) {
  const need = fileNeedsRegen('barnaul', stem);
  if (need) add('barnaul', stem, barnaulNames.get(stem) || stem, need, 'barnaul');
}

// Wave 2: small/missing on must-see (all cities)
const cities = fs
  .readdirSync(venuesRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== 'place')
  .map((d) => d.name);
for (const city of cities) {
  const mustSee = readMustSee(city);
  const nameByStem = new Map(mustSee.map((x) => [x.stem, x.name]));
  for (const { stem } of mustSee) {
    const need = fileNeedsRegen(city, stem);
    if (need) add(city, stem, nameByStem.get(stem) || stem, need, 'small-mustsee');
  }
}

// Wave 3: d0 regen worklists
const regenDir = path.join(root, 'scripts/city-visual-regen');
if (fs.existsSync(regenDir)) {
  for (const f of fs.readdirSync(regenDir).filter((x) => x.endsWith('.json') && x !== '_index.json')) {
    const wl = JSON.parse(fs.readFileSync(path.join(regenDir, f), 'utf8'));
    for (const item of wl.regen || []) {
      add(wl.city, item.stem, item.name, 'd0-cluster', 'd0-tail');
    }
  }
}

const byWave = {};
for (const q of queue) {
  byWave[q.wave] = (byWave[q.wave] || 0) + 1;
}

const report = {
  generatedAt: new Date().toISOString(),
  total: queue.length,
  byWave,
  byCity: Object.fromEntries(
    Object.entries(
      queue.reduce((acc, q) => {
        acc[q.city] = (acc[q.city] || 0) + 1;
        return acc;
      }, {}),
    ).sort((a, b) => b[1] - a[1]),
  ),
  queue: queue.sort((a, b) => a.city.localeCompare(b.city) || a.stem.localeCompare(b.stem)),
};

fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ total: report.total, byWave: report.byWave }, null, 2));
console.log('Top cities:', Object.entries(report.byCity).slice(0, 10).map(([c, n]) => `${c}:${n}`).join(', '));
console.log('Wrote', outPath);
