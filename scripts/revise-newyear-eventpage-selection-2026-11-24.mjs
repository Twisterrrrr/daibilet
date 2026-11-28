import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dir = path.join(root, 'data/ticketscloud/editorial');
const selectionPath = path.join(dir, 'newyear-eventpage-selection-150-2026-11-24.json');
const originalPath = path.join(dir, 'newyear-eventpage-selection-150-original-2026-11-24.json');
const candidatePath = path.join(dir, 'newyear-candidates-production-2026-11-24.json');
const csvPath = path.join(dir, 'newyear-eventpage-selection-150-audit-2026-11-24.csv');
const replacementsPath = path.join(dir, 'newyear-eventpage-selection-replacements-2026-11-24.json');
const replacementArchivePath = path.join(dir, 'newyear-eventpage-replacement-source-archive-2026-11-24.json');

const replacementPlan = [
  { batch: 2, sequence: 24, candidate: '6c3a2a6f-8f7f-4fd0-a29b-a09949bb02a9', reason: 'замена страницы с конфликтом названия спектакля и исходного описания' },
  { batch: 3, sequence: 26, candidate: 'def8641d-a962-474f-bada-cf7dcbc09f6e', reason: 'замена события без будущего активного слота; выбрана рождественская программа с тремя показами' },
  { batch: 4, sequence: 16, candidate: '560dc568-1603-4b68-a129-643eac005390', reason: 'замена карточки с конфликтом названия и описания' },
  { batch: 4, sequence: 20, candidate: '237b7f74-ef57-4596-bc2a-21a38516248c', reason: 'дубликат постановки «Всё дело в шляпе», переносится в B2#13; вместо дубля выбрана проверенная рождественская фолк-программа' },
  { batch: 4, sequence: 30, candidate: 'da352105-6bea-41b6-8dcc-51e77db89967', reason: 'повторный показ того же «Щелкунчика» в том же театре, переносится в B4#29' },
  { batch: 5, sequence: 7, candidate: '7f28ebee-428f-4c66-a47c-d29ec99ab230', reason: 'повтор Après-ski, даты объединяются в B5#1; вместо него выбрана новогодняя ночь в «Квартире с видом»' },
  { batch: 5, sequence: 12, candidate: 'c5732eec-d9c3-499a-9260-984bc4a8fc38', reason: 'повтор корпоративной программы гостиницы «Космос», даты объединяются в B5#3' },
  { batch: 5, sequence: 16, candidate: '0778182d-b1a8-47e2-9aa5-2d02ecbf4ce7', reason: 'повтор корпоративной программы гостиницы «Космос», даты объединяются в B5#3; вместо неё выбрана серия «Новогодняя опера» в Доме Шрёдера' },
  { batch: 5, sequence: 18, candidate: '9afb6f2c-4aab-4eb8-8c17-b8f593329f19', reason: 'повтор Après-ski Moscow Party, даты объединяются в B5#1' },
  { batch: 5, sequence: 20, candidate: 'fd366d02-5200-4418-a4ce-33d36723e7fa', reason: 'повтор программы «Мадам Бум. Зимний шик» в Москве, даты объединяются в B4#27' },
];

function plainText(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/giu, ' ')
    .replace(/<style[\s\S]*?<\/style>/giu, ' ')
    .replace(/<[^>]*>/gu, ' ')
    .replace(/&nbsp;|&#160;/giu, ' ')
    .replace(/&amp;/giu, '&').replace(/&lt;/giu, '<').replace(/&gt;/giu, '>')
    .replace(/&quot;/giu, '"').replace(/&#39;|&apos;/giu, "'")
    .replace(/\s+/gu, ' ').trim();
}

if (!fs.existsSync(originalPath)) fs.copyFileSync(selectionPath, originalPath);
const original = JSON.parse(fs.readFileSync(originalPath, 'utf8'));
const candidateData = JSON.parse(fs.readFileSync(candidatePath, 'utf8'));
const candidates = new Map(candidateData.candidates.map((item) => [item.eventPageId, item]));
const replaced = [];
for (const change of replacementPlan) {
  const batch = original.batches.find((items) => items[0]?.batch === change.batch);
  const index = batch?.findIndex((item) => item.sequence === change.sequence) ?? -1;
  if (!batch || index < 0) throw new Error(`Selection row missing: B${change.batch}#${change.sequence}`);
  const previous = batch[index];
  const candidate = candidates.get(change.candidate);
  if (!candidate) throw new Error(`Replacement candidate missing: ${change.candidate}`);
  if (original.batches.flat().some((item) => item.eventPageId === candidate.eventPageId)) {
    throw new Error(`Replacement already selected: ${candidate.slug}`);
  }
  if (candidate.sourceChars < 300 || candidate.sourceChars > 6000 || !candidate.nextSlot || !candidate.description) {
    throw new Error(`Replacement source/slot failed editorial thresholds: ${candidate.slug}`);
  }
  const row = { ...candidate, batch: change.batch, sequence: change.sequence,
    replacedSelectionEntry: { eventPageId: previous.eventPageId, eventId: previous.eventId,
      slug: previous.slug, pageTitle: previous.pageTitle, reason: change.reason } };
  batch[index] = row;
  replaced.push({ batch: change.batch, sequence: change.sequence, reason: change.reason,
    removed: row.replacedSelectionEntry, replacement: { eventPageId: row.eventPageId, eventId: row.eventId,
      slug: row.slug, pageTitle: row.pageTitle, city: row.city, nextSlot: row.nextSlot, sourceChars: row.sourceChars } });
}

const all = original.batches.flat();
if (all.length !== 150 || new Set(all.map((row) => row.eventPageId)).size !== 150) {
  throw new Error('Revised selection must contain 150 unique EventPages');
}
for (const row of all) {
  if (row.rawSourceChars === undefined) row.rawSourceChars = row.sourceChars;
  row.sourceChars = plainText(row.description).length;
}
original.generatedAt = new Date().toISOString();
original.revision = 2;
original.revisionNote = 'Replaced source conflicts, inactive page, and same-city duplicate pages; originals preserved in original selection and replacement log.';
original.replacements = replaced;
fs.writeFileSync(selectionPath, `${JSON.stringify(original, null, 2)}\n`);
fs.writeFileSync(replacementsPath, `${JSON.stringify(replaced, null, 2)}\n`);
const archiveRows = replacementPlan.map(({ candidate }) => candidates.get(candidate));
fs.writeFileSync(replacementArchivePath, `${JSON.stringify({ archivedAt: new Date().toISOString(),
  sourceSnapshotAt: candidateData.generatedAt, replacements: archiveRows }, null, 2)}\n`);
const csv = ['Batch;№;EventPage ID;EventPage URL;Event ID;Название;Город;Площадка;Слот UTC;Возраст;Цена от;Оригинал знаков;Причина отбора',
  ...original.batches.flatMap((items) => items.map((row) => [row.batch, row.sequence, row.eventPageId,
    `/events/${row.slug}`, row.eventId, row.pageTitle, row.city, row.venue, row.nextSlot,
    row.ageLimit || '', row.priceFrom ?? '', row.sourceChars, row.replacedSelectionEntry ? 'замена после дедупликации/факт-чека' : row.selectionReason]
    .map((value) => `"${String(value ?? '').replace(/"/gu, '""')}"`).join(';')))].join('\n');
fs.writeFileSync(csvPath, `${csv}\n`);
process.stdout.write(JSON.stringify({ count: all.length, uniquePages: new Set(all.map((row) => row.eventPageId)).size,
  replacements: replaced.length, replacementLog: path.basename(replacementsPath), sourceArchive: path.basename(replacementArchivePath) }, null, 2));
