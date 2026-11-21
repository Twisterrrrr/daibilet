import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootDir = path.resolve(process.env.DAIBILET_REPO_ROOT || scriptRoot);
const inputPath = path.resolve(rootDir, process.env.EVENTPAGE_RECURRING_MATRIX_CSV
  || 'docs/eventpage-live-recurring-matrix-2026-11-03-refresh.csv');
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

const candidates = selectCandidates(parseCsv(readFileSync(inputPath, 'utf8')));
if (!candidates.length) throw new Error(`No eligible recurring groups in ${inputPath}`);
if (expectedCount != null && candidates.length !== expectedCount) {
  throw new Error(`Candidate count changed: expected ${expectedCount}, found ${candidates.length}`);
}

const { createDb } = await import(pathToFileURL(path.join(rootDir, 'apps/backend/src/db.js')).href);
const { ensureDraftEventPageForEvent } = await import(pathToFileURL(path.join(rootDir, 'apps/backend/src/event-pages.js')).href);
const db = createDb(rootDir);
try {
  const rows = await db.query(`
    WITH candidates AS (
      SELECT * FROM json_to_recordset($1::json) AS c(
        row_type text, provider_parent_id text, city_id text, representative_event_id text
      )
    ), tc_identity AS (
      SELECT sl."eventId", count(*) FILTER (WHERE upper(src.code::text) = 'TICKETSCLOUD')::int AS tc_links,
        count(DISTINCT NULLIF(trim(sl."metaExternalId"), '')) FILTER (WHERE upper(src.code::text) = 'TICKETSCLOUD')::int AS tc_parent_count,
        min(NULLIF(trim(sl."metaExternalId"), '')) FILTER (WHERE upper(src.code::text) = 'TICKETSCLOUD') AS tc_parent
      FROM "EventSourceLink" sl JOIN "Source" src ON src.id = sl."sourceId"
      GROUP BY sl."eventId"
    ), saleable AS (
      SELECT e.id, e.title, e."primaryCityId" AS city_id, e."venueId" AS venue_id,
        COALESCE(e."supplierId", se."supplierId") AS supplier_id,
        COALESCE(ti.tc_links, 0) AS tc_links, COALESCE(ti.tc_parent_count, 0) AS tc_parent_count,
        ti.tc_parent, EXISTS (SELECT 1 FROM "EventPageEvent" link WHERE link."eventId" = e.id) AS linked
      FROM "Event" e
      LEFT JOIN tc_identity ti ON ti."eventId" = e.id
      LEFT JOIN LATERAL (
        SELECT supplier_event."supplierId" FROM "SupplierEvent" supplier_event
        WHERE supplier_event."eventId" = e.id AND supplier_event."isActive" IS TRUE
        ORDER BY supplier_event."isPrimary" DESC, supplier_event."createdAt" ASC LIMIT 1
      ) se ON true
      WHERE upper(e.kind::text) = 'RECURRING' AND upper(e.status::text) = 'READY'
        AND EXISTS (SELECT 1 FROM "EventOffer" o WHERE o."eventId" = e.id AND o.active IS NOT FALSE)
        AND EXISTS (
          SELECT 1 FROM "EventSession" s WHERE s."eventId" = e.id AND s."isActive" IS NOT FALSE
            AND s."archivedAt" IS NULL AND s."cancelledAt" IS NULL AND s."startsAt" >= now()
            AND lower(coalesce(s."sourceStatus", '')) NOT IN
              ('widget_blocked','paused','suspended','stopped','cancelled','canceled','draft','hidden','stand_by','closed','sales_closed','sale_closed','not_for_sale')
        )
    ), tc_group_stats AS (
      SELECT s.tc_parent AS parent_id, s.city_id, count(DISTINCT s.id)::int AS live_events,
        count(DISTINCT s.title)::int AS title_variants, count(DISTINCT s.venue_id)::int AS venue_variants,
        count(DISTINCT s.supplier_id)::int AS supplier_variants,
        count(DISTINCT page.id)::int AS page_count,
        bool_or(s.id = c.representative_event_id) AS representative_is_live
      FROM candidates c
      JOIN saleable s ON c.row_type = 'TC_PARENT_CITY' AND s.tc_parent = c.provider_parent_id
        AND s.city_id IS NOT DISTINCT FROM c.city_id AND s.tc_links = 1 AND s.tc_parent_count = 1
      LEFT JOIN "EventPageEvent" link ON link."eventId" = s.id
      LEFT JOIN "EventPage" page ON page.id = link."eventPageId"
      GROUP BY s.tc_parent, s.city_id
    ), candidate_checks AS (
      SELECT c.*, CASE
        WHEN c.row_type = 'TC_PARENT_CITY' THEN EXISTS (
          SELECT 1 FROM tc_group_stats g WHERE g.parent_id = c.provider_parent_id
            AND g.city_id IS NOT DISTINCT FROM c.city_id
            AND g.live_events > 0 AND g.title_variants = 1 AND g.venue_variants = 1
            AND g.supplier_variants <= 1 AND g.page_count = 0 AND g.representative_is_live
        ) AND NOT EXISTS (
          SELECT 1 FROM "Source" source
          JOIN "EventSourceLink" sibling_link ON sibling_link."sourceId" = source.id
            AND sibling_link."metaExternalId" = c.provider_parent_id
          JOIN "Event" sibling_event ON sibling_event.id = sibling_link."eventId"
            AND sibling_event."primaryCityId" IS NOT DISTINCT FROM c.city_id
          JOIN "EventPageEvent" page_link ON page_link."eventId" = sibling_event.id
          WHERE upper(source.code::text) = 'TICKETSCLOUD'
        )
        WHEN c.row_type = 'NO_TC_PARENT' THEN EXISTS (
          SELECT 1 FROM saleable s
          WHERE s.id = c.representative_event_id AND NOT s.linked
            AND s.tc_parent_count = 0 AND s.tc_links = 0
            AND EXISTS (
              SELECT 1 FROM "EventSourceLink" sl JOIN "Source" src ON src.id = sl."sourceId"
              WHERE sl."eventId" = s.id AND upper(src.code::text) = 'TEPLOHOD'
            )
        )
        ELSE false END AS eligible
      FROM candidates c
    )
    SELECT row_type, provider_parent_id, city_id, representative_event_id, eligible
    FROM candidate_checks ORDER BY row_type, provider_parent_id, city_id
  `, [JSON.stringify(candidates)]);
  const ineligible = rows.rows.filter((row) => row.eligible !== true);
  const report = {
    mode: apply ? 'apply' : 'dry-run', database: database.pathname,
    sourceFile: path.relative(rootDir, inputPath), selected: candidates.length,
    tcGroups: candidates.filter((row) => row.row_type === 'TC_PARENT_CITY').length,
    independentTeplohodEvents: candidates.filter((row) => row.row_type === 'NO_TC_PARENT').length,
    revalidatedEligible: rows.rowCount - ineligible.length,
    ineligible: ineligible.map(({ row_type, provider_parent_id, representative_event_id }) => ({ row_type, provider_parent_id, representative_event_id })),
  };
  if (ineligible.length) throw new Error(`Refusing batch: ${ineligible.length} candidates changed since matrix; ${JSON.stringify(report)}`);
  if (!apply) {
    console.log(JSON.stringify(report));
    process.exitCode = 0;
  } else {
    report.created = 0;
    report.existing = 0;
    for (const candidate of candidates) {
      const page = await db.transaction(async ({ query }) => {
        const result = await ensureDraftEventPageForEvent({ query }, candidate.representative_event_id);
        if (!result || result.grouped) throw new Error(`Unexpected prior link while applying reviewed batch: ${candidate.representative_event_id}`);
        return result;
      });
      if (page.created) report.created += 1;
      else report.existing += 1;
    }
    const ids = candidates.map((candidate) => candidate.representative_event_id);
    const verification = await db.query(`
      SELECT count(DISTINCT page.id)::int AS pages,
        count(*) FILTER (WHERE page.status = 'DRAFT' AND page."isIndexable" IS FALSE
          AND page."publishedAt" IS NULL AND page."canonicalPath" IS NULL)::int AS safe_draft_links,
        count(*) FILTER (WHERE page."isIndexable" IS TRUE OR page."publishedAt" IS NOT NULL
          OR page."canonicalPath" IS NOT NULL)::int AS unexpectedly_public,
        count(*) FILTER (WHERE route.id IS NULL)::int AS missing_candidate_routes
      FROM "EventPageEvent" link JOIN "EventPage" page ON page.id = link."eventPageId"
      LEFT JOIN "EventPageRoute" route ON route."eventPageId" = page.id
        AND route.kind = 'CANDIDATE' AND route.path = '/events/' || page.slug
      WHERE link."eventId" = ANY($1::text[])
    `, [ids]);
    report.verification = verification.rows[0];
    if (report.verification.unexpectedly_public || report.verification.missing_candidate_routes
      || report.verification.safe_draft_links !== candidates.length
      || report.verification.pages !== candidates.length) {
      throw new Error(`Post-write invariants failed: ${JSON.stringify(report)}`);
    }
    console.log(JSON.stringify(report));
  }
} finally {
  await db.close?.();
}

function selectCandidates(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map((value) => value.trim().replace(/^\uFEFF/u, ''));
  const index = Object.fromEntries(headers.map((value, position) => [value, position]));
  for (const header of ['row_type', 'provider_parent_id', 'city_id', 'linked_page_count', 'title_variants', 'venue_variants', 'representative_event_id']) {
    if (index[header] == null) throw new Error(`Matrix is missing required column ${header}`);
  }
  const selected = rows.slice(1).filter((row) => {
    const rowType = row[index.row_type];
    const noPage = row[index.linked_page_count] === '0';
    if (rowType === 'TC_PARENT_CITY') return noPage
      && row[index.title_variants] === '1' && row[index.venue_variants] === '1';
    if (rowType === 'NO_TC_PARENT') return noPage && row[index.source_codes] === 'TEPLOHOD';
    return false;
  }).map((row) => ({
    row_type: row[index.row_type],
    provider_parent_id: row[index.provider_parent_id],
    city_id: row[index.city_id],
    representative_event_id: row[index.representative_event_id],
  }));
  if (selected.some((candidate) => !candidate.representative_event_id)) throw new Error('Candidate row is missing representative Event ID');
  if (new Set(selected.map((candidate) => candidate.row_type === 'TC_PARENT_CITY'
    ? `${candidate.row_type}:${candidate.provider_parent_id}:${candidate.city_id}`
    : `${candidate.row_type}:${candidate.representative_event_id}`)).size !== selected.length) {
    throw new Error('Matrix contains duplicate candidate groups');
  }
  return selected;
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
      row.push(field);
      if (row.some((value) => value !== '')) rows.push(row);
      row = []; field = '';
    } else field += char;
  }
  if (quoted) throw new Error('Unterminated quoted field in matrix');
  if (field.length || row.length) { row.push(field); if (row.some((value) => value !== '')) rows.push(row); }
  return rows;
}
