#!/usr/bin/env node
/**
 * Merge etalon + batch markdown descriptions into seed draft + enrich JSON.
 *
 * Usage:
 *   node scripts/assemble-moscow-mustsee-descriptions.mjs
 *   node scripts/assemble-moscow-mustsee-descriptions.mjs --write
 */
import fs from 'node:fs';
import path from 'node:path';

import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const drafts = path.join(root, 'docs/drafts');
const write = process.argv.includes('--write');

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[«»"'„']/g, '')
    .replace(/[№#]/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Soft key without parentheticals - only for fallback fuzzy. */
const normSoft = (s) =>
  norm(String(s || '').replace(/\([^)]*\)/g, ' '));

function parseBatch(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const parts = raw.split(/\n(?=## \d+\. )/);
  const out = [];
  for (const part of parts) {
    const m = part.match(/^## (\d+)\.\s+([^\n]+)\n([\s\S]*?)(?=\n---\s*\n|\n## \d+\. |\n## Частоты|\s*$)/);
    if (!m) continue;
    const name = m[2].trim();
    const chunk = m[3];
    const metaEnd = chunk.search(/\n\n(?![-\s])/);
    const body = metaEnd >= 0 ? chunk.slice(metaEnd).trim() : chunk.trim();
    const paras = body
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter((p) => p && !p.startsWith('- ') && !p.startsWith('#') && !p.startsWith('|'));
    const role = (chunk.match(/role:\s*`?(\w+)`?/i) || [, ''])[1];
    const filter = (chunk.match(/(?:filter|category):\s*`?([\w-]+)`?/i) || [, ''])[1];
    const addr = (chunk.match(/addr:\s*([^\n·]+)/i) || [, ''])[1].trim();
    out.push({
      name,
      role: role || null,
      filter: filter || null,
      address: addr || null,
      description: paras.join('\n\n'),
      paragraphs: paras.length,
      source: path.basename(file),
    });
  }
  return out;
}

const mdFiles = [
  'moscow-mustsee-etalon-10.md',
  ...fs
    .readdirSync(drafts)
    .filter((f) => /^moscow-mustsee-batch-\d+\.md$/.test(f))
    .sort(),
].map((f) => path.join(drafts, f));

const texts = [];
for (const f of mdFiles) {
  if (!fs.existsSync(f)) continue;
  texts.push(...parseBatch(f));
}

const seedPath = path.join(drafts, 'moscow-must-see-seed-draft.json');
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const pools = {
  expands: seed.expands || [],
  inserts: seed.inserts || [],
  hub_only: seed.hub_only || [],
};
const all = [...pools.expands, ...pools.inserts, ...pools.hub_only];

function findSeed(name) {
  const n = norm(name);
  const nSoft = normSoft(name);
  for (const p of all) {
    if (norm(p.name) === n || norm(p.hubName) === n) return p;
  }
  let best = null;
  let bestScore = 0;
  for (const p of all) {
    const pn = norm(p.name);
    const pnSoft = normSoft(p.name);
    const hn = norm(p.hubName);
    if (pnSoft === nSoft && pnSoft.length > 8) {
      // Prefer unused exact-soft only when distinctive; still allow if unique soft among unused
      const twins = all.filter((x) => normSoft(x.name) === nSoft);
      if (twins.length === 1) return p;
      continue;
    }
    if (pn.includes(n) || n.includes(pn) || (hn && (hn.includes(n) || n.includes(hn)))) {
      const score = Math.min(pn.length, n.length);
      if (score > bestScore) {
        best = p;
        bestScore = score;
      }
    }
  }
  return best;
}

const matched = [];
const unmatchedTexts = [];
const usedSeed = new Set();

for (const t of texts) {
  const p = findSeed(t.name);
  if (!p) {
    unmatchedTexts.push(t.name);
    continue;
  }
  const key = `${p.role}|${p.name}|${p.latitude}|${p.longitude}`;
  if (usedSeed.has(key)) {
    // later batch / etalon wins if already set? keep first (etalon first in list)
    continue;
  }
  usedSeed.add(key);
  p.desc = t.description;
  p.descStatus = 'ready';
  if (t.address && !p.address) p.address = t.address;
  matched.push({ name: t.name, seedName: p.name, role: p.role, source: t.source, paragraphs: t.paragraphs });
}

const withoutDesc = all.filter((p) => p.descStatus !== 'ready');

/** Attach hub locationSlug/venueSlug onto expand/hub_only via hubName or name. */
function loadHubSlugIndex() {
  const packPath = path.join(root, 'scripts/data/patch-moscow-hub-pack.js');
  if (!fs.existsSync(packPath)) return new Map();
  const raw = fs.readFileSync(packPath, 'utf8');
  const map = new Map();
  const re =
    /\{\s*name:\s*'((?:\\'|[^'])*)'[\s\S]*?(?:locationSlug|venueSlug):\s*'((?:\\'|[^'])*)'/g;
  let m;
  while ((m = re.exec(raw))) {
    const name = m[1].replace(/\\'/g, "'");
    const slug = m[2];
    map.set(norm(name), slug);
  }
  return map;
}

const hubSlugs = loadHubSlugIndex();
for (const p of [...pools.expands, ...pools.hub_only]) {
  if (p.locationSlug || p.venueSlug) continue;
  const byHub = p.hubName ? hubSlugs.get(norm(p.hubName)) : null;
  const byName = hubSlugs.get(norm(p.name));
  const slug = byName || byHub;
  if (slug) {
    if (slug.includes('muzey') || slug.includes('teatr') || slug.includes('garazh') || slug.includes('bunker')) {
      p.venueSlug = slug;
    } else {
      p.locationSlug = slug;
    }
  }
}

/** Enrich JSON: inserts + expands that have locationSlug/venueSlug-like id */
function slugOf(p) {
  return p.locationSlug || p.venueSlug || null;
}


const editorial = [];
for (const p of all) {
  if (p.descStatus !== 'ready') continue;
  const slug = slugOf(p);
  if (!slug) continue;
  const short =
    String(p.desc || '')
      .split(/\n\n/)[0]
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160) || p.name;
  editorial.push({
    slug,
    cityKey: 'moscow',
    title: p.name,
    shortDescription: short.length > 140 ? `${short.slice(0, 137)}...` : short,
    description: p.desc,
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    address: p.address || null,
    role: p.role,
    mustSeeFilter: p.mustSeeFilter || p.filter || null,
    type: p.type || null,
  });
}

const report = {
  textsParsed: texts.length,
  matched: matched.length,
  unmatchedTexts,
  seedWithoutDesc: withoutDesc.map((p) => ({ role: p.role, name: p.name })),
  editorialCount: editorial.length,
  expandReady: pools.expands.filter((p) => p.descStatus === 'ready').length,
  insertReady: pools.inserts.filter((p) => p.descStatus === 'ready').length,
  hubOnlyReady: pools.hub_only.filter((p) => p.descStatus === 'ready').length,
};

console.log(JSON.stringify(report, null, 2));

if (write) {
  seed.generatedAt = new Date().toISOString();
  seed.descReadyCount = matched.length;
  fs.writeFileSync(seedPath, `${JSON.stringify(seed, null, 2)}\n`, 'utf8');
  const edPath = path.join(root, 'scripts/data/must-see-editorial-moscow.json');
  fs.writeFileSync(edPath, `${JSON.stringify(editorial, null, 2)}\n`, 'utf8');
  const repPath = path.join(drafts, 'moscow-mustsee-desc-assemble-report.json');
  fs.writeFileSync(repPath, `${JSON.stringify({ ...report, matchedSample: matched.slice(0, 5) }, null, 2)}\n`, 'utf8');
  console.log(`wrote ${seedPath}`);
  console.log(`wrote ${edPath} (${editorial.length})`);
  console.log(`wrote ${repPath}`);
} else {
  console.log('(dry) pass --write to update seed + editorial json');
}
