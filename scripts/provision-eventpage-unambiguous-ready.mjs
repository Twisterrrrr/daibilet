import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inputPath = path.resolve(rootDir, process.env.EVENTPAGE_READY_CANDIDATES_CSV
  || 'docs/eventpage-unambiguous-ready-candidates-2026-11-04.csv');
const apply = process.argv.includes('--apply');
const production = process.argv.includes('--production');
const expectedArg = process.argv.find((arg) => arg.startsWith('--expected-count='));
const expectedCount = expectedArg ? Number(expectedArg.split('=')[1]) : null;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL must be provided explicitly');
const database = new URL(databaseUrl);
if (production && (database.hostname !== '127.0.0.1' || database.port !== '5437' || database.pathname !== '/daibilet')) {
  throw new Error(`Production mode refused unexpected database target: ${database.hostname}:${database.port}${database.pathname}`);
}
if (apply && (!production || !Number.isInteger(expectedCount) || expectedCount < 1)) {
  throw new Error('Writes require --apply --production --expected-count=<reviewed candidate count>');
}

const rows = parseCsv(readFileSync(inputPath, 'utf8'));
const headers = rows.shift()?.map((value) => value.trim()) || [];
const field = (row, name) => row[headers.indexOf(name)] ?? '';
const candidates = rows.filter((row) => row.some(Boolean)).map((row) => ({
  eventId: field(row, 'event_id').trim(),
  expectedKind: field(row, 'expected_kind').trim().toUpperCase(),
  expectedParentId: field(row, 'expected_tc_parent_id').trim(),
  expectedCityId: field(row, 'expected_city_id').trim(),
}));
if (!candidates.length || candidates.some((item) => !item.eventId || !['SINGLE', 'OPEN_DATE', 'RECURRING'].includes(item.expectedKind))) {
  throw new Error('Candidate CSV has missing IDs or invalid expected_kind values');
}
if (new Set(candidates.map((item) => item.eventId)).size !== candidates.length) throw new Error('Candidate CSV contains duplicate Event IDs');
if (expectedCount != null && expectedCount !== candidates.length) throw new Error(`Candidate count changed: expected ${expectedCount}, found ${candidates.length}`);

const { createDb } = await import(pathToFileURL(path.join(rootDir, 'apps/backend/src/db.js')).href);
const { ensureDraftEventPageForEvent } = await import(pathToFileURL(path.join(rootDir, 'apps/backend/src/event-pages.js')).href);
const db = createDb(rootDir);
try {
  const checked = [];
  for (const candidate of candidates) {
    const result = await db.query(`
      WITH tc AS (
        SELECT count(DISTINCT NULLIF(trim(link."metaExternalId"), ''))::int AS parent_count,
          min(NULLIF(trim(link."metaExternalId"), '')) AS parent_id
        FROM "EventSourceLink" link JOIN "Source" source ON source.id = link."sourceId"
        WHERE link."eventId" = $1 AND upper(source.code::text) = 'TICKETSCLOUD'
      ), sibling_variants AS (
        SELECT count(DISTINCT event.title)::int AS title_count,
          count(DISTINCT event."venueId")::int AS venue_count,
          count(DISTINCT page_link."eventPageId")::int AS linked_page_count
        FROM tc
        JOIN "EventSourceLink" sibling_link ON trim(sibling_link."metaExternalId") = tc.parent_id
        JOIN "Source" source ON source.id=sibling_link."sourceId" AND upper(source.code::text)='TICKETSCLOUD'
        JOIN "Event" event ON event.id=sibling_link."eventId" AND event."primaryCityId" IS NOT DISTINCT FROM $2
        LEFT JOIN "EventPageEvent" page_link ON page_link."eventId"=event.id
        WHERE tc.parent_count=1 AND tc.parent_id IS NOT NULL
          AND EXISTS (SELECT 1 FROM "EventOffer" offer WHERE offer."eventId"=event.id AND offer.active IS NOT FALSE)
          AND EXISTS (SELECT 1 FROM "EventSession" session WHERE session."eventId"=event.id
            AND session."isActive" IS NOT FALSE AND session."archivedAt" IS NULL AND session."cancelledAt" IS NULL
            AND session."startsAt">=now() AND lower(coalesce(session."sourceStatus",'')) NOT IN
              ('widget_blocked','paused','suspended','stopped','cancelled','canceled','draft','hidden','stand_by','closed','sales_closed','sale_closed','not_for_sale'))
      )
      SELECT event.id, upper(event.kind::text) AS kind, upper(event.status::text) AS status,
        event."primaryCityId" AS city_id,
        (event.kind::text='OPEN_DATE' AND (event."openDateValidTo" IS NULL OR event."openDateValidTo">=now())) AS open_date_current,
        EXISTS (SELECT 1 FROM "EventOffer" offer WHERE offer."eventId"=event.id AND offer.active IS NOT FALSE) AS has_offer,
        EXISTS (SELECT 1 FROM "EventSession" session WHERE session."eventId"=event.id
          AND session."isActive" IS NOT FALSE AND session."archivedAt" IS NULL AND session."cancelledAt" IS NULL
          AND session."startsAt">=now() AND lower(coalesce(session."sourceStatus",'')) NOT IN
            ('widget_blocked','paused','suspended','stopped','cancelled','canceled','draft','hidden','stand_by','closed','sales_closed','sale_closed','not_for_sale')) AS has_future_session,
        (SELECT count(*)::int FROM "EventPageEvent" link WHERE link."eventId"=event.id) AS event_page_links,
        tc.parent_count, tc.parent_id, sibling_variants.title_count, sibling_variants.venue_count,
        sibling_variants.linked_page_count
      FROM "Event" event CROSS JOIN tc CROSS JOIN sibling_variants WHERE event.id=$1
    `, [candidate.eventId, candidate.expectedCityId || null]);
    const row = result.rows[0];
    const invalid = !row
      || row.kind !== candidate.expectedKind
      || row.status !== 'READY'
      || !row.has_offer
      || (candidate.expectedKind === 'OPEN_DATE' && !row.open_date_current)
      || (candidate.expectedKind !== 'OPEN_DATE' && !row.has_future_session)
      || row.event_page_links !== 0
      || (candidate.expectedCityId && row.city_id !== candidate.expectedCityId)
      || (candidate.expectedKind === 'RECURRING' && (row.parent_count !== 1 || row.parent_id !== candidate.expectedParentId
        || row.title_count !== 1 || row.venue_count !== 1 || row.linked_page_count !== 0));
    if (invalid) throw new Error(`Candidate no longer matches reviewed matrix: ${candidate.eventId}; live row=${JSON.stringify(row)}`);
    checked.push({ candidate, row });
  }

  const result = { mode: apply ? 'apply' : 'dry-run', database: database.pathname, selected: candidates.length, revalidated: checked.length };
  if (apply) {
    result.created = 0;
    for (const { candidate } of checked) {
      const page = await db.transaction(({ query }) => ensureDraftEventPageForEvent({ query }, candidate.eventId));
      if (!page?.created || page.grouped) throw new Error(`Unexpected provisioning outcome for ${candidate.eventId}: ${JSON.stringify(page)}`);
      result.created += 1;
    }
    const verification = await db.query(`
      SELECT count(DISTINCT page.id)::int AS pages,
        count(*) FILTER (WHERE page.status='DRAFT' AND page."isIndexable" IS FALSE
          AND page."canonicalPath" IS NULL AND page."publishedAt" IS NULL)::int AS safe_links,
        count(*) FILTER (WHERE page.status<>'DRAFT' OR page."isIndexable" IS TRUE
          OR page."canonicalPath" IS NOT NULL OR page."publishedAt" IS NOT NULL)::int AS unsafe_links,
        count(*) FILTER (WHERE route.id IS NULL)::int AS missing_candidate_routes
      FROM unnest($1::text[]) AS selected(event_id)
      JOIN "EventPageEvent" link ON link."eventId"=selected.event_id
      JOIN "EventPage" page ON page.id=link."eventPageId"
      LEFT JOIN "EventPageRoute" route ON route."eventPageId"=page.id AND route.kind='CANDIDATE'
        AND route.path='/events/' || page.slug
    `, [candidates.map((item) => item.eventId)]);
    result.verification = verification.rows[0];
    if (result.verification.pages !== candidates.length || result.verification.safe_links !== candidates.length
      || result.verification.unsafe_links !== 0 || result.verification.missing_candidate_routes !== 0) {
      throw new Error(`EventPage safety verification failed: ${JSON.stringify(result)}`);
    }
  }
  console.log(JSON.stringify(result));
} finally {
  await db.close?.();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field.length === 0) quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field); field = '';
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
    } else field += char;
  }
  if (quoted) throw new Error('Unterminated quoted field in candidate CSV');
  if (field.length || row.length) { row.push(field); if (row.some((value) => value !== '')) rows.push(row); }
  return rows;
}
