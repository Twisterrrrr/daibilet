import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { resolveCityTimeZone } = await import(pathToFileURL(path.join(root, 'apps/backend/src/city-timezone.js')).href);
const inputPath = process.argv[2] || path.join(root, 'data/ticketscloud/editorial/newyear-eventpage-selection-150-2026-11-24.json');
const outputPath = process.argv[3] || path.join(root, 'data/ticketscloud/editorial/newyear-eventpage-source-archive-150-2026-11-24.json');
await import(pathToFileURL(path.join(root, 'apps/backend/src/bootstrap-env.js')).href);
const { createDb } = await import(pathToFileURL(path.join(root, 'apps/backend/src/db.js')).href);
const db = createDb(root);
const selected = JSON.parse(fs.readFileSync(inputPath, 'utf8')).batches.flat();
try {
  const identity = await db.query('SELECT current_database() AS database');
  if (identity.rows[0]?.database !== 'daibilet') throw new Error('Refusing non-production database');
  const pageRows = await db.query(`
    SELECT page.id, page.slug, page.title, page.summary, page."heroImageUrl", page.content,
      page."seoH1", page."seoTitle", page."seoDescription", page."canonicalPath",
      page.status, page."isIndexable", page."publishedAt", page."tourGroupId",
      COALESCE((SELECT jsonb_agg(jsonb_build_object('eventId', link."eventId", 'position', link.position,
        'role', link.role, 'sourceSnapshot', link."sourceSnapshot") ORDER BY link.position)
        FROM "EventPageEvent" link WHERE link."eventPageId" = page.id), '[]'::jsonb) AS links,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('path', route.path, 'kind', route.kind, 'source', route.source)
        ORDER BY route.path) FROM "EventPageRoute" route WHERE route."eventPageId" = page.id), '[]'::jsonb) AS routes,
      (SELECT count(*)::int FROM "EventPageRevision" revision WHERE revision."eventPageId" = page.id) AS "revisionCount"
    FROM "EventPage" page WHERE page.id = ANY($1::text[]) ORDER BY page.slug
  `, [selected.map((row) => row.eventPageId)]);
  if (pageRows.rows.length !== selected.length) throw new Error(`Expected ${selected.length} pages, found ${pageRows.rows.length}`);
  const eventIds = [...new Set(pageRows.rows.flatMap((page) => page.links.map((link) => link.eventId)))];
  const eventRows = await db.query(`
    SELECT event.id, event.title, event.slug, event.description, event.kind, event."ageLimit", event.status,
      event."primaryCityId", city.title AS city, venue.title AS venue, venue.address,
      event_override."description" AS "overrideDescription", event_override."shortDescription",
      event_override."mergeGroupKey",
      COALESCE(supplier.title, source_rows.supplier_names, '') AS supplier,
      COALESCE(source_rows.sources, '[]'::jsonb) AS sources,
      COALESCE(session_rows.sessions, '[]'::jsonb) AS sessions,
      COALESCE(offer_rows.offers, '[]'::jsonb) AS offers
    FROM "Event" event
    LEFT JOIN "City" city ON city.id = event."primaryCityId"
    LEFT JOIN "Venue" venue ON venue.id = event."venueId"
    LEFT JOIN "EventOverride" event_override ON event_override."eventId" = event.id
    LEFT JOIN "Supplier" supplier ON supplier.id = COALESCE(event."supplierId", (
      SELECT se."supplierId" FROM "SupplierEvent" se WHERE se."eventId" = event.id AND se."isActive" IS TRUE
      ORDER BY se."isPrimary" DESC, se."createdAt" ASC LIMIT 1
    ))
    LEFT JOIN LATERAL (
      SELECT string_agg(DISTINCT s.name, ', ' ORDER BY s.name) AS supplier_names,
        jsonb_agg(jsonb_build_object('code', s.code, 'name', s.name, 'externalId', esl."externalId",
          'metaExternalId', esl."metaExternalId") ORDER BY s.code, esl."externalId") AS sources
      FROM "EventSourceLink" esl JOIN "Source" s ON s.id = esl."sourceId" WHERE esl."eventId" = event.id
    ) source_rows ON true
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(jsonb_build_object('startsAt', session."startsAt", 'endsAt', session."endsAt",
        'isActive', session."isActive", 'sourceStatus', session."sourceStatus", 'cancelledAt', session."cancelledAt",
        'archivedAt', session."archivedAt") ORDER BY session."startsAt") AS sessions
      FROM "EventSession" session WHERE session."eventId" = event.id
    ) session_rows ON true
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(jsonb_build_object('title', offer.title, 'priceRub', offer."priceRub", 'active', offer.active)
        ORDER BY offer."priceRub") AS offers
      FROM "EventOffer" offer WHERE offer."eventId" = event.id
    ) offer_rows ON true
    WHERE event.id = ANY($1::text[]) ORDER BY event.id
  `, [eventIds]);
  if (eventRows.rows.length !== eventIds.length) throw new Error(`Event source archive mismatch: expected ${eventIds.length}, got ${eventRows.rows.length}`);
  const sourceById = new Map(eventRows.rows.map((event) => [event.id, { ...event,
    cityTimeZone: resolveCityTimeZone(event.city) }]));
  const pageById = new Map(pageRows.rows.map((page) => [page.id, page]));
  for (const row of selected) {
    const page = pageById.get(row.eventPageId);
    if (!page || page.slug !== row.slug || page.status !== 'DRAFT' || page.isIndexable !== false || page.publishedAt
      || page.content?.activeEditorialText?.status === 'ACTIVE_EDITORIAL_REWRITE'
      || !page.links.some((link) => link.eventId === row.eventId)) {
      throw new Error(`Source page changed or mapping mismatch: ${row.slug}`);
    }
  }
  const output = { generatedAt: new Date().toISOString(), database: 'daibilet', selectedPages: selected.length,
    linkedEvents: eventIds.length, pages: selected.map((row) => ({ batch: row.batch, sequence: row.sequence,
      selectionReason: row.selectionReason, sourceChars: row.sourceChars, eventPage: pageById.get(row.eventPageId),
      events: pageById.get(row.eventPageId).links.map((link) => ({ ...link, source: sourceById.get(link.eventId) })) })) };
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  process.stdout.write(JSON.stringify({ selectedPages: selected.length, linkedEvents: eventIds.length,
    pagesAlreadyRewritten: 0, allPagesDraftAndNonIndexable: true, output: path.basename(outputPath) }));
} finally {
  await db.close();
}
