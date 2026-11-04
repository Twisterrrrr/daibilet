import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootDir = path.resolve(process.env.DAIBILET_REPO_ROOT || scriptRoot);
const { createDb } = await import(pathToFileURL(path.join(rootDir, 'apps/backend/src/db.js')).href);
const eventPagesModule = path.resolve(process.env.EVENTPAGE_MODULE || path.join(rootDir, 'apps/backend/src/event-pages.js'));
const { ensureDraftEventPageForEvent, findAdminEventPageByEvent } = await import(pathToFileURL(eventPagesModule).href);
const inputPath = path.resolve(rootDir, process.env.EVENTPAGE_SIMPLE_CANDIDATES_CSV || 'docs/eventpage-live-single-production-2026-11-03.csv');
const apply = process.argv.includes('--apply');
const production = process.argv.includes('--production');
const parseOnly = process.argv.includes('--parse-only');
const expectedCountArg = process.argv.find((arg) => arg.startsWith('--expected-count='));
const expectedCount = expectedCountArg ? Number(expectedCountArg.split('=')[1]) : null;
const expectedEligibleArg = process.argv.find((arg) => arg.startsWith('--expected-eligible='));
const expectedEligible = expectedEligibleArg ? Number(expectedEligibleArg.split('=')[1]) : null;

if (apply && (!production || !Number.isInteger(expectedCount) || expectedCount < 1 || !Number.isInteger(expectedEligible) || expectedEligible < 1)) {
  throw new Error('Production writes require --apply --production --expected-count=<CSV count> --expected-eligible=<revalidated count>');
}

const databaseUrl = process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet';
const database = new URL(databaseUrl);
if (production && (database.hostname !== '127.0.0.1' || database.port !== '5437' || database.pathname !== '/daibilet')) {
  throw new Error(`Production mode refused unexpected database target: ${database.hostname}:${database.port}${database.pathname}`);
}
const eventIds = readSimpleCandidateIds(readFileSync(inputPath, 'utf8'));
if (!eventIds.length) throw new Error(`No SIMPLE_CANDIDATE Event IDs found in ${inputPath}`);
if (expectedCount != null && expectedCount !== eventIds.length) {
  throw new Error(`Candidate count changed: expected ${expectedCount}, found ${eventIds.length}`);
}
if (parseOnly) {
  console.log(JSON.stringify({ mode: 'parse-only', sourceFile: path.relative(rootDir, inputPath), selected: eventIds.length }));
  process.exit(0);
}

const db = createDb(rootDir);
try {
  const result = await db.query(`
    SELECT event.id,
      upper(coalesce(event.status::text, '')) AS status,
      upper(coalesce(event.kind::text, '')) AS kind,
      EXISTS (
        SELECT 1 FROM "EventOffer" offer
        WHERE offer."eventId" = event.id AND offer.active IS NOT FALSE
      ) AS "hasActiveOffer",
      EXISTS (
        SELECT 1 FROM "EventSession" session
        WHERE session."eventId" = event.id AND session."isActive" IS NOT FALSE
          AND session."archivedAt" IS NULL AND session."cancelledAt" IS NULL
          AND session."startsAt" >= now()
          AND lower(coalesce(session."sourceStatus", '')) NOT IN
            ('widget_blocked', 'paused', 'suspended', 'stopped', 'cancelled', 'canceled', 'draft', 'hidden', 'stand_by', 'closed', 'sales_closed', 'sale_closed', 'not_for_sale')
      ) AS "hasLiveSession",
      EXISTS (
        SELECT 1 FROM "EventPageEvent" link WHERE link."eventId" = event.id
      ) AS "alreadyLinked",
      EXISTS (
        SELECT 1 FROM "EventPageEvent" link
        JOIN "EventPage" page ON page.id = link."eventPageId"
        WHERE link."eventId" = event.id
          AND page.status = 'DRAFT' AND page."isIndexable" IS FALSE
          AND page."canonicalPath" IS NULL
          AND (SELECT count(*) FROM "EventPageEvent" members WHERE members."eventPageId" = page.id) = 1
      ) AS "safeExistingDraft",
      EXISTS (
        SELECT 1 FROM "EventSourceLink" source_link
        WHERE source_link."eventId" = event.id
          AND NULLIF(trim(source_link."metaExternalId"), '') IS NOT NULL
      ) AS "hasExternalParentIdentity"
    FROM "Event" event
    WHERE event.id = ANY($1::text[])
  `, [eventIds]);

  const byId = new Map(result.rows.map((row) => [row.id, row]));
  const missing = eventIds.filter((id) => !byId.has(id));
  const eligibleIds = eventIds.filter((id) => {
    const row = byId.get(id);
    return row && row.status === 'READY' && row.kind === 'SINGLE'
      && row.hasActiveOffer && row.hasLiveSession
      && (!row.alreadyLinked || row.safeExistingDraft) && !row.hasExternalParentIdentity;
  });
  const staleReasonCounts = {};
  for (const id of eventIds) {
    const row = byId.get(id);
    const reasons = !row ? ['missing'] : [
      ...(row.status !== 'READY' ? ['not_ready'] : []),
      ...(row.kind !== 'SINGLE' ? ['not_single'] : []),
      ...(!row.hasActiveOffer ? ['no_active_offer'] : []),
      ...(!row.hasLiveSession ? ['no_live_session'] : []),
      ...(row.alreadyLinked && !row.safeExistingDraft ? ['already_linked'] : []),
      ...(row.hasExternalParentIdentity ? ['external_parent_identity'] : []),
    ];
    for (const reason of reasons) staleReasonCounts[reason] = (staleReasonCounts[reason] || 0) + 1;
  }
  const counts = {
    mode: apply ? 'apply' : 'dry-run',
    database: database.pathname,
    sourceFile: path.relative(rootDir, inputPath),
    selected: eventIds.length,
    presentInDatabase: result.rowCount,
    eligible: eligibleIds.length,
    missing: missing.length,
    staleOrChanged: eventIds.length - missing.length - eligibleIds.length,
    staleReasonCounts,
  };
  const pageTotals = await db.query(`
    SELECT count(*)::int AS pages,
      count(*) FILTER (WHERE status = 'DRAFT')::int AS drafts,
      count(*) FILTER (WHERE status = 'DRAFT' AND "isIndexable" IS FALSE AND "canonicalPath" IS NULL)::int AS safeDrafts
    FROM "EventPage"
  `);
  counts.currentEventPageTotals = pageTotals.rows[0];
  if (process.argv.includes('--inspect-schema')) {
    const schema = await db.query(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name IN ('EventPage', 'EventPageEvent', 'EventSourceLink')
      ORDER BY table_name, ordinal_position
    `);
    counts.relevantSchemaColumns = schema.rows;
  }
  if (process.argv.includes('--rollback-smoke')) {
    if (!eligibleIds.length) throw new Error('No eligible live Event ID available for rollback smoke test');
    const smokeId = eligibleIds[0];
    const before = await db.query(`SELECT count(*)::int AS count FROM "EventPageEvent" WHERE "eventId" = $1`, [smokeId]);
    const rollbackMarker = `eventpage-rollback-smoke:${smokeId}`;
    try {
      await db.transaction(async (client) => {
        await ensureDraftEventPageForEvent(client, smokeId);
        throw new Error(rollbackMarker);
      });
    } catch (error) {
      if (error.message !== rollbackMarker) throw error;
    }
    const after = await db.query(`SELECT count(*)::int AS count FROM "EventPageEvent" WHERE "eventId" = $1`, [smokeId]);
    if (before.rows[0].count !== after.rows[0].count) throw new Error('Rollback smoke test changed EventPageEvent rows');
    counts.rollbackSmoke = { result: 'rolled_back', associationCountBefore: before.rows[0].count, associationCountAfter: after.rows[0].count };
  }
  if (process.argv.includes('--read-smoke')) {
    const page = await findAdminEventPageByEvent(db, eligibleIds[0]);
    if (!page || page.status !== 'DRAFT' || page.isIndexable !== false || page.events?.length !== 1) {
      throw new Error('Admin EventPage read smoke failed its draft/one-event invariants');
    }
    counts.readSmoke = { result: 'ok', status: page.status, isIndexable: page.isIndexable, linkedEvents: page.events.length };
  }

  if (!apply) {
    console.log(JSON.stringify(counts));
    process.exitCode = missing.length ? 2 : 0;
  } else {
    if (eligibleIds.length !== expectedEligible) {
      throw new Error(`Refusing production apply: only ${eligibleIds.length}/${expectedEligible} candidates still satisfy live-page guards`);
    }
    counts.created = 0;
    counts.existing = 0;
    counts.skipped = 0;
    for (const id of eligibleIds) {
      const page = await db.transaction(({ query }) => ensureDraftEventPageForEvent({ query }, id));
      if (!page) counts.skipped += 1;
      else if (page.created) counts.created += 1;
      else counts.existing += 1;
      if (page?.grouped) throw new Error(`Unexpected grouping for simple candidate ${id}; stop and review`);
    }
    console.log(JSON.stringify(counts));
  }
  if (apply || process.argv.includes('--verify-existing')) {
    const verification = await db.query(`
      WITH selected_pages AS (
        SELECT page.id, page.slug, page.status, page."isIndexable", page."publishedAt",
          page."canonicalPath", page."tourGroupId", count(link."eventId")::int AS members
        FROM "EventPage" page
        JOIN "EventPageEvent" link ON link."eventPageId" = page.id
        WHERE link."eventId" = ANY($1::text[])
        GROUP BY page.id
      )
      SELECT count(*)::int AS pages,
        count(*) FILTER (WHERE status = 'DRAFT' AND "isIndexable" IS FALSE AND "publishedAt" IS NULL)::int AS private_drafts,
        count(*) FILTER (WHERE "isIndexable" IS TRUE OR "publishedAt" IS NOT NULL)::int AS unexpectedly_public,
        count(*) FILTER (WHERE "canonicalPath" IS NOT NULL)::int AS canonical_overrides,
        count(*) FILTER (WHERE members <> 1)::int AS membership_mismatches,
        count(*) FILTER (WHERE "tourGroupId" IS NOT NULL)::int AS grouped_pages,
        count(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM "EventPageRoute" route
          WHERE route."eventPageId" = selected_pages.id AND route.kind = 'CANDIDATE'
            AND route.path = '/events/' || selected_pages.slug
        ))::int AS candidate_routes
      FROM selected_pages
    `, [eventIds]);
    counts.verification = verification.rows[0];
    console.log(JSON.stringify(counts));
  }
} finally {
  await db.close?.();
}

function readSimpleCandidateIds(csvText) {
  const rows = parseCsv(csvText);
  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.trim());
  const idIndex = headers.indexOf('event_id');
  const triageIndex = headers.indexOf('triage');
  if (idIndex < 0 || triageIndex < 0) throw new Error('Candidate CSV must include event_id and triage columns');
  const ids = rows.slice(1)
    .filter((row) => row[triageIndex] === 'SIMPLE_CANDIDATE')
    .map((row) => String(row[idIndex] || '').trim())
    .filter(Boolean);
  if (new Set(ids).size !== ids.length) throw new Error('Candidate CSV contains duplicate Event IDs');
  return ids;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field.length === 0) quoted = true;
    else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field);
      field = '';
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
    } else field += char;
  }
  if (quoted) throw new Error('Unterminated quoted field in candidate CSV');
  if (field.length || row.length) {
    row.push(field);
    if (row.some((value) => value !== '')) rows.push(row);
  }
  return rows;
}
