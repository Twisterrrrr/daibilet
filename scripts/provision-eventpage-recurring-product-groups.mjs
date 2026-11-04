import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const apply = process.argv.includes('--apply');
const production = process.argv.includes('--production');
const expectedGroupsArg = process.argv.find((arg) => arg.startsWith('--expected-groups='));
const expectedEventsArg = process.argv.find((arg) => arg.startsWith('--expected-eventids='));
const expectedGroups = expectedGroupsArg ? Number(expectedGroupsArg.split('=')[1]) : null;
const expectedEventIds = expectedEventsArg ? Number(expectedEventsArg.split('=')[1]) : null;
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inputPath = path.resolve(process.env.EVENTPAGE_RECURRING_WRITE_CANDIDATES_CSV
  || path.join(repoRoot, 'docs/eventpage-recurring-write-candidates-2026-11-04.csv'));
const appRoot = process.env.EVENTPAGE_APP_ROOT || repoRoot;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error('DATABASE_URL must be provided explicitly');
const database = new URL(databaseUrl);
if (production && (database.hostname !== '127.0.0.1' || database.port !== '5437' || database.pathname !== '/daibilet')) {
  throw new Error(`Production mode refused unexpected database target: ${database.hostname}:${database.port}${database.pathname}`);
}
if (apply && (!production || !Number.isInteger(expectedGroups) || !Number.isInteger(expectedEventIds))) {
  throw new Error('Writes require --apply --production --expected-groups=N --expected-eventids=N');
}

const rows = parseCsv(readFileSync(inputPath, 'utf8'));
const headers = rows.shift()?.map((value) => value.trim().replace(/^\uFEFF/u, '')) || [];
const col = (row, name) => row[headers.indexOf(name)] ?? '';
const candidates = rows.filter((row) => row.some(Boolean)).map((row) => ({
  action: col(row, 'write_action').trim(),
  parentId: col(row, 'source_parent_id').trim(),
  cityId: col(row, 'city_id').trim(),
  city: col(row, 'city').trim(),
  productKey: col(row, 'product_key').trim(),
  targetPageId: col(row, 'target_eventpage_id').trim(),
  targetPageSlug: col(row, 'target_eventpage_slug').trim(),
  representativeEventId: col(row, 'representative_event_id').trim(),
  eventTitle: col(row, 'event_title').trim(),
  eventIds: col(row, 'event_ids').split('|').map((value) => value.trim()).filter(Boolean),
  basis: col(row, 'basis').trim(),
}));

if (!candidates.length || candidates.some((item) => !item.action || !item.cityId || !item.eventIds.length
  || !item.representativeEventId || !['ATTACH_TO_EXISTING_PAGE', 'OWNER_APPROVED_ATTACH_MULTI_PIER', 'CREATE_RECURRING_PAGE', 'CREATE_OWNER_SEPARATE_PAGE'].includes(item.action))) {
  throw new Error('Candidate file has missing fields or unsupported action');
}
if (expectedGroups != null && candidates.length !== expectedGroups) throw new Error(`Group count changed: expected ${expectedGroups}, found ${candidates.length}`);
const allIds = candidates.flatMap((item) => item.eventIds);
if (new Set(allIds).size !== allIds.length) throw new Error('An Event ID appears in more than one write group');
if (expectedEventIds != null && allIds.length !== expectedEventIds) throw new Error(`EventID count changed: expected ${expectedEventIds}, found ${allIds.length}`);

const { createDb } = await import(pathToFileURL(path.join(appRoot, 'apps/backend/src/db.js')).href);
const { createAdminEventPage, eventPageCandidateSlug, replaceAdminEventPageEvents } = await import(
  pathToFileURL(path.join(appRoot, 'apps/backend/src/event-pages.js')).href,
);
const db = createDb(appRoot);

function normalizedTitle(value) {
  return String(value || '')
    .replace(/^\s*(?:\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?|\d{1,2}\s+[а-яё]+(?:\s+\d{4})?)\s*[/|—–:-]+\s*/iu, '')
    .replace(/(?<!\d)\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?(?!\d)|(?<!\d)\d{1,2}\s+[а-яё]+(?:\s+\d{4})?(?!\w)/giu, ' ')
    .replace(/\(\s*(?:пн|вт|ср|чт|пт|сб|вс|понедельник|вторник|среда|четверг|пятница|суббота|воскресенье)\s*\)/giu, ' ')
    .replace(/[-\s]+(?:[0-9a-f]{24}|[0-9a-f]{32})\s*$/iu, '')
    .toLowerCase().replace(/ё/gu, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/gu, ' ').trim();
}

function normalizedProductKey(value) {
  return String(value || '').replace(/_/gu, ' ');
}

function cleanDisplayTitle(value) {
  return String(value || '')
    .replace(/^\s*(?:\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?|\d{1,2}\s+[а-яё]+(?:\s+\d{4})?)\s*[/|—–:-]+\s*/iu, '')
    .replace(/(?<!\d)\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?(?!\d)|(?<!\d)\d{1,2}\s+[а-яё]+(?:\s+\d{4})?(?!\w)/giu, ' ')
    .replace(/\(\s*(?:пн|вт|ср|чт|пт|сб|вс|понедельник|вторник|среда|четверг|пятница|суббота|воскресенье)\s*\)/giu, ' ')
    .replace(/\s*[|–—-]\s*$/u, '')
    .replace(/\s+/gu, ' ').trim();
}

try {
  const prepared = [];
  const targetPages = new Map();
  for (const candidate of candidates) {
    const live = await db.query(`
      SELECT event.id, event.title, event.slug, event.kind::text AS kind, event.status::text AS status,
        event."primaryCityId" AS city_id,
        (SELECT count(DISTINCT NULLIF(trim(link."metaExternalId"), ''))::int
          FROM "EventSourceLink" link JOIN "Source" source ON source.id=link."sourceId"
          WHERE link."eventId"=event.id AND upper(source.code::text)='TICKETSCLOUD') AS parent_count,
        (SELECT min(trim(link."metaExternalId")) FROM "EventSourceLink" link JOIN "Source" source ON source.id=link."sourceId"
          WHERE link."eventId"=event.id AND upper(source.code::text)='TICKETSCLOUD'
            AND NULLIF(trim(link."metaExternalId"), '') IS NOT NULL) AS parent_id,
        EXISTS (SELECT 1 FROM "EventOffer" offer WHERE offer."eventId"=event.id AND offer.active IS NOT FALSE) AS has_offer,
        EXISTS (SELECT 1 FROM "EventSession" session WHERE session."eventId"=event.id
          AND session."isActive" IS NOT FALSE AND session."archivedAt" IS NULL AND session."cancelledAt" IS NULL
          AND session."startsAt">=now() AND lower(coalesce(session."sourceStatus",'')) NOT IN
            ('widget_blocked','paused','suspended','stopped','cancelled','canceled','draft','hidden','stand_by','closed','sales_closed','sale_closed','not_for_sale')) AS has_future_session,
        (SELECT count(*)::int FROM "EventPageEvent" link WHERE link."eventId"=event.id) AS page_link_count
      FROM "Event" event WHERE event.id=ANY($1::text[])
    `, [candidate.eventIds]);
    if (live.rows.length !== candidate.eventIds.length) throw new Error(`Event set changed for ${candidate.productKey}: selected ${candidate.eventIds.length}, found ${live.rows.length}`);
    for (const row of live.rows) {
      if (row.kind !== 'RECURRING' || row.status !== 'READY' || row.city_id !== candidate.cityId
        || !row.has_offer || !row.has_future_session || row.page_link_count !== 0) {
        throw new Error(`Event no longer matches saleable/unlinked reviewed candidate: ${row.id}; ${JSON.stringify(row)}`);
      }
      if (candidate.action !== 'CREATE_OWNER_SEPARATE_PAGE'
        && (row.parent_count !== 1 || row.parent_id !== candidate.parentId || normalizedTitle(row.title) !== normalizedProductKey(candidate.productKey))) {
        throw new Error(`Product identity changed for ${row.id}: ${JSON.stringify({ parent: row.parent_id, city: row.city_id, titleKey: normalizedTitle(row.title), expected: candidate.productKey })}`);
      }
      if (candidate.action === 'CREATE_OWNER_SEPARATE_PAGE' && row.id !== candidate.representativeEventId) {
        throw new Error(`Owner separate page must contain exactly its named EventID: ${row.id}`);
      }
    }

    let existingEventIds = [];
    if (candidate.action === 'ATTACH_TO_EXISTING_PAGE' || candidate.action === 'OWNER_APPROVED_ATTACH_MULTI_PIER') {
      if (!candidate.targetPageId || !candidate.targetPageSlug) throw new Error(`Target page ID/slug missing for ${candidate.productKey}`);
      const page = await db.query(`SELECT id, slug, status, "isIndexable", "publishedAt", "canonicalPath"
        FROM "EventPage" WHERE id=$1`, [candidate.targetPageId]);
      const pageRow = page.rows[0];
      if (!pageRow || pageRow.slug !== candidate.targetPageSlug || pageRow.status !== 'DRAFT'
        || pageRow.isIndexable !== false || pageRow.publishedAt || pageRow.canonicalPath) {
        throw new Error(`Target page is missing or not a private draft: ${candidate.targetPageId}; ${JSON.stringify(pageRow)}`);
      }
      const owned = await db.query(`SELECT link."eventId", event.title FROM "EventPageEvent" link
        JOIN "Event" event ON event.id=link."eventId" WHERE link."eventPageId"=$1 ORDER BY link.position`, [candidate.targetPageId]);
      existingEventIds = owned.rows.map((row) => row.eventId);
      if (candidate.action === 'ATTACH_TO_EXISTING_PAGE'
        && owned.rows.some((row) => normalizedTitle(row.title) !== normalizedProductKey(candidate.productKey))) {
        throw new Error(`Target draft contains a different product identity: ${candidate.targetPageSlug}`);
      }
      const prior = targetPages.get(candidate.targetPageId);
      if (prior && (prior.productKey !== candidate.productKey || prior.action !== candidate.action)) {
        throw new Error(`Multiple product groups point to one draft page ${candidate.targetPageSlug}`);
      }
      targetPages.set(candidate.targetPageId, { candidate, existingEventIds: [...new Set([...existingEventIds, ...(prior?.existingEventIds || [])])], inferredEventIds: [...(prior?.inferredEventIds || []), ...candidate.eventIds] });
    } else {
      prepared.push({ candidate, live: live.rows });
    }
  }

  const output = { mode: apply ? 'apply' : 'dry-run', database: database.pathname, groups: candidates.length,
    eventIds: allIds.length, attachPages: targetPages.size, newPages: prepared.length,
    attachEventIds: 0,
    inferredExistingPageEventIds: [...targetPages.values()].reduce((sum, item) => sum + item.inferredEventIds.length, 0),
    newPageRepresentativeIds: prepared.length,
    inferredNewPageSiblingEventIds: prepared.reduce((sum, item) => sum + Math.max(0, item.candidate.eventIds.length - 1), 0) };
  if (!apply) {
    console.log(JSON.stringify(output));
    process.exitCode = 0;
  } else {
    output.createdPages = [];
    // Keep EventPageEvent small: it is an explicit set of representative
    // products/purchase options, not a dump of every dated TC slot. Confirmed
    // sibling slots stay in the reviewed matrix and resolve through their
    // provider parent + city only after the public resolver's ambiguity rules
    // are satisfied. The current API intentionally caps each page at 50 links.
    for (const { candidate, live } of prepared) {
      const representative = live.find((row) => row.id === candidate.representativeEventId);
      const pageTitle = candidate.action === 'CREATE_OWNER_SEPARATE_PAGE'
        ? representative.title.trim()
        : cleanDisplayTitle(candidate.eventTitle);
      const slug = eventPageCandidateSlug(`${pageTitle} ${candidate.city}`, '');
      const result = await createAdminEventPage(db, {
        slug,
        title: pageTitle,
        summary: null,
        content: { sections: [] },
        seoH1: pageTitle,
        seoTitle: `${pageTitle} | Дайбилет`,
        seoDescription: null,
        canonicalPath: null,
        eventIds: [candidate.representativeEventId],
        changeNote: `${candidate.basis}; representative EventID only, sibling slots remain in the reviewed product matrix`,
      });
      if (!result || result.status !== 'DRAFT' || result.isIndexable !== false || result.publishedAt || result.canonicalPath) {
        throw new Error(`Post-create page invariant failed: ${candidate.representativeEventId}`);
      }
      output.createdPages.push({ action: candidate.action, id: result.id, slug: result.slug, representativeEventId: candidate.representativeEventId, saleableSiblingEventIds: candidate.eventIds.length });
    }
    const ids = prepared.map(({ candidate }) => candidate.representativeEventId);
    const verification = await db.query(`
      SELECT count(DISTINCT link."eventId")::int AS linked_event_ids,
        count(*) FILTER (WHERE page.status='DRAFT' AND page."isIndexable" IS FALSE
          AND page."publishedAt" IS NULL AND page."canonicalPath" IS NULL)::int AS safe_draft_links,
        count(*) FILTER (WHERE page.status<>'DRAFT' OR page."isIndexable" IS TRUE
          OR page."publishedAt" IS NOT NULL OR page."canonicalPath" IS NOT NULL)::int AS unsafe_links,
        count(*) FILTER (WHERE route.id IS NULL)::int AS missing_candidate_routes
      FROM unnest($1::text[]) selected(event_id)
      JOIN "EventPageEvent" link ON link."eventId"=selected.event_id
      JOIN "EventPage" page ON page.id=link."eventPageId"
      LEFT JOIN "EventPageRoute" route ON route."eventPageId"=page.id AND route.kind='CANDIDATE'
        AND route.path='/events/' || page.slug
    `, [ids]);
    output.verification = verification.rows[0];
    if (output.verification.linked_event_ids !== ids.length || output.verification.safe_draft_links !== ids.length
      || output.verification.unsafe_links !== 0 || output.verification.missing_candidate_routes !== 0) {
      throw new Error(`Post-write verification failed: ${JSON.stringify(output.verification)}`);
    }
    output.existingPageGroupsValidated = targetPages.size;
    output.createdRepresentativeLinks = ids.length;
    console.log(JSON.stringify(output));
  }
} finally {
  await db.close?.();
}

function parseCsv(text) {
  const out = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field.length === 0) quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field); if (row.some((value) => value !== '')) out.push(row); row = []; field = '';
    } else field += ch;
  }
  if (quoted) throw new Error('Unterminated quoted field');
  if (field.length || row.length) { row.push(field); if (row.some((value) => value !== '')) out.push(row); }
  return out;
}
