import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(process.cwd(), 'data/ticketscloud/editorial');
const selection = JSON.parse(fs.readFileSync(path.join(dir, 'newyear-eventpage-selection-150-2026-11-24.json'), 'utf8')).batches.flat();
const candidates = JSON.parse(fs.readFileSync(path.join(dir, 'newyear-candidates-production-2026-11-24.json'), 'utf8')).candidates;
const selectedById = new Map(selection.map((item) => [item.eventPageId, item]));
const normalize = (value) => String(value ?? '').toLowerCase().replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ')
  .replace(/[«»"'’]/g, '').replace(/[^a-zа-яё0-9]+/gi, ' ').trim().replace(/\s+/g, ' ');

const groups = new Map();
for (const candidate of candidates) {
  const key = [candidate.eventTitle, candidate.city, candidate.venue].map(normalize).join('|');
  const rows = groups.get(key) ?? new Map();
  rows.set(candidate.eventPageId, candidate);
  groups.set(key, rows);
}

const outputGroups = [];
for (const rowsMap of groups.values()) {
  const rows = [...rowsMap.values()];
  const selectedRows = rows.filter((row) => selectedById.has(row.eventPageId));
  if (rows.length < 2 || selectedRows.length === 0) continue;
  const sameSourceText = new Set(rows.map((row) => normalize(row.description))).size === 1;
  const masters = [...selectedRows].sort((a, b) => {
    const sa = selectedById.get(a.eventPageId);
    const sb = selectedById.get(b.eventPageId);
    return Number(Boolean(/-\d+$/.test(a.slug))) - Number(Boolean(/-\d+$/.test(b.slug)))
      || sa.batch - sb.batch || sa.sequence - sb.sequence;
  });
  const master = masters[0];
  outputGroups.push({
    title: master.eventTitle,
    city: master.city,
    venue: master.venue,
    evidence: sameSourceText ? 'same-normalized-source-description' : 'same-title-city-venue; source-text-varies-review-facts',
    recommendedMaster: { eventPageId: master.eventPageId, slug: master.slug,
      selectedAs: selectedById.get(master.eventPageId) ? `${selectedById.get(master.eventPageId).batch}#${selectedById.get(master.eventPageId).sequence}` : null },
    selectedPages: selectedRows.map((row) => ({ eventPageId: row.eventPageId, slug: row.slug,
      selectedAs: `${selectedById.get(row.eventPageId).batch}#${selectedById.get(row.eventPageId).sequence}` })),
    candidatePages: rows.map((row) => ({ eventPageId: row.eventPageId, slug: row.slug, eventId: row.eventId,
      nextSlot: row.nextSlot, sourceChars: row.sourceChars, priceFrom: row.priceFrom })),
  });
}

outputGroups.sort((a, b) => a.city.localeCompare(b.city, 'ru') || a.title.localeCompare(b.title, 'ru'));
const out = { generatedAt: new Date().toISOString(), selectionPages: selection.length,
  exactIdentityRule: 'candidate event title + city + venue; same title alone is not treated as a merge decision',
  groupsFound: outputGroups.length,
  groupsWithExactSourceCopy: outputGroups.filter((group) => group.evidence === 'same-normalized-source-description').length,
  groupsRequiringSourceFactReview: outputGroups.filter((group) => group.evidence !== 'same-normalized-source-description').length,
  note: 'This is an audit only. It does not change EventPage↔Event ID relations, URL, publication, or indexing.',
  groups: outputGroups };
const outputPath = path.join(dir, 'newyear-eventpage-duplicate-groups-audit-2026-11-24.json');
fs.writeFileSync(outputPath, `${JSON.stringify(out, null, 2)}\n`);
process.stdout.write(JSON.stringify({ output: path.basename(outputPath), groupsFound: out.groupsFound,
  exactSourceCopy: out.groupsWithExactSourceCopy, reviewRequired: out.groupsRequiringSourceFactReview }, null, 2));
