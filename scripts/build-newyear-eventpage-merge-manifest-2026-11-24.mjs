import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dir = path.join(root, 'data/ticketscloud/editorial');
const exact = JSON.parse(fs.readFileSync(path.join(dir, 'newyear-eventpage-duplicate-groups-audit-2026-11-24.json'), 'utf8'));
const extra = JSON.parse(fs.readFileSync(path.join(dir, 'newyear-eventpage-extra-groups-live-2026-11-24.json'), 'utf8'));
const selection = JSON.parse(fs.readFileSync(path.join(dir, 'newyear-eventpage-selection-150-2026-11-24.json'), 'utf8'));

const groups = [];
for (const group of exact.groups) {
  if (group.recommendedMaster.eventPageId === '659a2702-568f-40bd-8698-168c53189b70') continue;
  const pages = group.candidatePages.map((page) => ({ id: page.eventPageId, slug: page.slug, eventIds: [page.eventId] }));
  const targetPageId = group.recommendedMaster.eventPageId;
  const master = pages.find((page) => page.id === targetPageId);
  if (!master) throw new Error(`Exact group has no recommended master: ${group.title}/${group.city}`);
  groups.push({
    key: `newyear26-g${String(groups.length + 1).padStart(2, '0')}`,
    title: group.title,
    city: group.city,
    evidence: group.evidence,
    targetPageId,
    sourcePageIds: pages.filter((page) => page.id !== targetPageId).map((page) => page.id),
    pages,
    venuePolicy: { type: 'same-title', expectedTitle: group.venue },
  });
}

const nutcrackerIds = [
  '25e93a58-da3e-4d3b-8a22-1bd63ca01b0e',
  'd9e6e7f4-a60d-4a4e-8e5e-d0b9b8285b41',
  'bff5df23-9a9c-4982-a476-5273317448c2',
  '22829e53-4dfc-4f55-aefe-15c56d605af3',
  '659a2702-568f-40bd-8698-168c53189b70',
];
const nutcracker = nutcrackerIds.map((id) => extra.pages.find((page) => page.id === id));
if (nutcracker.some((page) => !page)) throw new Error('Nutcracker five-page group is incomplete');
groups.push({
  key: 'newyear26-spb-nutcracker-palace-tour',
  title: 'Балет «Щелкунчик» с экскурсией по Дворцу',
  city: 'Санкт-Петербург',
  evidence: 'same company, venue, address and program; only show time differs',
  targetPageId: '659a2702-568f-40bd-8698-168c53189b70',
  sourcePageIds: nutcrackerIds.filter((id) => id !== '659a2702-568f-40bd-8698-168c53189b70'),
  pages: nutcracker.map((page) => ({ id: page.id, slug: page.slug, eventIds: page.events.map((event) => event.id) })),
  venuePolicy: { type: 'same-title', expectedTitle: 'Дом ученых им. Горького' },
});

const corporate = [
  '5634ab3a-f781-4494-9a1d-d4f0f444a053',
  'e7bf3cdd-8cc9-4757-ac2a-5e2f2b3a2ffc',
  '48f65585-89dc-4ab7-885e-95bbef985cda',
].map((id) => extra.pages.find((page) => page.id === id));
if (corporate.some((page) => !page)) throw new Error('Cosmos corporate group is incomplete');
groups.push({
  key: 'newyear26-moscow-cosmos-corporate',
  title: 'Сборный корпоратив в гостинице «Космос»',
  city: 'Москва',
  evidence: 'same organizer, venue name, program and five-hour format; dates and prices remain attached to their offers',
  targetPageId: corporate[0].id,
  sourcePageIds: corporate.slice(1).map((page) => page.id),
  pages: corporate.map((page) => ({ id: page.id, slug: page.slug, eventIds: page.events.map((event) => event.id) })),
  venuePolicy: { type: 'same-title', expectedTitle: 'Банкетный зал гостиницы «Космос»' },
});

const mix = [
  '9afb6f2c-4aab-4eb8-8c17-b8f593329f19',
  '72dd3036-d8cc-471e-aadf-f1fb371a2d91',
].map((id) => extra.pages.find((page) => page.id === id));
if (mix.some((page) => !page)) throw new Error('MIX boat group is incomplete');
groups.push({
  key: 'newyear26-moscow-mix-imperatrica',
  title: 'Дискотека MIX 80–90-х на теплоходе «Императрица»',
  city: 'Москва',
  evidence: 'same provider source program, boat, south pier, route, postal code and normalized original description across Ticketscloud and Teplohod',
  targetPageId: mix[0].id,
  sourcePageIds: [mix[1].id],
  pages: mix.map((page) => ({ id: page.id, slug: page.slug, eventIds: page.events.map((event) => event.id) })),
  venuePolicy: {
    type: 'explicit-aliases',
    identity: 'Теплоход «Императрица», южный причал «Лужники»',
    allowedNames: [
      'Теплоход «ИМПЕРАТРИЦА» причал Южный «Лужники»',
      'Лужники - Южный',
    ],
    requiredPostalCode: '119270',
  },
});

const selectedPages = selection.batches.flatMap((batch) => batch);
const pageToMaster = new Map();
for (const group of groups) {
  for (const page of group.pages) pageToMaster.set(page.id, group.targetPageId);
}
const selectedSourcePages = selectedPages
  .filter((item) => pageToMaster.has(item.eventPageId) && pageToMaster.get(item.eventPageId) !== item.eventPageId)
  .map((item) => ({ eventPageId: item.eventPageId, masterPageId: pageToMaster.get(item.eventPageId), batch: item.batch, sequence: item.sequence }));
const duplicateRewriteRows = new Map();
for (const item of selectedPages) {
  const masterId = pageToMaster.get(item.eventPageId) || item.eventPageId;
  const prior = duplicateRewriteRows.get(masterId);
  if (prior) {
    const master = selectedPages.find((candidate) => candidate.eventPageId === masterId);
    if (!master) throw new Error(`Duplicate rewrite group has no selected master rewrite: ${masterId}`);
    if (item.eventPageId === masterId) duplicateRewriteRows.set(masterId, item);
  } else duplicateRewriteRows.set(masterId, item);
}

if (groups.length !== 29 || new Set(groups.flatMap((group) => [group.targetPageId, ...group.sourcePageIds])).size !== 90) {
  throw new Error(`Unexpected grouping totals: groups=${groups.length}, pages=${new Set(groups.flatMap((group) => [group.targetPageId, ...group.sourcePageIds])).size}`);
}
if (selectedPages.length !== 150 || new Set(selectedPages.map((page) => page.eventPageId)).size !== 150) {
  throw new Error('Expected 150 distinct selected rewrite pages');
}
if (duplicateRewriteRows.size !== 148) throw new Error(`Expected 148 master rewrites, got ${duplicateRewriteRows.size}`);

const manifest = {
  generatedAt: new Date().toISOString(),
  sourceFiles: [
    'newyear-eventpage-duplicate-groups-audit-2026-11-24.json',
    'newyear-eventpage-extra-groups-live-2026-11-24.json',
    'newyear-eventpage-selection-150-2026-11-24.json',
  ],
  counts: { groups: groups.length, pagesBefore: 90, pagesAfter: 29, selectedRewrites: 150, activeMasterRewrites: 148 },
  groups,
  selectedSourcePages,
  skippedDuplicateRewriteRows: selectedPages.filter((item) => duplicateRewriteRows.get(pageToMaster.get(item.eventPageId) || item.eventPageId)?.eventPageId !== item.eventPageId)
    .map((item) => ({ eventPageId: item.eventPageId, masterPageId: pageToMaster.get(item.eventPageId), batch: item.batch, sequence: item.sequence })),
  excludedUnconfirmedMerge: {
    eventPageIds: ['aeda250a-b235-4ef4-847a-27ebb58a9a3d'],
    reason: 'The Moscow “Мадам Бум” page is not in the 29 fully confirmed same-city merge groups; keep separate until its exact event links and program are reviewed.',
  },
};

fs.writeFileSync(path.join(dir, 'newyear-eventpage-merge-manifest-2026-11-24.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(manifest.counts));
