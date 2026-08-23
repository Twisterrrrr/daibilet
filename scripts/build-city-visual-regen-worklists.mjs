#!/usr/bin/env node
/**
 * Build per-city regen worklists with place names for image prompts.
 *   node scripts/build-city-visual-regen-worklists.mjs [city...]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lib = path.join(root, 'apps/web/src/lib');
const auditPath = path.join(root, 'scripts/audit-venue-visual-clones-strict.json');
const outDir = path.join(root, 'scripts/city-visual-regen');

function readMustSeeFromCityInfo(city) {
  const cityInfoPath = path.join(lib, 'cityInfo.ts');
  if (!fs.existsSync(cityInfoPath)) return [];
  const text = fs.readFileSync(cityInfoPath, 'utf8');
  const keyRe = new RegExp(`(?:'${city}'|${city}):\\s*\\{`);
  const km = keyRe.exec(text);
  if (!km) return [];
  const mustIdx = text.indexOf('mustSee:', km.index);
  if (mustIdx < 0 || mustIdx - km.index > 15000) return [];
  const m = text.slice(mustIdx).match(/mustSee:\s*\[/);
  if (!m) return [];
  const start = mustIdx + m.index + m[0].length - 1;
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
  const slugMatches = [...chunk.matchAll(/(?:locationSlug|venueSlug):\s*'([^']+)'/g)].map((x) => x[1]);
  const names = [...chunk.matchAll(/name:\s*'([^']+)'/g)].map((x) => x[1]);
  return slugMatches
    .filter((slug) => slug.startsWith(city))
    .map((slug, i) => ({
      slug,
      name: names[i] || slug.replace(new RegExp(`^${city}-`), '').replace(/-/g, ' '),
      stem: slug.replace(new RegExp(`^${city}-`), ''),
    }));
}

function readMustSee(city) {
  const fromHub = readMustSeeFromHub(city);
  if (fromHub.length) return fromHub;
  return readMustSeeFromCityInfo(city);
}

function readMustSeeFromHub(city) {
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
  const slugMatches = [...chunk.matchAll(/(?:locationSlug|venueSlug):\s*'([^']+)'/g)].map((x) => x[1]);
  const nameFromPlace = [...chunk.matchAll(/place\(\s*'([^']+)'/g)].map((x) => x[1]);
  const nameFromField = [...chunk.matchAll(/name:\s*'([^']+)'/g)].map((x) => x[1]);
  const names = nameFromPlace.length >= slugMatches.length ? nameFromPlace : nameFromField;
  const items = slugMatches
    .filter((slug) => slug.startsWith(city))
    .map((slug, i) => ({
      slug,
      name: names[i] || slug.replace(new RegExp(`^${city}-`), '').replace(/-/g, ' '),
      stem: slug.replace(new RegExp(`^${city}-`), ''),
    }));
  return items;
}

function readIdentityStems(city) {
  const dir = path.join(root, 'apps/public/public/images/venues', city);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^identity-.*\.jpg$/i.test(f) && !/-(card|thumb)\./i.test(f))
    .map((f) => f.replace(/\.jpg$/i, ''));
}

function readScenarioCovers(city) {
  const files = [`${city}-hub.ts`, `${city}-line-presets.ts`].map((f) => path.join(lib, f));
  const stems = [];
  for (const fp of files) {
    if (!fs.existsSync(fp)) continue;
    const text = fs.readFileSync(fp, 'utf8');
    for (const m of text.matchAll(
      new RegExp(`coverImageUrl:\\s*'/images/venues/${city}/([^']+)'`, 'g'),
    )) {
      stems.push(m[1].replace(/\.jpg$/i, ''));
    }
  }
  return [...new Set(stems)];
}

function clusterMap(city, audit) {
  const near = audit.full?.[city]?.near || [];
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
  const map = new Map();
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    for (const f of g) map.set(f, g);
  }
  return map;
}

const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
const only = process.argv.slice(2);
const cities = only.length
  ? only
  : audit.summary
      .filter((s) => s.d0 > 0 || s.pairs > 0)
      .map((s) => s.city)
      .filter((c) => c !== 'place' && c !== 'ryazan');

fs.mkdirSync(outDir, { recursive: true });
const master = [];

for (const city of cities) {
  const mustSee = readMustSee(city);
  const identity = readIdentityStems(city);
  const scenarios = readScenarioCovers(city);
  const cMap = clusterMap(city, audit);
  const priorityStems = new Set([
    ...mustSee.slice(0, 12).map((x) => x.stem),
    ...identity,
    ...scenarios,
  ]);
  const nameByStem = new Map(mustSee.map((x) => [x.stem, x.name]));
  const regen = [];
  const seen = new Set();

  for (const stem of priorityStems) {
    const file = `${stem}.jpg`;
    const cl = cMap.get(file);
    if (!cl) continue;
    const sorted = [...cl].sort();
    const keeper = sorted[0];
    if (file === keeper) continue;
    if (seen.has(stem)) continue;
    seen.add(stem);
    regen.push({
      stem,
      name: nameByStem.get(stem) || stem.replace(/-/g, ' '),
      clusterSize: cl.length,
      keeper: keeper.replace(/\.jpg$/i, ''),
    });
  }

  // Full must-see: any slug in multi-file cluster
  for (const item of mustSee) {
    const file = `${item.stem}.jpg`;
    const cl = cMap.get(file);
    if (!cl || cl.length < 2) continue;
    const sorted = [...cl].sort();
    if (file === sorted[0]) continue;
    if (seen.has(item.stem)) continue;
    seen.add(item.stem);
    regen.push({
      stem: item.stem,
      name: item.name,
      clusterSize: cl.length,
      keeper: sorted[0].replace(/\.jpg$/i, ''),
    });
  }

  const wl = {
    city,
    mustSeeCount: mustSee.length,
    regen: regen.sort((a, b) => a.stem.localeCompare(b.stem)),
    d0: audit.summary.find((s) => s.city === city)?.d0 ?? 0,
  };
  fs.writeFileSync(path.join(outDir, `${city}.json`), JSON.stringify(wl, null, 2));
  master.push({ city, d0: wl.d0, regen: wl.regen.length, mustSee: wl.mustSeeCount });
}

master.sort((a, b) => b.regen - a.regen || b.d0 - a.d0);
fs.writeFileSync(path.join(outDir, '_index.json'), JSON.stringify(master, null, 2));
console.log(master.map((m) => `${m.city}: regen=${m.regen} mustSee=${m.mustSee} d0=${m.d0}`).join('\n'));
