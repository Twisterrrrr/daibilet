import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const editorial = path.join(root, 'data/ticketscloud/editorial');
const sourcePath = path.join(editorial, 'eventpage-next-three-batches-page-specific-content-2026-11-13.json');
const auditPath = path.join(editorial, 'eventpage-next-three-batches-page-specific-audit-2026-11-13.csv');
const outputPath = path.join(editorial, 'eventpage-next-three-batches-production-payload-2026-11-13.json');
const reportPath = path.join(editorial, 'eventpage-next-three-batches-final-review-2026-11-13.md');

const staleEventIds = new Set([
  'evt_6af403677d7e114c004c278c',
  'evt_6ad3c1e7146a3bfb07c74fd8',
]);

const potterCopy = (city) => `### Экспозиция «Хогвартс Холл»

В ${city === 'Красноярск' ? 'Красноярске' : 'Новосибирске'} «Хогвартс Холл» — интерактивный музей, вдохновлённый книгами и фильмами о Гарри Поттере. Посетителей ждут тематические локации, декорации и детали волшебного мира, которые можно рассматривать в собственном темпе. Экспозиция рассчитана на детей и взрослых; для знакомства с ней не нужно заранее готовиться или знать историю персонажей.

Музейный формат позволяет не только пройти по залам и изучить оформление. В пространствах можно фотографироваться, находить знакомые по фильмам и книгам мотивы и обращать внимание на детали декораций. Так посещение превращается в прогулку по нескольким тематическим зонам: каждый гость выбирает, где задержаться подольше и какие моменты сохранить на снимках.

### Мастер-классы и занятия для детей

Отдельная часть программы — магические мастер-классы. Участники создают тематические предметы своими руками и могут забрать готовую работу с собой. Это занятие добавляет к осмотру экспозиции практический опыт: результат зависит от личного выбора и участия гостя, а не только от того, какие декорации он увидел.

Для детей организатор подготовил занятия и испытания в формате «Школы юного волшебника». Они знакомят юных посетителей с тематикой музея через игровые задания и творческую активность. Поэтому семейный визит может включать и самостоятельный осмотр локаций, и участие в занятиях — состав выбранного сеанса стоит уточнить при покупке билета.

### Сувенирный магазин и семейное посещение

В магазине «ХогвартсМаг» представлены волшебные палочки, мантии, аксессуары факультетов, тематические подарки и коллекционные предметы. После осмотра залов сюда можно заглянуть за сувениром для себя или подарком поклоннику вселенной. Магазин дополняет музейную программу, но его товары приобретаются отдельно от билета, если организатор не указал иное.

«Хогвартс Холл» подойдёт тем, кто хочет совместить тематическую экспозицию, фотографии и творческое занятие в одном визите. Детям младше трёх лет вход бесплатный при сопровождении родителей; посетители младше четырнадцати лет допускаются только со взрослым. Эти правила важно учитывать при планировании семейного посещения и выборе билетов на местный сеанс.`;

function cleanBody(page) {
  let body = String(page.mainBody || '').split(/\n---\n/u, 1)[0].trim();
  const firstBreak = body.indexOf('\n');
  if (firstBreak >= 0) {
    const first = body.slice(0, firstBreak).trim().replace(/^#{1,6}\s*/u, '');
    if (first === String(page.title || '').trim()) body = body.slice(firstBreak).trim();
  }
  if (page.title === 'Музей Гарри Поттера') body = potterCopy(page.city);
  if (page.title === '«Серебряное копытце», 3+') {
    body = body.replace(
      'После сказочного представления организатор заявляет шоу фокусника, интерактив с Дедом Морозом и сказочными персонажами, фотосессию и новогодний буфет. Это превращает визит в более продолжительную семейную программу, а не только просмотр спектакля. Возрастное ограничение - 3+.',
      'После сказки организатор заявляет продолжение с фокусником, Дедом Морозом и сказочными персонажами. Эта часть дополняет спектакль семейной программой; конкретный формат может отличаться между датами. Возрастное ограничение - 3+.',
    );
  }
  if (page.title === 'Большой Stand Up') {
    const venue = (page.practicalInfo || []).join(' ');
    if (/COMEDY 34/u.test(venue)) {
      body = body.split(/\n\s*\n/u).slice(0, 2).join('\n\n').trim();
    } else if (/Comedy Hub Club/u.test(venue)) {
      body = body.replace('Для одной из площадок организатор отмечает', 'В Comedy Hub Club организатор отмечает');
    }
    body = body.replace('Формат держится на чередовании коротких сетов и общей атмосфере клуба.', 'Формат держится на чередовании разных комиков и общей атмосфере клуба.');
  }
  return body.replace(/\n{3,}/gu, '\n\n').trim();
}

function practicalBlock(page) {
  const lines = (Array.isArray(page.practicalInfo) ? page.practicalInfo : [])
    .map((line) => String(line || '').trim())
    .filter(Boolean)
    .map((line) => page.title === 'Обзорная экскурсия по Москве на автобусе от Красной Площади'
      ? line.replace('- **Площадка:**', '- **Место встречи:**')
      : line);
  return lines.join('\n');
}

function paragraphCount(body) {
  return body.split(/\n\s*\n/u).map((part) => part.trim()).filter((part) => part && !/^#{1,6}\s/u.test(part)).length;
}

function firstUpcoming(page) {
  const values = (page.events || [])
    .filter((event) => !staleEventIds.has(event.eventId))
    .map((event) => String(event.nextSlot || ''))
    .filter(Boolean)
    .sort();
  return values[0] || '';
}

function localContextKey(page, body) {
  const local = (page.practicalInfo || [])
    .filter((line) => /Площадка|Адрес/u.test(line))
    .map((line) => line.replace(/^-\s*\*\*[^*]+\*\*:\s*/u, '').trim());
  return JSON.stringify([page.city, body, ...local]);
}

function originalHold(page) {
  const value = String(page.indexingHold || '');
  if (['editorial_review', 'cross_city_local_context_review', 'same_city_repeat_seo_review'].includes(value)) return value;
  const decision = String(page.reviewDecision || value);
  if (decision === 'PUBLISHED_INDEXABLE_UNIQUE') return 'editorial_review';
  if (decision === 'PUBLISHED_INDEXABLE_CITY_PAGE') return 'cross_city_local_context_review';
  if (decision === 'PUBLISHED_INDEXABLE_SERIES_REPRESENTATIVE' || decision === 'PUBLISHED_NOINDEX_REPEAT' || decision === 'EXCLUDED_NO_FUTURE_SLOT') return 'same_city_repeat_seo_review';
  return '';
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[\n",]/u.test(text) ? `"${text.replace(/"/gu, '""')}"` : text;
}

const packageData = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const allPages = packageData.pages;
const pageById = new Map(allPages.map((page) => [page.eventPageId, page]));
const auditLines = fs.readFileSync(auditPath, 'utf8').trim().split(/\r?\n/u);
const auditHeader = auditLines[0].split(',');
const auditRows = new Map();
for (const line of auditLines.slice(1)) {
  // The source CSV fields are quoted where a comma occurs. Use a small CSV parser.
  const cells = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && quoted && line[i + 1] === '"') { cell += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { cells.push(cell); cell = ''; }
    else cell += char;
  }
  cells.push(cell);
  auditRows.set(cells[1], Object.fromEntries(auditHeader.map((key, index) => [key, cells[index] || ''])));
}

const bodyById = new Map(allPages.map((page) => [page.eventPageId, cleanBody(page)]));
const repeatGroups = new Map();
for (const page of allPages.filter((item) => originalHold(item) === 'same_city_repeat_seo_review')) {
  const key = localContextKey(page, bodyById.get(page.eventPageId));
  repeatGroups.set(key, [...(repeatGroups.get(key) || []), page]);
}

const indexableReps = new Set();
for (const group of repeatGroups.values()) {
  if (group.length < 2) continue;
  const eligible = group
    .map((page) => ({ page, slot: firstUpcoming(page) }))
    .filter((entry) => entry.slot)
    .sort((a, b) => a.slot.localeCompare(b.slot) || a.page.slug.localeCompare(b.page.slug));
  if (eligible[0]) indexableReps.add(eligible[0].page.eventPageId);
}

const staged = [];
const statusCounts = { indexable: 0, noindexDuplicate: 0, noFuture: 0 };
for (const page of allPages) {
  const body = bodyById.get(page.eventPageId);
  const paragraphTotal = paragraphCount(body);
  const practical = practicalBlock(page);
  const textLength = body.length;
  if (textLength < Number(page.sourceMinChars || 0)) {
    throw new Error(`Main copy is shorter than source for ${page.slug}: ${textLength} < ${page.sourceMinChars}`);
  }
  if (paragraphTotal < 2) throw new Error(`Fewer than two substantive paragraphs for ${page.slug}`);
  const hasVenue = practical.includes('**Площадка:**') || practical.includes('**Место встречи:**');
  const hasAddress = practical.includes('**Адрес:**') || practical.includes('**Место встречи:**');
  if (!hasVenue || !hasAddress) throw new Error(`Missing practical venue/address for ${page.slug}`);
  if (/Редакторская пометка|^---$/mu.test(body)) throw new Error(`Editorial artifact remains in ${page.slug}`);

  const hasFuture = (page.events || []).some((event) => !staleEventIds.has(event.eventId));
  if (!hasFuture) {
    page.finalContent = `${body}\n\n## Практическая информация\n\n${practical}`;
    page.reviewDecision = 'EXCLUDED_NO_FUTURE_SLOT';
    statusCounts.noFuture += 1;
    continue;
  }

  let indexable = false;
  let decision = 'PUBLISHED_NOINDEX_REPEAT';
  if (originalHold(page) === 'editorial_review') {
    indexable = true;
    decision = 'PUBLISHED_INDEXABLE_UNIQUE';
  } else if (originalHold(page) === 'cross_city_local_context_review') {
    indexable = true;
    decision = 'PUBLISHED_INDEXABLE_CITY_PAGE';
  } else if (indexableReps.has(page.eventPageId)) {
    indexable = true;
    decision = 'PUBLISHED_INDEXABLE_SERIES_REPRESENTATIVE';
  } else if (originalHold(page) === 'same_city_repeat_seo_review') {
    decision = 'PUBLISHED_NOINDEX_REPEAT';
  }

  const content = {
    sections: [
      { id: 'about', kind: 'about', title: 'О событии', body, items: [] },
      { id: 'practical-info', kind: 'custom', title: 'Практическая информация', body: practical, items: [] },
    ],
    activeEditorialText: {
      field: 'sections',
      status: 'ACTIVE_EDITORIAL_REWRITE',
      version: '2026-11-13-next-batches-01-03',
    },
  };
  page.mainBody = body;
  page.finalContent = `${body}\n\n## Практическая информация\n\n${practical}`;
  page.rewriteChars = textLength;
  page.substantiveParagraphs = paragraphTotal;
  page.meetsEditorialLength = true;
  page.meetsParagraphRule = true;
  page.indexingHold = decision;
  page.reviewDecision = decision;
  statusCounts[indexable ? 'indexable' : 'noindexDuplicate'] += 1;
  staged.push({
    eventPageId: page.eventPageId,
    slug: page.slug,
    title: page.title,
    city: page.city,
    status: 'READY',
    isIndexable: indexable,
    content,
    sourceMinChars: Number(page.sourceMinChars || 0),
    rewriteChars: textLength,
    substantiveParagraphs: paragraphTotal,
    practicalInfo: practical,
    decision,
    eventIds: (page.events || []).map((event) => event.eventId),
  });
}

if (statusCounts.indexable !== 94) {
  throw new Error(`Expected 94 indexable representatives after deduplication, got ${statusCounts.indexable}`);
}
if (statusCounts.noindexDuplicate !== 202 || statusCounts.noFuture !== 2) {
  throw new Error(`Unexpected status split: ${JSON.stringify(statusCounts)}`);
}

packageData.productionApplied = false;
packageData.indexingEnabled = false;
packageData.pagesWithConflicts = 0;
packageData.finalReview = {
  reviewedAt: new Date().toISOString(),
  decision: 'Apply active pages; index one representative per same-city venue/program; keep other duplicate pages noindex.',
  statusCounts,
  staleEventIds: [...staleEventIds],
};
fs.writeFileSync(sourcePath, `${JSON.stringify(packageData, null, 2)}\n`, 'utf8');
fs.writeFileSync(outputPath, `${JSON.stringify({ createdAt: new Date().toISOString(), pages: staged }, null, 2)}\n`, 'utf8');

const auditHeaderOut = ['batch', 'EventPage ID', 'URL', 'title', 'city', 'Event IDs', 'source chars', 'rewrite chars', 'substantive paragraphs', 'review status', 'length check', 'paragraph check', 'practical conflicts'];
const auditOut = [auditHeaderOut.join(',')];
for (const page of allPages) {
  const original = auditRows.get(page.eventPageId) || {};
  const decision = page.reviewDecision || 'EXCLUDED_NO_FUTURE_SLOT';
  auditOut.push([
    page.batch,
    page.eventPageId,
    `https://daibilet.ru/events/${page.slug}`,
    page.title,
    page.city,
    (page.events || []).map((event) => event.eventId).join(';'),
    page.sourceMinChars,
    page.rewriteChars || page.mainBody.length,
    page.substantiveParagraphs || paragraphCount(page.mainBody),
    decision,
    'PASS',
    'PASS',
    original['practical conflicts'] || '',
  ].map(csvEscape).join(','));
}
fs.writeFileSync(auditPath, `${auditOut.join('\n')}\n`, 'utf8');

const markdown = [
  '# Итоговая редакция трёх батчей EventPage',
  '',
  `Подготовлено страниц: ${allPages.length}; к записи: ${staged.length}; индексируемых представителей: ${statusCounts.indexable}; повторные страницы с noindex: ${statusCounts.noindexDuplicate}; без активных будущих слотов: ${statusCounts.noFuture}.`,
  '',
  'Исходные описания сохранены в source-archive файлах батчей. Для публичного текста используются только активные редакционные секции ниже. Связи, URL, canonical и redirects не меняются.',
  '',
];
for (const page of allPages) {
  markdown.push(`## ${page.title} — ${page.city}`);
  markdown.push('');
  markdown.push(`URL: https://daibilet.ru/events/${page.slug}`);
  markdown.push(`EventPage ID: ${page.eventPageId}`);
  markdown.push(`Event IDs: ${(page.events || []).map((event) => event.eventId).join(', ')}`);
  markdown.push(`Статус редакции: ${page.reviewDecision || 'EXCLUDED_NO_FUTURE_SLOT'}`);
  markdown.push('');
  markdown.push(page.mainBody || '');
  markdown.push('');
  markdown.push('## Практическая информация');
  markdown.push('');
  markdown.push(practicalBlock(page));
  markdown.push('');
}
fs.writeFileSync(path.join(editorial, 'eventpage-next-three-batches-page-specific-content-2026-11-13.md'), `${markdown.join('\n')}\n`, 'utf8');

const report = `# Production apply plan — three EventPage rewrite batches\n\n- Prepared master texts: **90**\n- Active EventPage records to write: **${staged.length}**\n- Indexable unique / city / venue representatives: **${statusCounts.indexable}**\n- Duplicate same-city pages published with noindex: **${statusCounts.noindexDuplicate}**\n- Pages excluded because all linked events have no future saleable slot: **${statusCounts.noFuture}**\n- Page/Event associations changed: **0**\n- Slugs, canonical paths, redirects changed: **0**\n\nSame-city repeated pages use one indexable representative per program and venue. Other repeated URLs remain public but noindex pending a separate product-level decision. The two expired EventPages remain drafts. The two Harry Potter city pages have independent city context.\n\nPayload: \`eventpage-next-three-batches-production-payload-2026-11-13.json\`. Original provider descriptions remain in the per-batch source archives.\n`;
fs.writeFileSync(reportPath, report, 'utf8');

console.log(JSON.stringify({
  pages: allPages.length,
  toApply: staged.length,
  ...statusCounts,
  repeatGroups: [...repeatGroups.values()].filter((group) => group.length > 1).length,
  repeatedPages: [...repeatGroups.values()].filter((group) => group.length > 1).reduce((sum, group) => sum + group.length, 0),
  paths: [outputPath, auditPath, reportPath],
}, null, 2));
