import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = process.env.DAIBILET_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { resolveCityTimeZone } = await import(pathToFileURL(path.join(root, 'apps/backend/src/city-timezone.js')).href);
const inputPath = process.argv[2] || path.join(root, 'data/ticketscloud/editorial/newyear-eventpage-selection-150-2026-11-24.json');
const outputPath = process.argv[3] || path.join(root, 'data/ticketscloud/editorial/newyear-eventpage-selection-150-live-audit-2026-11-24.json');
await import(pathToFileURL(path.join(root, 'apps/backend/src/bootstrap-env.js')).href);
const { createDb } = await import(pathToFileURL(path.join(root, 'apps/backend/src/db.js')).href);
const db = createDb(root);
const selected = JSON.parse(fs.readFileSync(inputPath, 'utf8')).batches.flat();
try {
  const result = await db.query(`
    SELECT page.id AS "eventPageId", page.slug, page.status, page."isIndexable", page."publishedAt", page."tourGroupId",
      page.content #>> '{activeEditorialText,status}' AS "rewriteStatus",
      link."eventId", event.title AS "eventTitle", event.description,
      city.title AS city, venue.title AS venue, venue.address,
      event."ageLimit", event.kind, event_override."mergeGroupKey",
      COALESCE(supplier.title, source_data.suppliers, '') AS supplier,
      COALESCE(source_data.sources, '[]'::jsonb) AS sources,
      COALESCE(slot_data.active_future_sessions, 0) AS "activeFutureSessions",
      COALESCE(offer_data.active_offers, 0) AS "activeOffers",
      slot_data.next_slot AS "nextSlot"
    FROM "EventPage" page
    JOIN "EventPageEvent" link ON link."eventPageId" = page.id
    JOIN "Event" event ON event.id = link."eventId"
    LEFT JOIN "EventOverride" event_override ON event_override."eventId" = event.id
    LEFT JOIN "City" city ON city.id = event."primaryCityId"
    LEFT JOIN "Venue" venue ON venue.id = event."venueId"
    LEFT JOIN "Supplier" supplier ON supplier.id = COALESCE(event."supplierId", (
      SELECT se."supplierId" FROM "SupplierEvent" se WHERE se."eventId" = event.id AND se."isActive" IS TRUE
      ORDER BY se."isPrimary" DESC, se."createdAt" ASC LIMIT 1
    ))
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(jsonb_build_object('code', s.code, 'name', s.name,
        'externalId', esl."externalId", 'metaExternalId', esl."metaExternalId")
        ORDER BY s.code, esl."externalId") AS sources,
        string_agg(DISTINCT s.name, ', ' ORDER BY s.name) AS suppliers
      FROM "EventSourceLink" esl JOIN "Source" s ON s.id = esl."sourceId"
      WHERE esl."eventId" = event.id
    ) source_data ON true
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS active_future_sessions, min(session."startsAt") AS next_slot
      FROM "EventSession" session WHERE session."eventId" = event.id AND session."isActive" IS NOT FALSE
        AND session."archivedAt" IS NULL AND session."cancelledAt" IS NULL AND session."startsAt" >= now()
        AND lower(coalesce(session."sourceStatus", '')) NOT IN
          ('widget_blocked','paused','suspended','stopped','cancelled','canceled','draft','hidden','stand_by','closed','sales_closed','sale_closed','not_for_sale')
    ) slot_data ON true
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS active_offers FROM "EventOffer" offer
      WHERE offer."eventId" = event.id AND offer.active IS TRUE
    ) offer_data ON true
    WHERE page.id = ANY($1::text[])
    ORDER BY page.id, link.position, event.id
  `, [selected.map((row) => row.eventPageId)]);
  const pages = new Map();
  for (const row of result.rows) {
    const page = pages.get(row.eventPageId) || { eventPageId: row.eventPageId, slug: row.slug, status: row.status,
      isIndexable: row.isIndexable, publishedAt: row.publishedAt, tourGroupId: row.tourGroupId,
      rewriteStatus: row.rewriteStatus, events: [] };
    page.events.push({ eventId: row.eventId, eventTitle: row.eventTitle, description: row.description, city: row.city,
      cityTimeZone: resolveCityTimeZone(row.city),
      venue: row.venue, address: row.address,
      ageLimit: row.ageLimit, kind: row.kind, mergeGroupKey: row.mergeGroupKey, supplier: row.supplier, sources: row.sources,
      activeFutureSessions: row.activeFutureSessions, activeOffers: row.activeOffers, nextSlot: row.nextSlot });
    pages.set(row.eventPageId, page);
  }
  const missing = selected.filter((row) => !pages.has(row.eventPageId));
  if (missing.length) throw new Error(`Missing production EventPage associations: ${missing.length}`);
  for (const row of selected) {
    const page = pages.get(row.eventPageId);
    if (page.slug !== row.slug || page.status !== 'DRAFT' || page.isIndexable !== false || page.publishedAt
      || page.rewriteStatus || !page.events.some((event) => event.eventId === row.eventId)
      || !page.events.some((event) => event.activeFutureSessions > 0 && event.activeOffers > 0)) {
      throw new Error(`Page mapping, draft status, or active sale check failed: ${row.slug}`);
    }
  }
  const output = { checkedAt: new Date().toISOString(), database: 'daibilet', selectedPages: selected.length,
    pages: selected.map((row) => ({ batch: row.batch, sequence: row.sequence, selectionTitle: row.pageTitle,
      selectionCity: row.city, ...pages.get(row.eventPageId) })) };
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  process.stdout.write(JSON.stringify({ selectedPages: selected.length, linkedEventRows: result.rows.length,
    withFutureSessions: new Set(result.rows.filter((row) => row.activeFutureSessions > 0).map((row) => row.eventPageId)).size,
    withActiveOffers: new Set(result.rows.filter((row) => row.activeOffers > 0).map((row) => row.eventPageId)).size,
    exactOneSupplier: result.rows.filter((row) => !String(row.supplier).includes(',')).length,
    output: path.basename(outputPath) }, null, 2));
} finally {
  await db.close();
}
