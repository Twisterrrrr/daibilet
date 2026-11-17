import fs from 'node:fs';

const dir = 'data/ticketscloud/editorial';
const ledgerPath = `${dir}/eventpage-all-rewrites-ledger-2026-11-17.csv`;
const archivePath = `${dir}/eventpage-next-five-batches-source-archive-2026-11-17.json`;
const deltaPath = `${dir}/eventpage-sync-delta-2026-11-17.csv`;

function parseCsvLine(line) {
  const out = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"';
        i += 1;
      } else quoted = !quoted;
    } else if (c === ';' && !quoted) {
      out.push(value);
      value = '';
    } else value += c;
  }
  out.push(value);
  return out;
}

function quote(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

const original = fs.readFileSync(ledgerPath, 'utf8').trim().split(/\r?\n/);
const header = parseCsvLine(original[0]);
const rows = original.slice(1).map(parseCsvLine);
const index = Object.fromEntries(header.map((name, i) => [name, i]));
const byPageId = new Map(rows.map((row) => [row[index['EventPage ID']], row]));
const archive = JSON.parse(fs.readFileSync(archivePath, 'utf8'));
const activePages = archive.candidates.filter((page) => page.fresh_linked_events > 0 && byPageId.has(page.id));

const deltas = [];
const unresolved = [];
for (const page of activePages) {
  const row = byPageId.get(page.id);
  const listed = (page.events ?? []).map((event) => event.eventId).filter(Boolean);
  if (!listed.length || new Set(listed).size !== listed.length) {
    unresolved.push({ id: page.id, title: page.title, captured: listed.length, duplicateIds: listed.length - new Set(listed).size });
    continue;
  }

  const oldIds = (row[index['Event ID']] ?? '').split('|').map((id) => id.trim()).filter(Boolean);
  const oldSet = new Set(oldIds);
  const newSet = new Set(listed);
  const added = listed.filter((id) => !oldSet.has(id));
  const removed = oldIds.filter((id) => !newSet.has(id));
  if (added.length || removed.length || oldIds.length !== listed.length) {
    deltas.push({
      pageId: page.id,
      title: page.title,
      city: page.events?.[0]?.city ?? row[index['Город']],
      slug: page.slug,
      oldCount: oldIds.length,
      currentCount: listed.length,
      freshLinkedEvents: page.fresh_linked_events,
      addedIds: added,
      removedIds: removed,
    });
    row[index['Event ID']] = listed.join('|');
    row[index['Связанных Event ID']] = String(listed.length);
    row[index['Сверка списка Event ID']] = `точный состав обновлён по sync snapshot ${archive.capturedAt}`;
  }
}

const csv = [header.map(quote).join(';'), ...rows.map((row) => row.map(quote).join(';'))].join('\n') + '\n';
fs.writeFileSync(ledgerPath, csv, 'utf8');

const deltaHeader = ['EventPage ID', 'Название', 'Город', 'Slug', 'ID до сверки', 'ID после сверки', 'Свежих Event по sync', 'Добавленные Event ID', 'Убранные Event ID'];
const deltaCsv = [
  deltaHeader.map(quote).join(';'),
  ...deltas.map((d) => [d.pageId, d.title, d.city, d.slug, d.oldCount, d.currentCount, d.freshLinkedEvents, d.addedIds.join('|'), d.removedIds.join('|')].map(quote).join(';')),
].join('\n') + '\n';
fs.writeFileSync(deltaPath, deltaCsv, 'utf8');

const changed = deltas.length;
const addedCount = deltas.reduce((sum, d) => sum + d.addedIds.length, 0);
const removedCount = deltas.reduce((sum, d) => sum + d.removedIds.length, 0);
console.log(JSON.stringify({
  snapshotAt: archive.capturedAt,
  linkedEventPageCandidates: activePages.length,
  exactMembershipUpdated: changed,
  addedEventIds: addedCount,
  removedEventIds: removedCount,
  unresolvedMembership: unresolved,
  deltaReport: deltaPath,
}, null, 2));
