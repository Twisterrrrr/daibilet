import fs from 'node:fs';

const dir = 'data/ticketscloud/editorial';
const sourcePath = `${dir}/eventpage-next-five-batches-source-archive-2026-11-17.json`;
const ledgerPath = `${dir}/eventpage-all-rewrites-ledger-2026-11-17.csv`;
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const ledgerText = fs.readFileSync(ledgerPath, 'utf8').trim();

function parseCsvLine(line) {
  const out = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i + 1] === '"') { value += '"'; i += 1; }
      else quoted = !quoted;
    } else if (c === ';' && !quoted) { out.push(value); value = ''; }
    else value += c;
  }
  out.push(value);
  return out;
}
const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
const lines = ledgerText.split(/\r?\n/);
const header = parseCsvLine(lines[0]);
const rows = lines.slice(1).map(parseCsvLine);
const ix = Object.fromEntries(header.map((name, i) => [name, i]));
const ledgerByPage = new Map(rows.map((row) => [row[ix['EventPage ID']], row]));
const ledgerByEvent = new Map();
for (const row of rows) for (const id of (row[ix['Event ID']] ?? '').split('|').map((value) => value.trim()).filter(Boolean)) {
  const pages = ledgerByEvent.get(id) ?? [];
  pages.push(row[ix['EventPage ID']]);
  ledgerByEvent.set(id, pages);
}
const normalize = (text) => (text ?? '').toLowerCase()
  .replace(/\b\d{1,2}[.:]\d{2}\b/g, ' ')
  .replace(/\b\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?\b/g, ' ')
  .replace(/\d{1,2}\s+(?:ноября|декабря|января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября)(?=\s|$)/g, ' ')
  .replace(/(?:понедельник|вторник|среда|четверг|пятница|суббота|воскресенье|пн|вт|ср|чт|пт|сб|вс)/g, ' ')
  .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, ' ')
  .replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
const ledgerTitleCity = new Set(rows.map((row) => `${normalize(row[ix['Название']])}|${normalize(row[ix['Город']])}`));
const textOf = (page) => [...new Set((page.events ?? []).map((event) => (event.description ?? '')
  .replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()).filter(Boolean))].join('\n\n');

const fresh = source.candidates.filter((page) => page.fresh_linked_events > 0);
const matchedExisting = fresh.filter((page) => ledgerByPage.has(page.id));
const titleCityMatches = fresh.filter((page) => ledgerTitleCity.has(`${normalize(page.title)}|${normalize(page.events?.[0]?.city ?? '')}`));
const pageAudit = [];
for (const page of matchedExisting) {
  const row = ledgerByPage.get(page.id);
  const oldIds = (row[ix['Event ID']] ?? '').split('|').map((value) => value.trim()).filter(Boolean);
  const capturedIds = (page.events ?? []).map((event) => event.eventId?.trim()).filter(Boolean);
  const oldSet = new Set(oldIds);
  const newSet = new Set(capturedIds);
  const added = capturedIds.filter((id) => !oldSet.has(id));
  const removed = oldIds.filter((id) => !newSet.has(id));
  pageAudit.push({
    pageId: page.id, title: page.title, city: page.events?.[0]?.city ?? '', slug: page.slug,
    oldIdCount: oldIds.length, snapshotIdCount: capturedIds.length,
    reportedFreshEvents: page.fresh_linked_events,
    addedIds: added.join('|'), removedIds: removed.join('|'),
    exactIdMembershipMatch: added.length === 0 && removed.length === 0,
  });
}

const candidateEventIdConflicts = [];
for (const page of source.candidates) for (const event of page.events ?? []) {
  const owners = ledgerByEvent.get(event.eventId) ?? [];
  const otherOwners = owners.filter((id) => id !== page.id);
  if (otherOwners.length) candidateEventIdConflicts.push({
    pageId: page.id, title: page.title, city: event.city ?? '', eventId: event.eventId, existingPageIds: otherOwners.join('|'),
  });
}

const candidatePairs = new Map();
for (const page of source.candidates) {
  const event = page.events?.[0] ?? {};
  const key = `${normalize(page.title)}|${normalize(event.city)}|${normalize(event.venue)}`;
  candidatePairs.set(key, [...(candidatePairs.get(key) ?? []), page]);
}
const repeatGroups = [...candidatePairs.values()].filter((group) => group.length > 1 && group.some((page) => page.fresh_linked_events > 0)).map((group) => ({
  kind: 'same-title-city-venue',
  title: group[0].title,
  city: group[0].events?.[0]?.city ?? '',
  venue: group[0].events?.[0]?.venue ?? '',
  pages: group.map((page) => ({ id: page.id, slug: page.slug, linkedEventIds: (page.events ?? []).map((event) => event.eventId), reportedLinkedEvents: page.linked_events, freshEvents: page.fresh_linked_events ?? 0, sourceChars: textOf(page).length, sameSourceAsFirst: textOf(page) === textOf(group[0]) && textOf(page).length > 0 })),
}));

const crossCityMap = new Map();
for (const page of source.candidates) {
  const event = page.events?.[0] ?? {};
  const key = normalize(page.title);
  if (!key) continue;
  crossCityMap.set(key, [...(crossCityMap.get(key) ?? []), page]);
}
const tourReviewGroups = [...crossCityMap.values()].filter((group) => new Set(group.map((page) => page.events?.[0]?.city)).size > 1).map((group) => {
  const descriptions = group.map(textOf);
  const exactDescriptionMatches = descriptions.filter((text, i) => text.length > 0 && descriptions.indexOf(text) !== i).length;
  return {
    kind: 'possible-tour-review-not-confirmed',
    title: group[0].title,
    exactDescriptionMatches,
    cities: [...new Set(group.map((page) => page.events?.[0]?.city ?? ''))].join('|'),
    pages: group.map((page) => ({ id: page.id, slug: page.slug, city: page.events?.[0]?.city ?? '', sourceChars: textOf(page).length, descriptionMatchesFirst: textOf(page) === descriptions[0] && textOf(page).length > 0 })),
  };
});

const pageCsv = [
  ['EventPage ID', 'Название', 'Город', 'Slug', 'Связей в реестре', 'ID в sync snapshot', 'Свежих Event по отчёту', 'Добавленные Event ID', 'Убранные Event ID', 'Состав ID совпадает'].map(quote).join(';'),
  ...pageAudit.map((row) => [row.pageId, row.title, row.city, row.slug, row.oldIdCount, row.snapshotIdCount, row.reportedFreshEvents, row.addedIds, row.removedIds, row.exactIdMembershipMatch ? 'да' : 'нет'].map(quote).join(';')),
].join('\n') + '\n';
fs.writeFileSync(`${dir}/eventpage-sync-page-audit-2026-11-17.csv`, pageCsv, 'utf8');
const conflictsCsv = [
  ['Candidate EventPage ID', 'Название', 'Город', 'Event ID', 'Уже связан с EventPage ID'].map(quote).join(';'),
  ...candidateEventIdConflicts.map((row) => [row.pageId, row.title, row.city, row.eventId, row.existingPageIds].map(quote).join(';')),
].join('\n') + '\n';
fs.writeFileSync(`${dir}/eventpage-sync-eventid-collisions-2026-11-17.csv`, conflictsCsv, 'utf8');
const titleCityCsv = [
  ['EventPage ID', 'Название', 'Город', 'Slug', 'Есть точный EventPage ID в реестре', 'Есть точный Event ID в реестре', 'Действие'].map(quote).join(';'),
  ...titleCityMatches.map((page) => [page.id, page.title, page.events?.[0]?.city ?? '', page.slug, ledgerByPage.has(page.id) ? 'да' : 'нет', (page.events ?? []).some((event) => ledgerByEvent.has(event.eventId)) ? 'да' : 'нет', 'сверить состав/источник до рерайта; совпадение названия не считать дублем'].map(quote).join(';')),
].join('\n') + '\n';
fs.writeFileSync(`${dir}/eventpage-sync-title-city-review-2026-11-17.csv`, titleCityCsv, 'utf8');
fs.writeFileSync(`${dir}/eventpage-sync-possible-tours-2026-11-17.json`, JSON.stringify({ capturedAt: source.capturedAt, note: 'Same normalized title across cities is a screening signal only; these groups are not confirmed tours and must be compared by artist/program, organizer, venue/source and exact Event IDs before sharing text or changing links.', groups: tourReviewGroups }, null, 2) + '\n', 'utf8');
fs.writeFileSync(`${dir}/eventpage-sync-same-city-series-review-2026-11-17.json`, JSON.stringify({ capturedAt: source.capturedAt, note: 'Repeated date series grouped by normalized title, city and venue. This is a review queue: compare exact Event IDs, source descriptions, cast/program and organizer before applying one master rewrite or changing EventPage links.', groups: repeatGroups }, null, 2) + '\n', 'utf8');

const fullyMatched = pageAudit.filter((page) => page.exactIdMembershipMatch).length;
const idsAdded = pageAudit.reduce((n, page) => n + (page.addedIds ? page.addedIds.split('|').length : 0), 0);
const idsRemoved = pageAudit.reduce((n, page) => n + (page.removedIds ? page.removedIds.split('|').length : 0), 0);
const strongTextTourSignals = tourReviewGroups.filter((group) => group.exactDescriptionMatches > 0 && !/открытый микрофон|стендап-импровизация/i.test(group.title));
const report = `# Сверка кандидатов после синка с реестром рерайтов\n\n` +
  `Снимок каталога: ${source.capturedAt} UTC; последний sync: ${source.syncs.find((sync) => sync.source === 'TICKETSCLOUD')?.syncFinishedAt ?? 'не указан'} UTC.\n\n` +
  `- В выборке ${source.candidates.length} доступных EventPage-кандидатов; у ${fresh.length} отмечены новые связанные события.\n` +
  `- ${matchedExisting.length} таких кандидатов уже имеют EventPage ID в реестре редакционных рерайтов. Для этих страниц точные списки ID сравнивались по EventPage ID, не по заголовку.\n` +
  `- Состав ID совпал у ${fullyMatched}/${matchedExisting.length}; добавленных ID: ${idsAdded}; удалённых ID: ${idsRemoved}. Значение fresh_linked_events не трактуется само по себе как новая связь: проверяются сами ID.\n` +
  `- Совпадений Event ID кандидата с другой уже учтённой EventPage: ${candidateEventIdConflicts.length}. Список — в CSV, если он непустой.\n` +
  `- ${titleCityMatches.length} свежих кандидатов совпали с записью реестра по нормализованным названию и городу; это список ручной сверки, а не автоматических дублей.\n` +
  `- ${repeatGroups.length} групп повторных дат в одном городе и площадке вынесены на проверку серийности. Точный список Event ID и совпадение исходников есть в отдельном файле; страницы автоматически не объединялись.\n` +
  `- ${tourReviewGroups.length} межгородских групп одинакового названия вынесены на проверку гастрольности. Совпадение названия не подтверждает один тур; описания, артист/программа, организатор и источники нужно сверять отдельно.\n` +
  `- Сильные сигналы общего текста (это всё ещё требует сверки программы/организатора): ${strongTextTourSignals.map((group) => `${group.title} — ${group.cities.replaceAll('|', ', ')}`).join('; ') || 'нет'}.\n` +
  `- Ни у одного из ${source.candidates.length} кандидатов в этом snapshot не заполнен TourGroupId; источник не позволяет автоматически пометить новые страницы как гастрольные. Подтверждённые гастрольные страницы из прежней кампании остаются в общем реестре.\n\n` +
  `## Артефакты\n\n` +
  `- [Постраничная сверка точных Event ID](eventpage-sync-page-audit-2026-11-17.csv)\n` +
  `- [Коллизии Event ID между страницами-кандидатами и реестром](eventpage-sync-eventid-collisions-2026-11-17.csv)\n` +
  `- [Совпадения кандидатов по названию и городу для ручной сверки](eventpage-sync-title-city-review-2026-11-17.csv)\n` +
  `- [Повторяющиеся даты/серии в одном городе и площадке](eventpage-sync-same-city-series-review-2026-11-17.json)\n` +
  `- [Кандидаты на межгородскую/гастрольную сверку](eventpage-sync-possible-tours-2026-11-17.json)\n`;
fs.writeFileSync(`${dir}/eventpage-sync-duplicate-tour-audit-2026-11-17.md`, report, 'utf8');
console.log(JSON.stringify({
  snapshotAt: source.capturedAt,
  candidatePages: source.candidates.length,
  freshFlagPages: fresh.length,
  alreadyInRewriteLedger: matchedExisting.length,
  exactIdListMatch: fullyMatched,
  addedIds: idsAdded, removedIds: idsRemoved,
  crossPageEventIdConflicts: candidateEventIdConflicts.length,
  titleCityMatches: titleCityMatches.length,
  possibleCrossCityGroups: tourReviewGroups.length,
  strongTextTourSignals: strongTextTourSignals.map((group) => ({ title: group.title, cities: group.cities })),
  explicitTourGroupPages: source.candidates.filter((page) => page.tourGroupId).length,
}, null, 2));
