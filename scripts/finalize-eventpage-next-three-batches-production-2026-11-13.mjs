import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dir = path.join(root, 'data/ticketscloud/editorial');
const resultPath = path.join(dir, 'eventpage-next-three-batches-production-result-2026-11-13.json');
const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
const pageStates = new Map(result.pages.map((page) => [page.slug, page]));
const excludedSlugs = new Set(result.excludedDrafts.map((page) => page.slug));

function parseCsvLine(line) {
  const cells = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && quoted && line[index + 1] === '"') { cell += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { cells.push(cell); cell = ''; }
    else cell += char;
  }
  cells.push(cell);
  return cells;
}

function quoteCsv(value) {
  const text = String(value ?? '');
  return /[\r\n",]/u.test(text) ? `"${text.replace(/"/gu, '""')}"` : text;
}

function updateJson(filePath, mutate) {
  const value = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  mutate(value);
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const manifestPath = path.join(dir, 'eventpage-next-three-batches-manifest-2026-11-13.csv');
const manifestLines = fs.readFileSync(manifestPath, 'utf8').trimEnd().split(/\r?\n/u);
const headers = parseCsvLine(manifestLines[0]);
const statusIndex = headers.indexOf('status');
const urlIndex = headers.indexOf('urls');
if (statusIndex < 0 || urlIndex < 0) throw new Error('Manifest is missing status or urls columns');
const manifestOut = [manifestLines[0]];
for (const line of manifestLines.slice(1)) {
  const cells = parseCsvLine(line);
  const slugs = (cells[urlIndex] || '').split(';').map((url) => {
    try { return new URL(url).pathname.split('/').filter(Boolean).at(-1) || ''; }
    catch { return ''; }
  }).filter(Boolean);
  const states = slugs.map((slug) => pageStates.get(slug) || (excludedSlugs.has(slug) ? { isIndexable: false, excluded: true } : null));
  if (states.some((state) => !state)) throw new Error(`Unmatched URL in manifest: ${cells[urlIndex]}`);
  if (!states.length) throw new Error(`Manifest row has no URL: ${cells[headers.indexOf('title')]}`);
  const indexable = states.filter((page) => page.isIndexable).length;
  const excluded = states.filter((page) => page.excluded).length;
  const baseStatus = excluded === states.length
    ? 'EXCLUDED_NO_FUTURE_SLOT'
    : indexable === states.length - excluded
      ? 'APPLIED_PRODUCTION_INDEXABLE'
      : indexable === 0
        ? 'APPLIED_PRODUCTION_NOINDEX'
        : 'APPLIED_PRODUCTION_MIXED_INDEXABILITY';
  cells[statusIndex] = excluded && excluded < states.length ? `${baseStatus}_WITH_EXCLUSION` : baseStatus;
  manifestOut.push(cells.map(quoteCsv).join(','));
}
fs.writeFileSync(manifestPath, `${manifestOut.join('\n')}\n`, 'utf8');

updateJson(path.join(dir, 'eventpage-next-three-batches-page-specific-content-2026-11-13.json'), (data) => {
  data.productionApplied = true;
  data.indexingEnabled = true;
  data.productionResultPath = 'eventpage-next-three-batches-production-result-2026-11-13.json';
  data.productionCounts = result.counts;
  for (const page of data.pages || []) {
    const state = pageStates.get(page.slug);
    if (!state) {
      page.productionStatus = 'DRAFT_EXCLUDED_NO_FUTURE_SLOT';
      page.productionIndexable = false;
      continue;
    }
    page.productionStatus = state.status;
    page.productionIndexable = state.isIndexable;
    page.productionPublishedAt = state.publishedAt;
  }
});

for (let batchNo = 1; batchNo <= 3; batchNo += 1) {
  const file = path.join(dir, `eventpage-next-rewrite-batch-0${batchNo}-copy-2026-11-13.json`);
  updateJson(file, (batch) => {
    const pageIds = batch.items
      ? batch.items.flatMap((item) => (item.sourcePages || []).map((page) => page.eventPageId))
      : (batch.records || []).flatMap((record) => record.pageIds || [record.pageId].filter(Boolean));
    const uniquePages = [...new Set(pageIds)];
    const slugSet = new Set(result.pages.filter((page) => uniquePages.includes(page.id)).map((page) => page.slug));
    const states = [...slugSet].map((slug) => pageStates.get(slug));
    batch.productionApplied = true;
    batch.indexingEnabled = states.some((page) => page?.isIndexable);
    batch.productionIndexablePageCount = states.filter((page) => page?.isIndexable).length;
    batch.productionNoindexPageCount = states.filter((page) => page && !page.isIndexable).length;
    batch.productionPageCount = states.length;
    batch.productionResultPath = 'eventpage-next-three-batches-production-result-2026-11-13.json';
  });
}

const finalReviewPath = path.join(dir, 'eventpage-next-three-batches-final-review-2026-11-13.md');
const totalLinks = result.pages.reduce((sum, page) => sum + page.eventIds.length, 0);
const repeatedRevisionPages = result.pages.filter((page) => page.revisionAdded > 2);
const report = `# Итог: три батча редакционных рерайтов EventPage\n\n`+
  `Применено **90 мастер-текстов** к **296 существующим EventPage**. Тексты записаны через штатный backend-сервис, опубликованы и проверены чтением production.\n\n`+
  `- **94 страницы** открыты индексации (` + '`READY`, `publishedAt`, `isIndexable=true`' + `).\n`+
  `- **202 повторяющиеся страницы** опубликованы с ` + '`noindex, follow`' + `; для каждой повторяющейся программы оставлена индексируемая представительская страница.\n`+
  `- **2 страницы** без будущих продаваемых показов оставлены черновиками.\n`+
  `- Общее число индексируемых EventPage в production выросло с **815 до 909**.\n`+
  `- Сохранены **${totalLinks} связей EventPage ↔ Event ID**; slug, URL, canonical, связи и маршруты не менялись.\n`+
  `- Исходные тексты сохранены в архивных файлах батчей; активный редакционный текст отмечен в content как ` + '`ACTIVE_EDITORIAL_REWRITE`' + `.\n`+
  `- Выполнена ревалидация 296 страниц и двух sitemap-маршрутов; IndexNow поставил в очередь **94 индексируемых URL**. Это подтверждает отправку, но не гарантирует сроки обхода или включение в индекс поисковиком.\n`+
  `- Проверка production: индексируемая страница отвечает 200 с ` + '`index, follow`' + ` и self-canonical; повторяющаяся — 200 с ` + '`noindex, follow`' + `. В events sitemap представительская страница есть, дубль отсутствует.\n\n`+
  `## История редакций\n\n`+
  `У **${repeatedRevisionPages.length} страниц** в истории появилось по четыре записи вместо обычных двух: пакетная запись была перезапущена в ходе применения. Текущие тексты этих страниц сверены с финальным payload; лишние исторические версии не меняют публичный контент. Остальные **${result.pages.length - repeatedRevisionPages.length} страницы** получили по две записи.\n\n`+
  `Подробный результат и точные ID/URL: [production-result](eventpage-next-three-batches-production-result-2026-11-13.json); исходное состояние перед записью: [production-before-apply](eventpage-next-three-batches-production-before-apply-2026-11-13.json).\n`;
fs.writeFileSync(finalReviewPath, report, 'utf8');

process.stdout.write(JSON.stringify({ manifestRows: manifestOut.length - 1, pages: result.pages.length, indexable: result.counts.indexable, noindex: result.counts.publishedNoindex, links: totalLinks, extraRevisionHistoryPages: repeatedRevisionPages.length }));
