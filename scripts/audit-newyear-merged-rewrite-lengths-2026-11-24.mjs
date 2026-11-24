import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(process.cwd(), 'data/ticketscloud/editorial');
const read = (name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const manifest = read('newyear-eventpage-merge-manifest-2026-11-24.json');
const selection = read('newyear-eventpage-selection-150-2026-11-24.json');
const audit = read('newyear-eventpage-editorial-audit-2026-11-24.json');
const duplicateAudit = read('newyear-eventpage-duplicate-groups-audit-2026-11-24.json');
const extra = read('newyear-eventpage-extra-groups-live-2026-11-24.json');
const rows = selection.batches.flatMap((batch) => batch);
const auditByBatchSequence = new Map(audit.map((row) => [`${row.batch}/${row.sequence}`, row]));
const candidateByEventId = new Map(duplicateAudit.groups.flatMap((group) => group.candidatePages.map((page) => [page.eventId, page])));
const extraEventById = new Map(extra.pages.flatMap((page) => page.events.map((event) => [event.id, event])));

function plainLength(value) {
  return String(value || '')
    .replace(/<br\s*\/?\s*>/giu, ' ')
    .replace(/<[^>]+>/gu, ' ')
    .replace(/&nbsp;/giu, ' ')
    .replace(/&amp;/giu, '&')
    .replace(/\s+/gu, ' ')
    .trim().length;
}

const failures = [];
for (const group of manifest.groups) {
  const rewriteRow = rows.find((row) => row.eventPageId === group.targetPageId);
  if (!rewriteRow) throw new Error(`No selected rewrite for master ${group.targetPageId}`);
  const rewrite = auditByBatchSequence.get(`${rewriteRow.batch}/${rewriteRow.sequence}`);
  let maxOriginal = 0;
  let maxEventId = '';
  for (const page of group.pages) {
    for (const eventId of page.eventIds) {
      const exact = candidateByEventId.get(eventId);
      const additional = extraEventById.get(eventId);
      const originalChars = exact?.sourceChars ?? plainLength(additional?.description);
      if (originalChars > maxOriginal) {
        maxOriginal = originalChars;
        maxEventId = eventId;
      }
    }
  }
  if (maxOriginal > rewrite.rewriteChars) {
    failures.push({ group: group.key, title: group.title, slug: rewriteRow.slug, rewriteChars: rewrite.rewriteChars, maxOriginalChars: maxOriginal, eventId: maxEventId });
  }
}

const output = { groups: manifest.groups.length, failedLengthChecks: failures.length, failures };
console.log(JSON.stringify(output, null, 2));
if (failures.length) process.exitCode = 1;
