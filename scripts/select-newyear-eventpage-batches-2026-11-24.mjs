import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dir = path.join(root, 'data/ticketscloud/editorial');
const inputPath = path.join(dir, 'newyear-candidates-production-2026-11-24.json');
const outputPath = path.join(dir, 'newyear-eventpage-selection-150-2026-11-24.json');
const csvPath = path.join(dir, 'newyear-eventpage-selection-150-audit-2026-11-24.csv');
const source = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const now = Date.parse('2026-11-24T09:32:00Z');
const seasonEnd = Date.parse('2027-01-20T23:59:59Z');
const highSeasonEnd = Date.parse('2027-01-10T23:59:59Z');
const titleNewYear = /новогод|нового года|рождеств|санта-клаус|дед мороз|снегуроч|new year|christmas|nutcracker|щелкунчик|(?:^|[^а-яёё])(?:ё|е|ë)(?:лк|лоч)[а-яёë]*/iu;
const titleWinter = /зимн|снежн|ледовое шоу|снежная королева/iu;
const introHoliday = /новогод|предновогод|нового года|новый год|дед мороз|снегуроч|new year|christmas|nutcracker|(?:^|[^а-яёё])(?:ё|е|ë)(?:лк|лоч)[а-яёë]*/iu;
const prohibited = /гарри поттер|harry potter|хогвартс|hogwarts|похмельный концерт нового года с рви меха|(^|[\s_-])(test|тест)(?=$|[\s_-])/iu;
const holdForManualReview = new Set([
  'd23c8b7a-0638-4217-9d7a-8346cdd039e1', // same Bатайск performance/time as the typo variant below
  '958a81ce-ee98-4cb7-b19a-cb0a05447fd9',
  '25e93a58-da3e-4d3b-8a22-1bd63ca01b0e', // same local Nutcracker program with alternate session time
  '22829e53-4dfc-4f55-aefe-15c56d605af3',
  'ff4e420b-df0d-4471-8838-2bd9c8bac9a5', // same play/venue/date as another listing with an alternate start time
  'ec34f97c-7b13-4e29-b970-d0a6cc3f1bba', // the source body switches to an unrelated Anna/Elsa show
  '5fee7894-f886-4c2c-b32c-2f5736da8b59', // duplicate page for the same mixed/incorrect source description
  'd171a47a-77be-492c-8a23-29d518302d2a', // original description is empty; override is generic boilerplate
  '7e1358b4-e57b-484b-af1d-01b5f136700c', // source names Space and an outdated 2025 party, while current page is SK BAR/2026
  'a3a383ea-87a8-4b02-805b-7e346e374e19', // only “concert” plus generic override; no performer/program facts to rewrite safely
]);
const forceIncludeForTourCoverage = new Set(['f6523fff-b317-4b62-be3f-241cf55b6813']); // Murakami St Petersburg tour stop
const htmlText = (value) => String(value || '').replace(/<br\s*\/?\s*>/giu, '\n').replace(/<[^>]+>/gu, ' ')
  .replace(/&nbsp;|&#160;/giu, ' ').replace(/&amp;/giu, '&').replace(/\s+/gu, ' ').trim();
const keyText = (value) => String(value || '').toLocaleLowerCase('ru').replace(/[«»"'!.,:;()[\]—–-]/gu, ' ')
  .replace(/\s+/gu, ' ').trim();

const byPage = new Map();
for (const candidate of source.candidates) {
  if (!byPage.has(candidate.eventPageId)) byPage.set(candidate.eventPageId, candidate);
}

const groups = new Map();
for (const candidate of byPage.values()) {
  if (holdForManualReview.has(candidate.eventPageId)) continue;
  const title = `${candidate.pageTitle || ''} ${candidate.eventTitle || ''}`;
  const text = htmlText(candidate.description);
  const slot = Date.parse(candidate.nextSlot);
  const category = `${candidate.category || ''} ${title}`;
  if (candidate.pageStatus !== 'DRAFT' || candidate.isIndexable !== false || candidate.publishedAt) continue;
  if (candidate.rewriteStatus) continue;
  if (!candidate.eventId || !candidate.eventPageId || !candidate.slug || !candidate.nextSlot || slot < now || slot > seasonEnd) continue;
  if (candidate.sourceChars < 300 || candidate.sourceChars > 2000 || !text || prohibited.test(title) || /гарри поттер|harry potter/iu.test(text.slice(0, 300))) continue;
  if (Number(candidate.ageLimit) >= 18 && /дет|семейн|ёлк|елк|дед мороз|снегуроч|новогодн/iu.test(category)) continue;
  const titleMatch = titleNewYear.test(title);
  const introMatch = introHoliday.test(text.slice(0, 600));
  const winterTitleMatch = titleWinter.test(title);
  if (!titleMatch && !introMatch && !winterTitleMatch) continue;
  const score = (forceIncludeForTourCoverage.has(candidate.eventPageId) ? 100 : 0)
    + (titleMatch ? 6 : 0) + (introMatch ? 3 : 0) + (winterTitleMatch ? 1 : 0)
    + (slot <= highSeasonEnd ? 2 : 0) + (candidate.sourceChars >= 1000 ? 1 : 0);
  const identity = `${keyText(candidate.pageTitle)}|${keyText(candidate.city)}`;
  const current = groups.get(identity);
  const row = { ...candidate, text, score, selectionReason: forceIncludeForTourCoverage.has(candidate.eventPageId) ? 'tour coverage: Murakami St Petersburg'
    : titleMatch ? 'new-year term in title'
    : introMatch ? 'new-year term in opening description' : 'winter title with seasonal active session' };
  if (!current || score > current.score || score === current.score && candidate.sourceChars > current.sourceChars) groups.set(identity, row);
}

const ranked = [...groups.values()].sort((a, b) => b.score - a.score || Date.parse(a.nextSlot) - Date.parse(b.nextSlot)
  || a.city.localeCompare(b.city, 'ru') || a.slug.localeCompare(b.slug));
const selected = [];
const remaining = new Set(ranked);
const cityCounts = new Map();
while (selected.length < 150 && remaining.size) {
  const options = [...remaining].filter((row) => (cityCounts.get(row.city) || 0) < 35);
  const pool = options.length ? options : [...remaining];
  pool.sort((a, b) => (b.score - (cityCounts.get(b.city) || 0) * 0.18) - (a.score - (cityCounts.get(a.city) || 0) * 0.18)
    || Date.parse(a.nextSlot) - Date.parse(b.nextSlot) || a.slug.localeCompare(b.slug));
  const chosen = pool[0];
  selected.push(chosen);
  remaining.delete(chosen);
  cityCounts.set(chosen.city, (cityCounts.get(chosen.city) || 0) + 1);
}
if (selected.length !== 150 || new Set(selected.map((row) => row.eventPageId)).size !== 150) {
  throw new Error(`Need 150 exact unique EventPages, eligible groups=${groups.size}`);
}

const batches = Array.from({ length: 5 }, (_, batchIndex) => selected.slice(batchIndex * 30, (batchIndex + 1) * 30)
  .map((row, index) => ({ batch: batchIndex + 1, sequence: index + 1, ...row })));
const output = { generatedAt: new Date().toISOString(), sourcePath: path.basename(inputPath),
  sourceSnapshotAt: source.generatedAt, selectionRule: 'one exact EventPage per distinct source text/program/city/venue; active future slot; source text 300–2000 chars so rewrites can retain or exceed original length without padding; excludes tests, Harry Potter, adult family listings, and reviewed source conflicts',
  totalCandidatesAfterDedupe: groups.size, count: 150,
  heldForManualReviewPageIds: [...holdForManualReview],
  forcedTourCoveragePageIds: [...forceIncludeForTourCoverage],
  excluded: { noSourceUnder300: true, inactiveOrExpired: true, tests: true, harryPotter: true, adultInChildrensListing: true },
  batches, cityCounts: Object.fromEntries([...cityCounts.entries()].sort((a, b) => b[1] - a[1])) };
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
const csv = ['Batch;№;EventPage ID;EventPage URL;Event ID;Название;Город;Площадка;Слот UTC;Возраст;Цена от;Оригинал знаков;Причина отбора',
  ...batches.flatMap((batch) => batch.map((row) => [row.batch, row.sequence, row.eventPageId, `/events/${row.slug}`, row.eventId,
    row.pageTitle, row.city, row.venue, row.nextSlot, row.ageLimit || '', row.priceFrom ?? '', row.sourceChars, row.selectionReason]
    .map((value) => `"${String(value ?? '').replace(/"/gu, '""')}"`).join(';')))].join('\n');
fs.writeFileSync(csvPath, `${csv}\n`);
process.stdout.write(JSON.stringify({ selected: selected.length, candidatePool: groups.size,
  batches: batches.map((batch) => ({ batch: batch[0].batch, count: batch.length, cities: [...new Set(batch.map((row) => row.city))].length })),
  cityCounts: output.cityCounts, files: [path.basename(outputPath), path.basename(csvPath)] }, null, 2));
