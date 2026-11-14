import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const inputPath = resolve('docs/event-pdp-url-map-current-2026-10-27.csv');
const outputPath = resolve('docs/eventpage-slug-collision-review-2026-10-27.csv');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { value += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(value); value = ''; }
    else if (char === '\n') { row.push(value.replace(/\r$/u, '')); rows.push(row); row = []; value = ''; }
    else value += char;
  }
  if (value || row.length) { row.push(value.replace(/\r$/u, '')); rows.push(row); }
  const [headers, ...records] = rows;
  return records.map((record) => Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ''])));
}

const cyrillic = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};
function slugify(value) {
  return [...String(value || '').trim().toLowerCase()].map((char) => cyrillic[char] ?? char).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
}
function baseEventSlug(record) {
  let slug = String(record.event_slug || '').trim().toLowerCase();
  const tcId = String(record.event_id || '').match(/^evt_([a-f\d]{24})$/i)?.[1];
  const tepId = String(record.event_id || '').match(/^evt_tep_(\d{2,6})$/i)?.[1];
  if (tcId) slug = slug.replace(new RegExp(`^tc-${tcId}-`, 'i'), '').replace(new RegExp(`-${tcId}$`, 'i'), '');
  if (tepId && slug.endsWith(`-${tepId}`)) slug = slug.slice(0, -(tepId.length + 1));
  return slug || String(record.event_id || 'event');
}
function csv(value) { return `"${String(value ?? '').replaceAll('"', '""')}"`; }

const rows = parseCsv(await readFile(inputPath, 'utf8'))
  .filter((row) => row.event_id && Number(row.active_session_count) > 0 && Number(row.active_offer_count) > 0)
  .map((row) => {
    const baseSlug = baseEventSlug(row);
    const citySlug = slugify(row.city);
    return { ...row, baseSlug, citySlug, proposedSlug: citySlug && !baseSlug.endsWith(`-${citySlug}`) ? `${baseSlug}-${citySlug}` : baseSlug };
  });

const groups = new Map();
for (const row of rows) {
  const bucket = groups.get(row.proposedSlug) ?? [];
  bucket.push(row);
  groups.set(row.proposedSlug, bucket);
}
const conflicts = [...groups.entries()].filter(([, members]) => members.length > 1)
  .sort(([a], [b]) => a.localeCompare(b));
const outputRows = [['proposed_city_slug', 'event_id', 'event_title', 'city', 'venue', 'current_url', 'source_codes', 'source_external_ids', 'group_size', 'review_status']];
for (const [proposedSlug, members] of conflicts) {
  for (const row of members.sort((a, b) => a.city.localeCompare(b.city) || a.event_title.localeCompare(b.event_title))) {
    outputRows.push([proposedSlug, row.event_id, row.event_title, row.city, row.venue, row.url, row.source_codes, row.source_external_ids, members.length, 'review_before_grouping']);
  }
}
await writeFile(outputPath, `${outputRows.map((row) => row.map(csv).join(',')).join('\n')}\n`, 'utf8');
console.log(JSON.stringify({ inputRecords: rows.length, conflictingSlugGroups: conflicts.length, eventRecordsInConflicts: conflicts.reduce((sum, [, members]) => sum + members.length, 0), outputPath }, null, 2));
