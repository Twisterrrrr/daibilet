import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const editorialDir = path.join(root, 'data/ticketscloud/editorial');
const candidatesPath = path.join(editorialDir, 'newyear-eventpage-remaining-selection-2026-11-25.json');
const outputPath = path.join(editorialDir, 'newyear-eventpage-remaining-live-audit-2026-11-25.json');
await import(pathToFileURL(path.join(root, 'apps/backend/src/bootstrap-env.js')).href);
const url = new URL(process.env.DATABASE_URL || '');
if (url.pathname.endsWith('/daibilet_baseline') && process.env.ALLOW_PRODUCTION_SSH_TUNNEL === '1') {
  url.pathname = '/daibilet';
  url.port = '5433';
  process.env.DATABASE_URL = url.toString();
}
const { createDb } = await import(pathToFileURL(path.join(root, 'apps/backend/src/db.js')).href);
const candidates = JSON.parse(fs.readFileSync(candidatesPath, 'utf8')).pages;
if (candidates.length !== 64 || new Set(candidates.map((page) => page.id)).size !== 64) {
  throw new Error(`Expected 64 unique pages, got ${candidates.length}`);
}
const db = createDb(root);
try {
  const identity = await db.query('SELECT current_database() AS database, now() AS "checkedAt"');
  if (identity.rows[0]?.database !== 'daibilet') throw new Error('Refusing to audit a non-production database');
  const pages = await db.query(`
    SELECT page.id, page.slug, page.title, page.summary, page.content,
      page.status, page."isIndexable", page."publishedAt", page."tourGroupId",
      page."seoH1", page."seoTitle", page."seoDescription", page."canonicalPath",
      COALESCE((SELECT jsonb_agg(jsonb_build_object('eventId', link."eventId", 'position', link.position,
        'role', link.role, 'sourceSnapshot', link."sourceSnapshot") ORDER BY link.position, link."createdAt")
        FROM "EventPageEvent" link WHERE link."eventPageId" = page.id), '[]'::jsonb) AS links,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('id', route.id, 'path', route.path, 'kind', route.kind,
        'source', route.source) ORDER BY route.path) FROM "EventPageRoute" route WHERE route."eventPageId" = page.id), '[]'::jsonb) AS routes,
      (SELECT count(*)::int FROM "EventPageRevision" revision WHERE revision."eventPageId" = page.id) AS "revisionCount"
    FROM "EventPage" page WHERE page.id = ANY($1::text[]) ORDER BY page.slug
  `, [candidates.map((page) => page.id)]);
  if (pages.rows.length !== 64) throw new Error(`Expected 64 EventPages, got ${pages.rows.length}`);
  const linkedEventIds = [...new Set(pages.rows.flatMap((page) => page.links.map((link) => String(link.eventId))))];
  const events = await db.query(`
    SELECT event.id, event.title, event.slug, event.description, event.kind, event."ageLimit", event.status,
      city.title AS city, venue.title AS venue, venue.address,
      event_override."description" AS "overrideDescription", event_override."shortDescription", event_override."mergeGroupKey",
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
  `, [linkedEventIds]);
  if (events.rows.length !== linkedEventIds.length) throw new Error(`Linked Event count mismatch ${events.rows.length}/${linkedEventIds.length}`);
  const pageById = new Map(pages.rows.map((page) => [page.id, page]));
  const eventById = new Map(events.rows.map((event) => [event.id, event]));
  const audited = candidates.map((candidate) => {
    const page = pageById.get(candidate.id);
    if (!page || page.slug !== candidate.slug) throw new Error(`Page mapping changed: ${candidate.slug}`);
    const pageEvents = page.links.map((link) => eventById.get(String(link.eventId))).filter(Boolean);
    const active = (event) => (event.sessions || []).some((session) => session.isActive !== false
      && session.cancelledAt == null && session.archivedAt == null && new Date(session.startsAt) >= new Date(identity.rows[0].checkedAt)
      && !['widget_blocked','paused','suspended','stopped','cancelled','canceled','draft','hidden','stand_by','closed','sales_closed','sale_closed','not_for_sale'].includes(String(session.sourceStatus || '').toLowerCase()));
    const activeEvents = pageEvents.filter((event) => active(event) && (event.offers || []).some((offer) => offer.active === true));
    return { ...candidate, page, events: pageEvents,
      liveStatus: { status: page.status, isIndexable: page.isIndexable, publishedAt: page.publishedAt,
        hasActiveFutureSessionsAndOffers: activeEvents.length > 0,
        activeLinkedEventIds: activeEvents.map((event) => event.id),
        activeSlotCount: pageEvents.reduce((sum, event) => sum + (event.sessions || []).filter(active).length, 0),
        activeOfferCount: pageEvents.reduce((sum, event) => sum + (event.offers || []).filter((offer) => offer.active === true).length, 0) } };
  });
  const output = { generatedAt: identity.rows[0].checkedAt, database: 'daibilet', pages: audited };
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  process.stdout.write(JSON.stringify({ checkedAt: output.generatedAt, pages: audited.length, linkedEventIds: linkedEventIds.length,
    drafts: audited.filter((page) => page.page.status === 'DRAFT').length,
    pagesWithActiveOffers: audited.filter((page) => page.liveStatus.hasActiveFutureSessionsAndOffers).length,
    pagesChangedSinceSelection: audited.filter((page) => page.page.content?.activeEditorialText?.status === 'ACTIVE_EDITORIAL_REWRITE').length,
    output: path.basename(outputPath) }, null, 2));
} finally {
  await db.close();
}
