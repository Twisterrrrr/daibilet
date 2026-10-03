#!/usr/bin/env node
/**
 * Pick next moscow must-see description batch from seed leftover.
 * Usage: node scripts/pick-mustsee-batch.mjs [batchNo] [size]
 */
import fs from 'node:fs';
import path from 'node:path';

const batchNo = Number(process.argv[2] || 3);
const size = Number(process.argv[3] || 20);
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
const row = (p) => ({
  name: p.name,
  role: p.role,
  category: cat(p),
  address: p.address || null,
  hubName: p.hubName || null,
  locationSlug: p.locationSlug || null,
  lat: p.lat ?? null,
  lon: p.lon ?? null,
  dumpOffsetM: p.dumpOffsetM ?? null,
  nearby: p.nearby || (p.hubName ? `карточка хаба: ${p.hubName}` : null),
});

/** Curated mix for batch 03+; name hints optional. */
const wantByBatch = {
  3: [
    ['expand', null, 'Высотка на Котельнической'],
    ['expand', null, 'Гараж'],
    ['expand', null, 'ВДНХ'],
    ['expand', null, 'Музей русского импрессионизма'],
    ['expand', null, 'Елохов'],
    ['hub_only', null, 'Музеон'],
    ['insert', null, 'Twins Garden'],
    ['insert', null, 'Измайловский парк'],
    ['insert', 'temple', null],
    ['insert', 'temple', null],
    ['insert', 'museum', null],
    ['insert', 'museum', null],
    ['insert', 'park', null],
    ['insert', 'theater', null],
    ['insert', 'monument', null],
    ['insert', 'monument', null],
    ['insert', 'views', null],
    ['insert', 'gastro', null],
    ['insert', 'museum', null],
    ['expand', null, 'Воробь'],
  ],
  4: [
    ['expand', null, 'Еврейский'],
    ['expand', null, 'Политехнический'],
    ['expand', null, 'Бункер'],
    ['expand', null, 'Пушкинский'],
    ['hub_only', null, 'Крымск'],
    ['insert', 'museum', null],
    ['insert', 'museum', null],
    ['insert', 'temple', null],
    ['insert', 'temple', null],
    ['insert', 'park', null],
    ['insert', 'theater', null],
    ['insert', 'monument', null],
    ['insert', 'monument', null],
    ['insert', 'gastro', null],
    ['insert', 'views', null],
    ['insert', 'art', null],
    ['insert', 'museum', null],
    ['insert', 'park', null],
    ['insert', 'gastro', null],
    ['expand', null, null],
  ],
  5: [
    ['expand', null, 'Зарядье'],
    ['expand', null, 'Коломенск'],
    ['expand', null, 'Казанский'],
    ['expand', null, 'Марфо'],
    ['hub_only', null, null],
    ['insert', 'museum', null],
    ['insert', 'museum', null],
    ['insert', 'temple', null],
    ['insert', 'temple', null],
    ['insert', 'park', null],
    ['insert', 'theater', null],
    ['insert', 'monument', null],
    ['insert', 'monument', null],
    ['insert', 'gastro', null],
    ['insert', 'views', null],
    ['insert', 'art', null],
    ['insert', 'museum', null],
    ['insert', 'park', null],
    ['insert', 'gastro', null],
    ['expand', null, 'PANORAMA'],
  ],
  6: [
    ['expand', null, 'Царицыно'],
    ['expand', null, 'Коломенское'],
    ['expand', null, 'Патриарш'],
    ['expand', null, 'Большой'],
    ['expand', null, 'Булгаков'],
    ['hub_only', null, 'Никольск'],
    ['hub_only', null, 'Кузнецк'],
    ['insert', 'museum', 'Толстого'],
    ['insert', 'museum', 'Манеж'],
    ['insert', 'museum', 'Музей AZ'],
    ['insert', 'temple', 'Климента'],
    ['insert', 'temple', 'Илии'],
    ['insert', 'temple', 'Англикан'],
    ['insert', 'gastro', 'Живаго'],
    ['insert', 'gastro', 'Уголёк'],
    ['insert', 'theater', 'Crave'],
    ['insert', 'views', 'Ивана Великого'],
    ['insert', 'views', 'Воронцово'],
    ['insert', 'monument', 'Плисецкой'],
    ['expand', null, 'Данилов'],
  ],
  7: [
    ['expand', null, 'Вахтангова'],
    ['hub_only', null, 'Пятницк'],
    ['hub_only', null, 'Камергер'],
    ['hub_only', null, 'Набережн'],
    ['insert', 'museum', 'Глазунов'],
    ['insert', 'temple', 'Кулишках'],
    ['insert', 'temple', 'Никитниках'],
    ['insert', 'temple', 'Вознесение'],
    ['insert', 'temple', 'Хохлах'],
    ['insert', 'temple', 'Непорочного'],
    ['insert', 'temple', 'Иоанна Воина'],
    ['insert', 'gastro', 'Профсоюз'],
    ['insert', 'views', 'Сиреневый'],
    ['insert', null, 'Кремль'],
    ['insert', null, 'Пашков'],
    ['insert', null, 'Мавзолей'],
    ['insert', 'monument', 'Бродскому'],
    ['insert', 'monument', 'Александру II'],
    ['insert', 'monument', 'Чайковскому'],
    ['insert', 'monument', 'Грибоедову'],
  ],
};

const want =
  wantByBatch[batchNo] ||
  Array.from({ length: size }, (_, i) => {
    const roles = ['expand', 'expand', 'hub_only', 'insert'];
    return [roles[i % roles.length], null, null];
  });

const picked = [];
const usedPick = new Set();
const find = (role, category, nameHint) => {
  const pool = leftover
    .filter((p) => p.role === role)
    .filter((p) => !category || cat(p) === category)
    .filter((p) => !nameHint || norm(p.name).includes(norm(nameHint)))
    .filter((p) => !usedPick.has(norm(p.name)))
    .map(row);
  return pool[0] || null;
};

for (const [role, category, hint] of want) {
  if (picked.length >= size) break;
  let p = find(role, category, hint);
  if (!p && hint) p = find(role, null, hint);
  if (!p) p = find(role, category, null);
  if (!p) continue;
  usedPick.add(norm(p.name));
  picked.push(p);
}

while (picked.length < size) {
  const p = leftover.map(row).find((x) => !usedPick.has(norm(x.name)));
  if (!p) break;
  usedPick.add(norm(p.name));
  picked.push(p);
}

const opens = [
  'сцена',
  'глагол',
  'факт/цифра',
  'прямое обращение',
  'вопрос',
  'короткое утверждение',
  'цитата/фраза',
  'сравнение',
];
const lens = [2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4];

const items = picked.slice(0, size).map((p, i) => ({
  ...p,
  openType: opens[i % opens.length],
  paragraphs: lens[i],
}));

const out = {
  batch: batchNo,
  size: items.length,
  leftoverAfter: leftover.length - items.length,
  usedFiles: usedFiles.map((f) => path.basename(f)),
  note: 'curated mix roles+categories; openings rotate; length 20/60/20; seed fields in prompt',
  items,
};
const planPath = path.join(drafts, `moscow-mustsee-batch-${String(batchNo).padStart(2, '0')}-plan.json`);
fs.writeFileSync(planPath, JSON.stringify(out, null, 2) + '\n', 'utf8');
for (const it of items) {
  console.log(
    `- [${it.role}/${it.category}] ${it.name} · ${it.openType} · ${it.paragraphs}абз · addr=${it.address || '—'} · hub=${it.hubName || '—'}`,
  );
}
console.log('plan →', planPath);
console.log(
  'byRole',
  items.reduce((a, x) => ((a[x.role] = (a[x.role] || 0) + 1), a), {}),
);
console.log(
  'byCat',
  items.reduce((a, x) => ((a[x.category] = (a[x.category] || 0) + 1), a), {}),
);
console.log('byOpen', items.reduce((a, x) => ((a[x.openType] = (a[x.openType] || 0) + 1), a), {}));
