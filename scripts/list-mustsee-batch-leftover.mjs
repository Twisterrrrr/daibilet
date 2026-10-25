#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const drafts = 'docs/drafts';
const usedFiles = [
  'moscow-mustsee-etalon-10.md',
  ...fs
    .readdirSync(drafts)
    .filter((f) => /^moscow-mustsee-batch-\d+\.md$/.test(f))
    .sort(),
].map((f) => path.join(drafts, f));

const names = (s) => [...s.matchAll(/^## \d+\.\s+(.+)$/gm)].map((m) => m[1].trim());
const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[«»"'„]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const usedN = new Set();
for (const f of usedFiles) {
  if (!fs.existsSync(f)) continue;
  for (const n of names(fs.readFileSync(f, 'utf8'))) usedN.add(norm(n));
}

const seed = JSON.parse(fs.readFileSync('docs/drafts/moscow-must-see-seed-draft.json', 'utf8'));
const all = [...(seed.expands || []), ...(seed.inserts || []), ...(seed.hub_only || [])];

const leftover = all.filter((p) => {
  const n = norm(p.name || p.title || '');
  if (!n) return false;
  for (const u of usedN) {
    if (u === n || u.includes(n) || n.includes(u)) return false;
  }
  return true;
});

const cat = (p) => p.category || p.filter || p.mustSeeFilter || null;
const pool = leftover.map((p) => ({
  name: p.name,
  role: p.role,
  category: cat(p),
  address: p.address || null,
  hubName: p.hubName || null,
  locationSlug: p.locationSlug || null,
  lat: p.lat ?? null,
  lon: p.lon ?? null,
  dumpOffsetM: p.dumpOffsetM ?? p.dumpOffset ?? null,
  nearby: p.nearby || (p.hubName ? `карточка хаба: ${p.hubName}` : null),
}));

const byRole = {};
for (const p of pool) byRole[p.role] = (byRole[p.role] || 0) + 1;
console.log(
  JSON.stringify(
    {
      usedFiles: usedFiles.map((f) => path.basename(f)),
      usedNames: usedN.size,
      leftover: pool.length,
      byRole,
      sample: pool.slice(0, 40),
    },
    null,
    2,
  ),
);
