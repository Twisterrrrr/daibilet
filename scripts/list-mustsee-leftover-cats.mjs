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
    .replace(/[«»"'„']/g, '')
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
  const n = norm(p.name || '');
  if (!n) return false;
  for (const u of usedN) if (u === n || u.includes(n) || n.includes(u)) return false;
  return true;
});
const cat = (p) => p.category || p.filter || p.mustSeeFilter || 'main';
const byCat = {};
const byRole = {};
for (const p of leftover) {
  byCat[cat(p)] = (byCat[cat(p)] || 0) + 1;
  byRole[p.role] = (byRole[p.role] || 0) + 1;
}
const list = (c, n = 10) =>
  leftover
    .filter((p) => cat(p) === c)
    .slice(0, n)
    .map((p) => `${p.role}:${p.name}`);
console.log(JSON.stringify({ leftover: leftover.length, byRole, byCat }, null, 2));
for (const c of ['museum', 'park', 'temple', 'gastro', 'theater', 'views', 'art', 'monument', 'main']) {
  console.log(c + ':', list(c).join(' | '));
}
console.log('EXPAND:', leftover.filter((p) => p.role === 'expand').map((p) => p.name).join(' | '));
