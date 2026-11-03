import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootDir = path.resolve(process.env.DAIBILET_REPO_ROOT || scriptRoot);
const databaseUrl = process.env.DATABASE_URL;
const production = process.argv.includes('--production');
if (!databaseUrl) throw new Error('DATABASE_URL must be provided explicitly');
const database = new URL(databaseUrl);
if (production && (database.hostname !== '127.0.0.1' || database.port !== '5437' || database.pathname !== '/daibilet')) {
  throw new Error(`Production mode refused unexpected database target: ${database.hostname}:${database.port}${database.pathname}`);
}

const { createDb } = await import(pathToFileURL(path.join(rootDir, 'apps/backend/src/db.js')).href);
const db = createDb(rootDir);
try {
  const eventIds = process.env.EVENT_IDS?.split(',').map((id) => id.trim()).filter(Boolean);
  if (eventIds?.length) {
    const focused = await db.query(`
      SELECT event.id, event.title, upper(coalesce(event.kind::text, 'UNKNOWN')) AS kind,
        upper(coalesce(event.status::text, 'UNKNOWN')) AS status, city.title AS city,
        event."openDateValidTo" AS "openDateValidTo",
        venue.title AS venue, supplier.title AS supplier,
        EXISTS (SELECT 1 FROM "EventOffer" offer WHERE offer."eventId" = event.id AND offer.active IS NOT FALSE) AS "hasActiveOffer",
        count(session.id) FILTER (WHERE session."isActive" IS NOT FALSE AND session."archivedAt" IS NULL
          AND session."cancelledAt" IS NULL AND lower(coalesce(session."sourceStatus", '')) NOT IN
          ('widget_blocked', 'paused', 'suspended', 'stopped', 'cancelled', 'canceled', 'draft', 'hidden', 'stand_by', 'closed', 'sales_closed', 'sale_closed', 'not_for_sale'))::int AS "activeSessions",
        min(session."startsAt") FILTER (WHERE session."isActive" IS NOT FALSE AND session."archivedAt" IS NULL
          AND session."cancelledAt" IS NULL AND session."startsAt" >= now() AND lower(coalesce(session."sourceStatus", '')) NOT IN
          ('widget_blocked', 'paused', 'suspended', 'stopped', 'cancelled', 'canceled', 'draft', 'hidden', 'stand_by', 'closed', 'sales_closed', 'sale_closed', 'not_for_sale')) AS "nextLiveSession",
        (upper(coalesce(event.kind::text, '')) = 'OPEN_DATE'
          AND (event."openDateValidTo" IS NULL OR event."openDateValidTo" >= now())) AS "hasCurrentOpenDate",
        EXISTS (SELECT 1 FROM "EventPageEvent" link WHERE link."eventId" = event.id) AS "alreadyLinked",
        coalesce((SELECT string_agg(DISTINCT NULLIF(trim(source_link."metaExternalId"), ''), ', ')
          FROM "EventSourceLink" source_link WHERE source_link."eventId" = event.id), '') AS "providerParentIds"
      FROM "Event" event
      LEFT JOIN "City" city ON city.id = event."primaryCityId"
      LEFT JOIN "Venue" venue ON venue.id = event."venueId"
      LEFT JOIN "Supplier" supplier ON supplier.id = COALESCE(event."supplierId", (
        SELECT supplier_event."supplierId" FROM "SupplierEvent" supplier_event
        WHERE supplier_event."eventId" = event.id AND supplier_event."isActive" IS TRUE
        ORDER BY supplier_event."isPrimary" DESC, supplier_event."createdAt" ASC LIMIT 1
      ))
      LEFT JOIN "EventSession" session ON session."eventId" = event.id
      WHERE event.id = ANY($1::text[])
      GROUP BY event.id, city.title, venue.title, supplier.title
      ORDER BY event.id
    `, [eventIds]);
    console.log(JSON.stringify({ database: database.pathname, requested: eventIds.length, found: focused.rowCount, events: focused.rows }));
    await db.close?.();
    process.exit(0);
  }
  const result = await db.query(`
    SELECT upper(coalesce(event.kind::text, 'UNKNOWN')) AS kind,
      upper(coalesce(event.status::text, 'UNKNOWN')) AS status,
      count(*)::int AS events,
      count(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM "EventOffer" offer
        WHERE offer."eventId" = event.id AND offer.active IS NOT FALSE
      ))::int AS with_active_offer,
      count(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM "EventOffer" offer
        WHERE offer."eventId" = event.id AND offer.active IS NOT FALSE
      ) AND EXISTS (
        SELECT 1 FROM "EventSession" session
        WHERE session."eventId" = event.id AND session."isActive" IS NOT FALSE
          AND session."archivedAt" IS NULL AND session."cancelledAt" IS NULL
          AND session."startsAt" >= now()
          AND lower(coalesce(session."sourceStatus", '')) NOT IN
            ('widget_blocked', 'paused', 'suspended', 'stopped', 'cancelled', 'canceled', 'draft', 'hidden', 'stand_by', 'closed', 'sales_closed', 'sale_closed', 'not_for_sale')
      ) OR (upper(coalesce(event.kind::text, '')) = 'OPEN_DATE'
        AND (event."openDateValidTo" IS NULL OR event."openDateValidTo" >= now())
        AND EXISTS (SELECT 1 FROM "EventOffer" offer
          WHERE offer."eventId" = event.id AND offer.active IS NOT FALSE)
      ))::int AS live_saleable,
      count(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM "EventPageEvent" link WHERE link."eventId" = event.id
      ))::int AS already_linked,
      count(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM "EventSourceLink" source_link
        WHERE source_link."eventId" = event.id AND NULLIF(trim(source_link."metaExternalId"), '') IS NOT NULL
      ))::int AS with_provider_parent_identity
    FROM "Event" event
    GROUP BY 1, 2
    ORDER BY 1, 2
  `);
  console.log(JSON.stringify({ database: database.pathname, byKindAndStatus: result.rows }));
} finally {
  await db.close?.();
}
