import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = process.cwd();
const mainRepo = path.resolve(root, '..', '..', 'daibilet');
const out = path.join(root, 'data/ticketscloud/editorial/eventpage-next-five-batches-source-archive-2026-11-17.json');
const env = fs.readFileSync(path.join(mainRepo, '.env'), 'utf8');
const raw = env.match(/^DATABASE_URL=(.*)$/mu)?.[1]?.trim().replace(/^['"]|['"]$/gu, '');
if (!raw) throw new Error('DATABASE_URL is missing from main checkout');
const url = new URL(raw); url.hostname = '127.0.0.1'; url.port = '5433'; url.pathname = '/daibilet';
if (url.hostname !== '127.0.0.1' || url.port !== '5433' || url.pathname !== '/daibilet') throw new Error('Refusing any DB target except production SSH tunnel 127.0.0.1:5433/daibilet');
const { Pool } = createRequire(path.join(mainRepo, 'packages/db/package.json'))('pg');
const pool = new Pool({ connectionString: url.toString(), max: 1 });

try {
  await pool.query('BEGIN READ ONLY');
  await pool.query('SET LOCAL max_parallel_workers_per_gather = 0');
  await pool.query('SET LOCAL enable_parallel_hash = off');
  const syncs = (await pool.query(`
    SELECT s.id AS "sourceId", s.code AS source, r.id AS "syncRunId", r.mode,
      r."startedAt" AS "syncStartedAt", r."finishedAt" AS "syncFinishedAt", r.stats
    FROM "Source" s JOIN "SourceSyncRun" r ON r."sourceId"=s.id
    WHERE r.status='SUCCESS' AND ((s.code='TICKETSCLOUD' AND r.mode='catalog JSON upsert import')
      OR (s.code='TEPLOHOD' AND r.mode='fixture compact JSON import'))
      AND r."finishedAt"=(SELECT max(r2."finishedAt") FROM "SourceSyncRun" r2 WHERE r2."sourceId"=s.id AND r2.status='SUCCESS' AND r2.mode=r.mode)
  `)).rows;
  if (syncs.length !== 2) throw new Error(`Expected latest successful catalog sync for TC and TEP; got ${syncs.length}`);
  const fresh = (await pool.query(`
    SELECT DISTINCT pl."eventId", pl."sourceId"
    FROM "ProviderLink" pl JOIN "Event" e ON e.id=pl."eventId"
    JOIN "SourceSyncRun" r ON r."sourceId"=pl."sourceId" AND r.status='SUCCESS'
    JOIN "Source" s ON s.id=r."sourceId"
    WHERE pl."eventId" IS NOT NULL
      AND ((s.code='TICKETSCLOUD' AND r.mode='catalog JSON upsert import')
        OR (s.code='TEPLOHOD' AND r.mode='fixture compact JSON import'))
      AND e."createdAt">=r."startedAt"
      AND r."finishedAt"=(SELECT max(r2."finishedAt") FROM "SourceSyncRun" r2 WHERE r2."sourceId"=s.id AND r2.status='SUCCESS' AND r2.mode=r.mode)
  `)).rows;
  const freshKeys = new Set(fresh.map((row) => `${row.sourceId}:${row.eventId}`));
  const freshPageRows = (await pool.query(`
    WITH latest AS (
      SELECT s.id,s.code,max(r."startedAt") AS started
      FROM "Source" s JOIN "SourceSyncRun" r ON r."sourceId"=s.id
      WHERE r.status='SUCCESS' AND ((s.code='TICKETSCLOUD' AND r.mode='catalog JSON upsert import')
        OR (s.code='TEPLOHOD' AND r.mode='fixture compact JSON import'))
      GROUP BY s.id,s.code
    ), fresh AS (
      SELECT DISTINCT pl."eventId",l.id AS "sourceId",l.code AS source
      FROM "ProviderLink" pl JOIN latest l ON l.id=pl."sourceId" JOIN "Event" e ON e.id=pl."eventId"
      WHERE e."createdAt">=l.started AND pl."eventId" IS NOT NULL
    ), saleable AS (
      SELECT e.id,
        count(DISTINCT s.id) FILTER (WHERE s."isActive" AND s."cancelledAt" IS NULL AND s."archivedAt" IS NULL AND s."startsAt">=now() AND o.id IS NOT NULL)::int AS slots,
        count(DISTINCT e.id) FILTER (WHERE e.kind='OPEN_DATE' AND o.id IS NOT NULL AND (e."openDateValidFrom" IS NULL OR e."openDateValidFrom"<=now()) AND (e."openDateValidTo" IS NULL OR e."openDateValidTo">=now()))::int AS open_events,
        min(s."startsAt") FILTER (WHERE s."isActive" AND s."cancelledAt" IS NULL AND s."archivedAt" IS NULL AND s."startsAt">=now() AND o.id IS NOT NULL) AS next_slot
      FROM "Event" e LEFT JOIN "EventSession" s ON s."eventId"=e.id
      LEFT JOIN "EventOffer" o ON o."eventId"=e.id AND o.active=true
      WHERE e.status='READY' GROUP BY e.id
    )
    SELECT p.id,p.slug,p.title,p.summary,p."heroImageUrl",p."seoH1",p."seoTitle",p."seoDescription",p."canonicalPath",p.status,p."isIndexable",p."publishedAt",p."tourGroupId",p.content,
      string_agg(DISTINCT f.source::text,',' ORDER BY f.source::text) AS sources,
      count(DISTINCT l."eventId")::int AS linked_events,
      count(DISTINCT f."eventId")::int AS fresh_linked_events,
      sum(s.slots)::int AS future_saleable_slots,
      bool_or(s.open_events>0) AS has_open_date_offer,
      min(s.next_slot) AS next_saleable_slot
    FROM "EventPage" p JOIN "EventPageEvent" l ON l."eventPageId"=p.id
    JOIN "Event" e ON e.id=l."eventId" JOIN fresh f ON f."eventId"=e.id
    JOIN saleable s ON s.id=e.id
    WHERE p.content::text NOT LIKE '%ACTIVE_EDITORIAL_REWRITE%'
      AND coalesce(p."tourGroupId",'')=''
      AND p.status IN ('DRAFT','READY')
    GROUP BY p.id
    HAVING sum(s.slots)>0 OR bool_or(s.open_events>0)
    ORDER BY min(s.next_slot) NULLS LAST,p.title
  `)).rows;
  const backlogRows = (await pool.query(`
    WITH inventory AS (
      SELECT e.id,
        count(DISTINCT s.id) FILTER (WHERE s."isActive" AND s."cancelledAt" IS NULL AND s."archivedAt" IS NULL AND s."startsAt">=now() AND o.id IS NOT NULL)::int AS slots,
        count(DISTINCT e.id) FILTER (WHERE e.kind='OPEN_DATE' AND o.id IS NOT NULL AND (e."openDateValidFrom" IS NULL OR e."openDateValidFrom"<=now()) AND (e."openDateValidTo" IS NULL OR e."openDateValidTo">=now()))::int AS open_events,
        min(s."startsAt") FILTER (WHERE s."isActive" AND s."cancelledAt" IS NULL AND s."archivedAt" IS NULL AND s."startsAt">=now() AND o.id IS NOT NULL) AS next_slot
      FROM "Event" e LEFT JOIN "EventSession" s ON s."eventId"=e.id
      LEFT JOIN "EventOffer" o ON o."eventId"=e.id AND o.active=true
      WHERE e.status='READY' GROUP BY e.id
    )
    SELECT p.id,p.slug,p.title,p.summary,p."heroImageUrl",p."seoH1",p."seoTitle",p."seoDescription",p."canonicalPath",p.status,p."isIndexable",p."publishedAt",p."tourGroupId",p.content,
      count(DISTINCT l."eventId")::int AS linked_events,
      0::int AS fresh_linked_events,
      sum(i.slots)::int AS future_saleable_slots,
      bool_or(i.open_events>0) AS has_open_date_offer,
      min(i.next_slot) AS next_saleable_slot
    FROM "EventPage" p JOIN "EventPageEvent" l ON l."eventPageId"=p.id
    JOIN "Event" e ON e.id=l."eventId" JOIN inventory i ON i.id=e.id
    WHERE p.content::text NOT LIKE '%ACTIVE_EDITORIAL_REWRITE%'
      AND coalesce(p."tourGroupId",'')=''
      AND p.status IN ('DRAFT','READY')
      AND p.id<>ALL($1::text[])
    GROUP BY p.id
    HAVING sum(i.slots)>0 OR bool_or(i.open_events>0)
    ORDER BY min(i.next_slot) NULLS LAST,p.title
    LIMIT 500
  `,[freshPageRows.map((row) => row.id)])).rows;
  const pageRows = [...freshPageRows, ...backlogRows];
  const pageIds = pageRows.map((row) => row.id);
  const eventRows = pageIds.length ? (await pool.query(`
    SELECT l."eventPageId",l.position,l.role,e.id AS "eventId",e.title,e.description,e.kind,e.status,e."sourceStatus",e."ageLimit",e."imageUrl",e."priceFromRub",e."primaryCityId",c.title AS city,
      e."venueId",v.title AS venue,v.address AS "venueAddress",cat.title AS category,sub.title AS subcategory,
      ov.description AS "overrideDescription",ov.title AS "overrideTitle",ov."shortDescription",ov."imageUrl" AS "overrideImageUrl",ov."mergeGroupKey",
      array_remove(array_agg(DISTINCT src.code::text),NULL) AS "sourceCodes",
      array_remove(array_agg(DISTINCT pl."externalId"),NULL) AS "providerExternalIds",
      array_remove(array_agg(DISTINCT pl."sourceUrl"),NULL) AS "providerUrls",
      COALESCE((SELECT jsonb_agg(jsonb_build_object('id',ss.id,'startsAt',ss."startsAt",'endsAt',ss."endsAt",'isActive',ss."isActive",'archivedAt',ss."archivedAt",'cancelledAt',ss."cancelledAt") ORDER BY ss."startsAt") FROM "EventSession" ss WHERE ss."eventId"=e.id AND ss."startsAt">=now() AND ss."isActive" AND ss."archivedAt" IS NULL AND ss."cancelledAt" IS NULL),'[]'::jsonb) AS sessions,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('id',oo.id,'title',oo.title,'priceRub',oo."priceRub",'active',oo.active,'widgetUrl',oo."widgetUrl") ORDER BY oo."priceRub") FROM "EventOffer" oo WHERE oo."eventId"=e.id AND oo.active),'[]'::jsonb) AS offers
    FROM "EventPageEvent" l JOIN "Event" e ON e.id=l."eventId"
    LEFT JOIN "City" c ON c.id=e."primaryCityId" LEFT JOIN "Venue" v ON v.id=e."venueId"
    LEFT JOIN "Category" cat ON cat.id=e."categoryId" LEFT JOIN "Subcategory" sub ON sub.id=e."primarySubcategoryId"
    LEFT JOIN "EventOverride" ov ON ov."eventId"=e.id
    LEFT JOIN "ProviderLink" pl ON pl."eventId"=e.id
    LEFT JOIN "Source" src ON src.id=pl."sourceId"
    WHERE l."eventPageId"=ANY($1::text[])
    GROUP BY l."eventPageId",l.position,l.role,e.id,c.title,v.title,v.address,cat.title,sub.title,ov.description,ov.title,ov."shortDescription",ov."imageUrl",ov."mergeGroupKey"
    ORDER BY l."eventPageId",l.position,e.id
  `,[pageIds])).rows : [];
  const eventsByPage = new Map();
  for (const event of eventRows) {
    if (!eventsByPage.has(event.eventPageId)) eventsByPage.set(event.eventPageId, []);
    eventsByPage.get(event.eventPageId).push(event);
  }
  const candidates = pageRows.map((page) => ({ ...page, events: eventsByPage.get(page.id) || [] }));
  const sourceCounts = Object.fromEntries(['TICKETSCLOUD','TEPLOHOD'].map((source) => [source, fresh.filter((row) => syncs.find((s) => s.source === source)?.sourceId === row.sourceId).length]));
  const archive = {
    database: 'daibilet',
    capturedAt: new Date().toISOString(),
    syncs,
    newProviderEvents: sourceCounts,
    freshEventPageCandidates: freshPageRows.length,
    saleableBacklogCandidates: backlogRows.length,
    candidates,
  };
  fs.writeFileSync(out, JSON.stringify(archive, null, 2) + '\n');
  await pool.query('COMMIT');
  process.stdout.write(JSON.stringify({ output: out, capturedAt: archive.capturedAt, syncs: syncs.map(({ source, mode, syncStartedAt, syncFinishedAt, stats }) => ({ source, mode, syncStartedAt, syncFinishedAt, newEvents: stats?.newEvents ?? stats?.importedEvents ?? null })), newProviderEvents: sourceCounts, freshEventPageCandidates: freshPageRows.length, saleableBacklogCandidates: backlogRows.length }, null, 2));
} catch (error) {
  try { await pool.query('ROLLBACK'); } catch {}
  throw error;
} finally { await pool.end(); }
