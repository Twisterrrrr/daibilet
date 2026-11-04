import { randomUUID } from 'node:crypto';

const EDITORIAL_STATUSES = new Set(['DRAFT', 'REVIEW', 'READY']);
const ROUTE_KINDS = new Set(['CANDIDATE', 'HISTORICAL', 'CURRENT']);
const MAX_CONTENT_BYTES = 200_000;
const CITY_TRANSLITERATION = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

function citySlug(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized || ['не указан', 'не указано', 'unknown', 'без города'].includes(normalized)) return '';
  return normalized.split('')
    .map((char) => CITY_TRANSLITERATION[char] ?? char).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
}

function transliterateEventSlug(value) {
  return String(value || '').trim().toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .split('').map((char) => CITY_TRANSLITERATION[char] ?? char).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
}

/** Remove only the provider token that is also the Event's internal identity. */
export function eventPageCandidateSlug(eventSlug, eventId) {
  const slug = String(eventSlug || '').trim().toLowerCase();
  const id = String(eventId || '').trim().toLowerCase();
  const identity = id.split('_').at(-1) || '';
  const isRecognizedIdentity = /^[a-f0-9]{24}$/.test(identity) || /^\d+$/.test(identity);
  let withoutIdentity = slug;
  if (isRecognizedIdentity) {
    const providerPrefix = `tc-${identity}-`;
    if (slug.startsWith(providerPrefix)) {
      withoutIdentity = slug.slice(providerPrefix.length);
    } else if (slug.endsWith(`-${identity}`)) {
      withoutIdentity = slug.slice(0, -(identity.length + 1));
    }
  }
  return transliterateEventSlug(withoutIdentity) || transliterateEventSlug(eventId) || 'event';
}

function requiredText(value, field, max = 500) {
  if (typeof value !== 'string') throw new Error(`${field} is required`);
  const result = value.trim();
  if (!result || result.length > max) throw new Error(`${field} must be 1-${max} characters`);
  return result;
}

function optionalText(value, field, max = 2000) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || value.length > max) throw new Error(`${field} must be at most ${max} characters`);
  return value.trim() || null;
}

function normalizeEventProductTitle(value) {
  return String(value || '')
    .replace(/^\s*(?:\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?|\d{1,2}\s+[а-яё]+(?:\s+\d{4})?)\s*[/|—–:-]+\s*/iu, '')
    .replace(/(?<!\d)\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?(?!\d)|(?<!\d)\d{1,2}\s+[а-яё]+(?:\s+\d{4})?(?!\w)/giu, ' ')
    .replace(/\(\s*(?:пн|вт|ср|чт|пт|сб|вс|понедельник|вторник|среда|четверг|пятница|суббота|воскресенье)\s*\)/giu, ' ')
    .replace(/[-\s]+(?:[0-9a-f]{24}|[0-9a-f]{32})\s*$/iu, '')
    .toLocaleLowerCase('ru')
    .replace(/ё/gu, 'е')
    .replace(/[^\p{L}\p{N}_]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

function normalizeSlug(value) {
  const slug = requiredText(value, 'slug', 180).toLowerCase();
  if (!/^[a-z0-9а-яё]+(?:-[a-z0-9а-яё]+)*$/i.test(slug)) throw new Error('slug has invalid format');
  return slug;
}

function normalizeContent(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('content must be an object');
  if (Buffer.byteLength(JSON.stringify(value), 'utf8') > MAX_CONTENT_BYTES) throw new Error('EventPage content is too large');
  return value;
}

function normalizeEventIds(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50) throw new Error('eventIds must contain 1-50 Event ids');
  const ids = value.map((id) => requiredText(id, 'eventId', 120));
  if (new Set(ids).size !== ids.length) throw new Error('eventIds must be unique');
  return ids;
}

function normalizePage(payload, { creating = false } = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid EventPage payload');
  const page = {
    slug: normalizeSlug(payload.slug),
    title: requiredText(payload.title, 'title', 500),
    summary: optionalText(payload.summary, 'summary', 4000),
    content: normalizeContent(payload.content ?? {}),
    seoH1: optionalText(payload.seoH1, 'seoH1', 500),
    seoTitle: optionalText(payload.seoTitle, 'seoTitle', 500),
    seoDescription: optionalText(payload.seoDescription, 'seoDescription', 2000),
    canonicalPath: optionalText(payload.canonicalPath, 'canonicalPath', 1000),
    changeNote: optionalText(payload.changeNote, 'changeNote', 1000),
  };
  if (page.canonicalPath && (!page.canonicalPath.startsWith('/events/') || page.canonicalPath.includes('?') || page.canonicalPath.includes('#'))) {
    throw new Error('canonicalPath must be a path under /events without query or fragment');
  }
  if (creating) page.eventIds = normalizeEventIds(payload.eventIds);
  else if (payload.status != null) {
    if (!EDITORIAL_STATUSES.has(payload.status)) throw new Error('Invalid EventPage status');
    page.status = payload.status;
  }
  return page;
}

function pageSnapshot(page) {
  return {
    slug: page.slug,
    title: page.title,
    summary: page.summary,
    content: page.content,
    seoH1: page.seoH1,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    canonicalPath: page.canonicalPath,
  };
}

async function currentSourceState(query, id) {
  const events = await query(`SELECT "eventId", position, role, "sourceSnapshot" FROM "EventPageEvent" WHERE "eventPageId" = $1 ORDER BY position`, [id]);
  const routes = await query(`SELECT path, kind, source, "createdAt" FROM "EventPageRoute" WHERE "eventPageId" = $1 ORDER BY "createdAt"`, [id]);
  const tourGroup = await query(`SELECT "tourGroupId" FROM "EventPage" WHERE id = $1`, [id]);
  return { events: events.rows, routes: routes.rows, tourGroupId: tourGroup.rows[0]?.tourGroupId ?? null };
}

async function appendPageRevision(query, id, page, { changeNote = null, actorId = null, sourceState = null } = {}) {
  const version = await query(`SELECT COALESCE(MAX(version), 0) + 1 AS version FROM "EventPageRevision" WHERE "eventPageId" = $1`, [id]);
  const snapshot = sourceState ?? await currentSourceState(query, id);
  await query(`
    INSERT INTO "EventPageRevision" (id, "eventPageId", version, content, "sourceSnapshot", "changeNote", "createdBy")
    VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7)
  `, [randomUUID(), id, version.rows[0].version, JSON.stringify(pageSnapshot(page)), JSON.stringify(snapshot), changeNote, actorId]);
}

async function readPage(query, id) {
  const pageResult = await query(`
    SELECT id, slug, title, summary, content, "seoH1", "seoTitle", "seoDescription",
      "canonicalPath", status, "isIndexable", "publishedAt", "tourGroupId", "createdAt", "updatedAt"
    FROM "EventPage" WHERE id = $1
  `, [id]);
  if (!pageResult.rows[0]) return null;
  const tourGroupResult = pageResult.rows[0].tourGroupId
    ? await query(`SELECT id, title FROM "EventTourGroup" WHERE id = $1`, [pageResult.rows[0].tourGroupId])
    : { rows: [] };
  const events = await query(`
      SELECT link.id, link."eventId", link.position, link.role, link."sourceSnapshot", link."createdAt",
        event.title AS "eventTitle", event.slug AS "eventSlug", event.kind AS "eventKind",
        event."primaryCityId", city.title AS "cityTitle", event."venueId",
        venue.title AS "venueTitle", venue.address AS "venueAddress", supplier.title AS "supplierTitle",
        COALESCE(source_data.sources, '[]'::jsonb) AS sources
      FROM "EventPageEvent" link
      JOIN "Event" event ON event.id = link."eventId"
      LEFT JOIN "City" city ON city.id = event."primaryCityId"
      LEFT JOIN "Venue" venue ON venue.id = event."venueId"
      LEFT JOIN "Supplier" supplier ON supplier.id = COALESCE(event."supplierId", (
        SELECT supplier_event."supplierId" FROM "SupplierEvent" supplier_event
        WHERE supplier_event."eventId" = event.id AND supplier_event."isActive" IS TRUE
        ORDER BY supplier_event."isPrimary" DESC, supplier_event."createdAt" ASC LIMIT 1
      ))
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(jsonb_build_object(
          'code', source.code, 'name', source.name,
          'externalId', source_link."externalId", 'metaExternalId', source_link."metaExternalId",
          'sourceUrl', source_link."sourceUrl"
        ) ORDER BY source.code, source_link."externalId") AS sources
        FROM "EventSourceLink" source_link JOIN "Source" source ON source.id = source_link."sourceId"
        WHERE source_link."eventId" = event.id
      ) source_data ON true
      WHERE link."eventPageId" = $1 ORDER BY link.position, link."createdAt"
    `, [id]);
  const reviewCandidates = await query(`
    SELECT DISTINCT candidate_event.id AS "eventId", candidate_event.title AS "eventTitle",
      candidate_event.slug AS "eventSlug", city.title AS "cityTitle",
      venue.title AS "venueTitle", venue.address AS "venueAddress",
      supplier.title AS "supplierTitle", candidate_page.id AS "pageId",
      candidate_page.slug AS "pageSlug", candidate_page.title AS "pageTitle",
      source.code AS "sourceCode", source.name AS "sourceName",
      candidate_link."externalId" AS "externalId", candidate_link."metaExternalId" AS "metaExternalId",
      ((SELECT count(*) FROM "EventPageEvent" owned WHERE owned."eventPageId" = candidate_page.id) > 1
        OR candidate_page.status = 'DRAFT' AND candidate_page."publishedAt" IS NULL
          AND candidate_page."isIndexable" IS FALSE AND candidate_page.summary IS NULL
          AND candidate_page.content = '{"sections":[]}'::jsonb
          AND (SELECT count(*) FROM "EventPageRevision" revision WHERE revision."eventPageId" = candidate_page.id) = 1
          AND (SELECT count(*) FROM "EventPageRoute" route WHERE route."eventPageId" = candidate_page.id) = 1
          AND EXISTS (SELECT 1 FROM "EventPageRoute" route WHERE route."eventPageId" = candidate_page.id
            AND route.kind = 'CANDIDATE' AND route.source = 'event-page-draft'
            AND route.path = '/events/' || candidate_page.slug)
      ) AS "canMove"
    FROM "EventPageEvent" current_link
    JOIN "Event" current_event ON current_event.id = current_link."eventId"
    JOIN "EventSourceLink" current_source_link ON current_source_link."eventId" = current_event.id
    JOIN "Source" source ON source.id = current_source_link."sourceId"
    JOIN "EventSourceLink" candidate_link ON candidate_link."sourceId" = current_source_link."sourceId"
      AND trim(candidate_link."metaExternalId") = trim(current_source_link."metaExternalId")
      AND candidate_link."eventId" <> current_event.id
    JOIN "Event" candidate_event ON candidate_event.id = candidate_link."eventId"
      AND candidate_event."primaryCityId" = current_event."primaryCityId"
    JOIN "EventPageEvent" candidate_event_link ON candidate_event_link."eventId" = candidate_event.id
    JOIN "EventPage" candidate_page ON candidate_page.id = candidate_event_link."eventPageId"
    LEFT JOIN "City" city ON city.id = candidate_event."primaryCityId"
    LEFT JOIN "Venue" venue ON venue.id = candidate_event."venueId"
    LEFT JOIN "Supplier" supplier ON supplier.id = COALESCE(candidate_event."supplierId", (
      SELECT supplier_event."supplierId" FROM "SupplierEvent" supplier_event
      WHERE supplier_event."eventId" = candidate_event.id AND supplier_event."isActive" IS TRUE
      ORDER BY supplier_event."isPrimary" DESC, supplier_event."createdAt" ASC LIMIT 1
    ))
    WHERE current_link."eventPageId" = $1 AND candidate_page.id <> $1
      AND upper(source.code::text) = 'TICKETSCLOUD'
      AND NULLIF(trim(current_source_link."metaExternalId"), '') IS NOT NULL
    ORDER BY candidate_page.title, candidate_event.title, candidate_event.id
    LIMIT 100
  `, [id]);
  const routes = await query(`SELECT id, path, kind, source, "createdAt" FROM "EventPageRoute" WHERE "eventPageId" = $1 ORDER BY "createdAt"`, [id]);
  const revisions = await query(`SELECT id, version, content, "sourceSnapshot", "changeNote", "createdBy", "createdAt" FROM "EventPageRevision" WHERE "eventPageId" = $1 ORDER BY version DESC`, [id]);
  return {
    ...pageResult.rows[0],
    tourGroup: tourGroupResult.rows[0] || null,
    events: events.rows,
    reviewCandidates: reviewCandidates.rows,
    routes: routes.rows,
    revisions: revisions.rows,
  };
}

export async function listAdminEventTourGroups(db) {
  const result = await db.query(`
    SELECT group_row.id, group_row.title, count(page.id)::int AS "pageCount",
      count(page.id) FILTER (WHERE page.status = 'READY' AND page."publishedAt" IS NOT NULL)::int AS "publishedPageCount"
    FROM "EventTourGroup" group_row
    LEFT JOIN "EventPage" page ON page."tourGroupId" = group_row.id
    GROUP BY group_row.id, group_row.title
    ORDER BY lower(group_row.title), group_row.id
  `);
  return result.rows;
}

export async function createAdminEventTourGroup(db, payload) {
  const title = requiredText(payload?.title, 'title', 160);
  const id = randomUUID();
  const result = await db.query(`
    INSERT INTO "EventTourGroup" (id, title, "updatedAt") VALUES ($1, $2, now())
    RETURNING id, title, 0::int AS "pageCount", 0::int AS "publishedPageCount"
  `, [id, title]);
  return result.rows[0];
}

/** Assign one local EventPage to a confirmed tour group; never merges pages or Events. */
export async function assignAdminEventPageTourGroup(db, pageId, rawTourGroupId) {
  const tourGroupId = rawTourGroupId == null || rawTourGroupId === ''
    ? null
    : requiredText(rawTourGroupId, 'tourGroupId', 100);
  return db.transaction(async ({ query }) => {
    const pageResult = await query(`SELECT id, "tourGroupId" FROM "EventPage" WHERE id = $1 FOR UPDATE`, [pageId]);
    const page = pageResult.rows[0];
    if (!page) return null;
    if (tourGroupId) {
      const group = await query(`SELECT id FROM "EventTourGroup" WHERE id = $1 FOR UPDATE`, [tourGroupId]);
      if (!group.rows[0]) throw new Error('Tour group not found');
      const cities = await query(`
        SELECT DISTINCT event."primaryCityId" AS "cityId"
        FROM "EventPageEvent" link JOIN "Event" event ON event.id = link."eventId"
        WHERE link."eventPageId" = $1
      `, [pageId]);
      if (cities.rows.length !== 1 || !cities.rows[0].cityId) {
        throw new Error('A tour group can contain only local EventPages with exactly one known city');
      }
      const duplicateCity = await query(`
        SELECT other_page.id
        FROM "EventPage" other_page
        JOIN "EventPageEvent" other_link ON other_link."eventPageId" = other_page.id
        JOIN "Event" other_event ON other_event.id = other_link."eventId"
        WHERE other_page."tourGroupId" = $1 AND other_page.id <> $2
          AND other_event."primaryCityId" = $3
        LIMIT 1
      `, [tourGroupId, pageId, cities.rows[0].cityId]);
      if (duplicateCity.rows[0]) throw new Error('This tour group already has an EventPage for this city');
    }
    if (page.tourGroupId === tourGroupId) return readPage(query, pageId);
    await query(`UPDATE "EventPage" SET "tourGroupId" = $2, "updatedAt" = now() WHERE id = $1`, [pageId, tourGroupId]);
    const sourceState = await currentSourceState(query, pageId);
    await appendPageRevision(query, pageId, { ...page, tourGroupId }, {
      changeNote: tourGroupId ? 'Изменена связь с гастрольной группой' : 'Страница исключена из гастрольной группы',
      sourceState,
    });
    return readPage(query, pageId);
  });
}

export async function getAdminEventPage(db, id) {
  return readPage((text, params) => db.query(text, params), id);
}

export async function findAdminEventPageByEvent(db, eventId) {
  const result = await db.query(`
    SELECT page.id FROM "EventPage" page
    JOIN "EventPageEvent" link ON link."eventPageId" = page.id
    WHERE link."eventId" = $1
  `, [eventId]);
  return result.rows[0] ? getAdminEventPage(db, result.rows[0].id) : null;
}

/** Search source Events for an editor to explicitly attach to a durable EventPage. */
export async function searchAdminEventPageEventCandidates(db, rawQuery) {
  const search = String(rawQuery || '').trim().replace(/\s+/gu, ' ');
  if (search.length < 2) return [];
  const result = await db.query(`
    SELECT event.id, event.title, event.slug, event.kind, event.status,
      city.title AS "cityTitle", venue.title AS "venueTitle", venue.address AS "venueAddress",
      supplier.title AS "supplierTitle",
      COALESCE(source_data.sources, '[]'::jsonb) AS sources,
      linked_page.id AS "linkedPageId", linked_page.slug AS "linkedPageSlug",
      linked_page.title AS "linkedPageTitle", linked_page.status AS "linkedPageStatus",
      COALESCE(linked_page."canMoveFromDraftShell", false) AS "linkedPageCanMoveFromDraftShell",
      COALESCE(linked_page."eventCount", 0) > 1
        OR COALESCE(linked_page."canMoveFromDraftShell", false) AS "linkedPageCanMove"
    FROM "Event" event
    LEFT JOIN "City" city ON city.id = event."primaryCityId"
    LEFT JOIN "Venue" venue ON venue.id = event."venueId"
    LEFT JOIN "Supplier" supplier ON supplier.id = COALESCE(event."supplierId", (
      SELECT supplier_event."supplierId" FROM "SupplierEvent" supplier_event
      WHERE supplier_event."eventId" = event.id AND supplier_event."isActive" IS TRUE
      ORDER BY supplier_event."isPrimary" DESC, supplier_event."createdAt" ASC LIMIT 1
    ))
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(jsonb_build_object(
        'code', source.code, 'name', source.name,
        'externalId', source_link."externalId", 'metaExternalId', source_link."metaExternalId",
        'sourceUrl', source_link."sourceUrl"
      ) ORDER BY source.code, source_link."externalId") AS sources
      FROM "EventSourceLink" source_link JOIN "Source" source ON source.id = source_link."sourceId"
      WHERE source_link."eventId" = event.id
    ) source_data ON true
    LEFT JOIN LATERAL (
      SELECT page.id, page.slug, page.title, page.status,
        (SELECT count(*) FROM "EventPageEvent" owned WHERE owned."eventPageId" = page.id) AS "eventCount",
        (
          page.status = 'DRAFT' AND page."publishedAt" IS NULL AND page."isIndexable" IS FALSE
          AND page.summary IS NULL AND page.content = '{"sections":[]}'::jsonb
          AND (SELECT count(*) FROM "EventPageEvent" owned WHERE owned."eventPageId" = page.id) = 1
          AND (SELECT count(*) FROM "EventPageRevision" revision WHERE revision."eventPageId" = page.id) = 1
          AND (SELECT count(*) FROM "EventPageRoute" route WHERE route."eventPageId" = page.id) = 1
          AND EXISTS (
            SELECT 1 FROM "EventPageRoute" route
            WHERE route."eventPageId" = page.id AND route.kind = 'CANDIDATE'
              AND route.source = 'event-page-draft' AND route.path = '/events/' || page.slug
          )
        ) AS "canMoveFromDraftShell"
      FROM "EventPageEvent" page_event JOIN "EventPage" page ON page.id = page_event."eventPageId"
      WHERE page_event."eventId" = event.id
      LIMIT 1
    ) linked_page ON true
    WHERE upper(event.status::text) <> 'HIDDEN'
      AND (
        event.title ILIKE $1 OR city.title ILIKE $1 OR venue.title ILIKE $1
        OR venue.address ILIKE $1 OR supplier.title ILIKE $1
        OR EXISTS (
          SELECT 1 FROM "EventSourceLink" source_link
          WHERE source_link."eventId" = event.id AND source_link."externalId" ILIKE $1
        )
      )
    ORDER BY (lower(event.title) = lower($2)) DESC, event."updatedAt" DESC, event.id
    LIMIT 30
  `, [`%${search}%`, search]);
  return result.rows;
}

/** Public content is activated explicitly; READY drafts remain private until publishedAt is set. */
export async function readPublishedEventPageForEvent(db, eventId) {
  try {
    const result = await db.query(`
      SELECT page.slug, page.title, page.summary, page.content, page."seoH1",
        page."seoTitle", page."seoDescription", page."canonicalPath",
        page."isIndexable", page."publishedAt"
      FROM "EventPage" page
      JOIN "EventPageEvent" link ON link."eventPageId" = page.id
      WHERE link."eventId" = $1 AND page.status = 'READY' AND page."publishedAt" IS NOT NULL
      LIMIT 1
    `, [eventId]);
    return result.rows[0] || null;
  } catch (error) {
    // Keep old production databases and public event pages working before migration rollout.
    if (error?.code === '42P01' || error?.cause?.code === '42P01') return null;
    throw error;
  }
}

/** Resolve only the stable public identity. Draft copy itself is never returned here. */
export async function readPublicEventPageRouteBySlug(db, slug) {
  const key = String(slug || '').trim().toLowerCase();
  if (!key) return null;
  try {
    const result = await db.query(`
      SELECT page.id, page.slug, page.status, page."isIndexable", page."publishedAt",
        ARRAY(
          SELECT link."eventId" FROM "EventPageEvent" link
          WHERE link."eventPageId" = page.id
          ORDER BY link.position ASC, link."createdAt" ASC
        ) AS "eventIds",
        (
          SELECT link."eventId"
          FROM "EventPageEvent" link
          JOIN "Event" event ON event.id = link."eventId"
          WHERE link."eventPageId" = page.id
            AND upper(coalesce(event.status::text, '')) <> 'HIDDEN'
          ORDER BY link.position ASC, link."createdAt" ASC
          LIMIT 1
        ) AS "publicEventId",
        (
          SELECT event.status
          FROM "EventPageEvent" link
          JOIN "Event" event ON event.id = link."eventId"
          WHERE link."eventPageId" = page.id
            AND upper(coalesce(event.status::text, '')) <> 'HIDDEN'
          ORDER BY link.position ASC, link."createdAt" ASC
          LIMIT 1
        ) AS "eventStatus"
      FROM "EventPage" page
      WHERE lower(page.slug) = $1
        AND EXISTS (SELECT 1 FROM "EventPageEvent" link WHERE link."eventPageId" = page.id)
      LIMIT 1
    `, [key]);
    const row = result.rows[0];
    if (!row) return null;
    const eventIds = Array.isArray(row.eventIds) ? row.eventIds : [];
    const published = row.status === 'READY' && row.publishedAt != null;
    if (!row.publicEventId) return null;
    return {
      id: row.id,
      slug: row.slug,
      eventId: row.publicEventId,
      eventIds,
      status: row.status,
      published,
      isIndexable: published && row.isIndexable === true,
    };
  } catch (error) {
    // Rolling deploys may hit a catalog database before EventPage migration.
    if (error?.code === '42P01' || error?.cause?.code === '42P01') return null;
    throw error;
  }
}

/**
 * Resolve verified Ticketscloud product siblings for a stable EventPage route.
 * A TC parent ID alone is insufficient: city, normalized product title,
 * matching organizer/seller identity, and a single linked page are required.
 * Event IDs explicitly moved to another page remain excluded from this group.
 */
export async function resolvePublicEventPageEventIds(db, eventPageId, directEventIds) {
  const directIds = [...new Set((directEventIds || []).map((id) => String(id || '').trim()).filter(Boolean))];
  if (!directIds.length || !eventPageId) return directIds;

  const directGroups = await db.query(`
    SELECT owned."eventId", event.title, event."primaryCityId" AS "cityId",
      tc_meta."sourceId", tc_meta."metaExternalId", tc_meta."externalId", tc_meta."metaCount",
      provider_identity."organizerId", provider_identity."sellerId"
    FROM "EventPageEvent" owned
    JOIN "Event" event ON event.id = owned."eventId"
    LEFT JOIN LATERAL (
      SELECT min(link."sourceId") AS "sourceId",
        min(trim(link."metaExternalId")) AS "metaExternalId",
        min(link."externalId") AS "externalId",
        count(DISTINCT trim(link."metaExternalId"))::int AS "metaCount"
      FROM "EventSourceLink" link
      JOIN "Source" source ON source.id = link."sourceId"
      WHERE link."eventId" = event.id
        AND upper(source.code::text) = 'TICKETSCLOUD'
        AND NULLIF(trim(link."metaExternalId"), '') IS NOT NULL
    ) tc_meta ON true
    LEFT JOIN LATERAL (
      SELECT record.payload->>'organizerId' AS "organizerId",
        record.payload #>> '{seller,id}' AS "sellerId"
      FROM "RawImportRecord" record
      WHERE record."sourceId" = tc_meta."sourceId"
        AND record."entityType" = 'event_provider_metadata'
        AND record."externalId" = tc_meta."externalId"
      LIMIT 1
    ) provider_identity ON true
    WHERE owned."eventPageId" = $1 AND owned."eventId" = ANY($2::text[])
  `, [eventPageId, directIds]);

  const groups = new Map();
  for (const row of directGroups.rows) {
    if (Number(row.metaCount) !== 1 || !row.sourceId || !row.metaExternalId || !row.organizerId || !row.sellerId) continue;
    const productKey = normalizeEventProductTitle(row.title);
    if (!productKey) continue;
    const cityId = row.cityId == null ? null : String(row.cityId);
    const sourceId = String(row.sourceId);
    const metaExternalId = String(row.metaExternalId);
    const organizerId = String(row.organizerId);
    const sellerId = String(row.sellerId);
    const key = JSON.stringify([sourceId, metaExternalId, cityId, productKey]);
    const group = groups.get(key) || { sourceId, metaExternalId, cityId, productKey, organizerId, sellerId, directIds: [], identityConflict: false };
    if (group.organizerId !== organizerId || group.sellerId !== sellerId) {
      group.identityConflict = true;
      groups.set(key, group);
      continue;
    }
    group.directIds.push(String(row.eventId));
    groups.set(key, group);
  }
  if (!groups.size) return directIds;

  const candidates = await db.query(`
    WITH product_groups AS (
      SELECT * FROM jsonb_to_recordset($1::jsonb) AS item(
        "groupKey" text, "sourceId" text, "metaExternalId" text, "cityId" text,
        "productKey" text, "organizerId" text, "sellerId" text
      )
    )
    SELECT groups."groupKey", event.id, event.title, event.status, event."venueId",
      page_link."eventPageId" AS "linkedPageId",
      provider_identity."organizerId", provider_identity."sellerId",
      EXISTS (
        SELECT 1 FROM "EventOffer" offer
        WHERE offer."eventId" = event.id AND offer.active IS NOT FALSE
      ) AND EXISTS (
        SELECT 1 FROM "EventSession" session
        WHERE session."eventId" = event.id AND session."isActive" IS NOT FALSE
          AND session."cancelledAt" IS NULL AND session."startsAt" >= now() - interval '15 minutes'
      ) AS "isSaleable"
    FROM product_groups groups
    JOIN "EventSourceLink" source_link ON source_link."sourceId" = groups."sourceId"
      AND trim(source_link."metaExternalId") = groups."metaExternalId"
    JOIN "Event" event ON event.id = source_link."eventId"
      AND event."primaryCityId" IS NOT DISTINCT FROM groups."cityId"
    LEFT JOIN "EventPageEvent" page_link ON page_link."eventId" = event.id
    LEFT JOIN LATERAL (
      SELECT record.payload->>'organizerId' AS "organizerId",
        record.payload #>> '{seller,id}' AS "sellerId"
      FROM "RawImportRecord" record
      WHERE record."sourceId" = source_link."sourceId"
        AND record."entityType" = 'event_provider_metadata'
        AND record."externalId" = source_link."externalId"
      LIMIT 1
    ) provider_identity ON true
    WHERE NULLIF(trim(source_link."metaExternalId"), '') IS NOT NULL
      AND upper(coalesce(event.status::text, '')) <> 'HIDDEN'
  `, [JSON.stringify([...groups.entries()].map(([groupKey, group]) => ({ groupKey, ...group })))]);

  const candidatesByGroup = new Map();
  for (const row of candidates.rows) {
    const groupKey = String(row.groupKey);
    const group = groups.get(groupKey);
    if (!group || normalizeEventProductTitle(row.title) !== group.productKey) continue;
    const entry = candidatesByGroup.get(groupKey) || {
      ids: new Set(), pages: new Set(), liveIdentities: new Set(), liveIdentityRows: 0, liveRows: 0,
      allIdentities: new Set(), allIdentityRows: 0, venues: new Set(), rows: 0,
    };
    entry.ids.add(String(row.id));
    entry.rows += 1;
    if (row.linkedPageId) entry.pages.add(String(row.linkedPageId));
    if (row.venueId) entry.venues.add(String(row.venueId));
    const organizerId = String(row.organizerId || '').trim();
    const sellerId = String(row.sellerId || '').trim();
    if (organizerId && sellerId) {
      entry.allIdentityRows += 1;
      entry.allIdentities.add(`${organizerId}:${sellerId}`);
    }
    if (row.isSaleable) {
      entry.liveRows += 1;
      if (organizerId && sellerId) {
        entry.liveIdentityRows += 1;
        entry.liveIdentities.add(`${organizerId}:${sellerId}`);
      }
    }
    candidatesByGroup.set(groupKey, entry);
  }

  const resultIds = new Set(directIds);
  for (const [groupKey, group] of groups) {
    if (group.identityConflict) continue;
    const entry = candidatesByGroup.get(groupKey);
    if (!entry || entry.pages.size !== 1 || !entry.pages.has(String(eventPageId))) continue;
    const identities = entry.liveRows ? entry.liveIdentities : entry.allIdentities;
    const identityRows = entry.liveRows ? entry.liveIdentityRows : entry.allIdentityRows;
    const rowCount = entry.liveRows || entry.rows;
    if (identityRows !== rowCount || identities.size !== 1) continue;
    if (!identities.has(`${group.organizerId}:${group.sellerId}`)) continue;
    for (const eventId of entry.ids) resultIds.add(eventId);
  }
  return [...resultIds];
}

/**
 * Ensure a private EventPage shell for a currently saleable catalog Event.
 * Safe to call from every provider sync: it never edits an existing page or
 * groups sibling slots. The slug remains a candidate until editorial review.
 */
export async function ensureDraftEventPageForEvent(client, eventId) {
  if (!client || typeof client.query !== 'function') throw new Error('A PostgreSQL query client is required');
  const lockKey = `event-page-event:${eventId}`;
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [lockKey]);
  const existing = await client.query(`
    SELECT page.id, page.slug
    FROM "EventPageEvent" link JOIN "EventPage" page ON page.id = link."eventPageId"
    WHERE link."eventId" = $1 LIMIT 1
  `, [eventId]);
  if (existing.rows[0]) return { created: false, ...existing.rows[0] };

  const source = await client.query(`
    SELECT event.id, event.slug, event.title, event.status, event.kind,
      event.description, event."imageUrl", event."seoH1", event."seoTitle",
      event."seoDescription", event."primaryCityId", city.title AS "cityTitle",
      event."venueId", venue.title AS "venueTitle", venue.address AS "venueAddress", supplier.title AS "supplierTitle",
      COALESCE(source_data.sources, '[]'::jsonb) AS sources
    FROM "Event" event
    LEFT JOIN "City" city ON city.id = event."primaryCityId"
    LEFT JOIN "Venue" venue ON venue.id = event."venueId"
    LEFT JOIN "Supplier" supplier ON supplier.id = COALESCE(event."supplierId", (
      SELECT supplier_event."supplierId" FROM "SupplierEvent" supplier_event
      WHERE supplier_event."eventId" = event.id AND supplier_event."isActive" IS TRUE
      ORDER BY supplier_event."isPrimary" DESC, supplier_event."createdAt" ASC LIMIT 1
    ))
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(jsonb_build_object(
        'code', source.code, 'name', source.name,
        'externalId', source_link."externalId", 'metaExternalId', source_link."metaExternalId",
        'sourceUrl', source_link."sourceUrl"
      ) ORDER BY source.code, source_link."externalId") AS sources
      FROM "EventSourceLink" source_link JOIN "Source" source ON source.id = source_link."sourceId"
      WHERE source_link."eventId" = event.id
    ) source_data ON true
    WHERE event.id = $1 LIMIT 1
  `, [eventId]);
  const event = source.rows[0];
  if (
    !event ||
    String(event.status || '').toUpperCase() === 'HIDDEN' ||
    String(event.id || '').toLowerCase().startsWith('evt_stub_')
  ) return null;

  const availability = await client.query(`
    SELECT EXISTS (
      SELECT 1 FROM "EventOffer" offer
      WHERE offer."eventId" = $1 AND offer.active IS NOT FALSE
        AND (
          (upper(event.kind::text) = 'OPEN_DATE'
            AND (event."openDateValidTo" IS NULL OR event."openDateValidTo" >= now()))
          OR EXISTS (
            SELECT 1 FROM "EventSession" session
            WHERE session."eventId" = event.id AND session."isActive" IS NOT FALSE
              AND session."cancelledAt" IS NULL
              AND lower(coalesce(session."sourceStatus", '')) NOT IN
                ('widget_blocked', 'paused', 'suspended', 'stopped', 'cancelled', 'canceled', 'draft', 'hidden', 'stand_by', 'closed', 'sales_closed', 'sale_closed', 'not_for_sale')
              AND (
                (session."startsAt" IS NOT NULL AND session."startsAt" >= now() - interval '15 minutes')
                OR (session."startsAt" IS NOT NULL AND session."endsAt" IS NOT NULL
                  AND session."startsAt" < now() AND session."endsAt" >= now()
                  AND session."endsAt" - session."startsAt" < interval '36 hours')
                OR lower(coalesce(session."sourceStatus", '')) IN ('open_date', 'widget')
              )
          )
        )
    ) AS available
    FROM "Event" event WHERE event.id = $1
  `, [eventId]);
  if (availability.rows[0]?.available !== true) return null;

  // TC metaExternalId is an explicit parent/product identity. Group automatically
  // only inside the same city, and only when it currently points to exactly one
  // EventPage. Cross-city tour stops remain separate pages.
  const explicitGroup = await client.query(`
    SELECT source_link."sourceId", trim(source_link."metaExternalId") AS "metaExternalId"
    FROM "EventSourceLink" source_link
    JOIN "Source" source ON source.id = source_link."sourceId"
    WHERE source_link."eventId" = $1 AND upper(source.code::text) = 'TICKETSCLOUD'
      AND NULLIF(trim(source_link."metaExternalId"), '') IS NOT NULL
    GROUP BY source_link."sourceId", trim(source_link."metaExternalId")
    LIMIT 2
  `, [eventId]);
  if (explicitGroup.rows.length === 1 && event.primaryCityId) {
    const { sourceId, metaExternalId } = explicitGroup.rows[0];
    const matchingPages = await client.query(`
      SELECT DISTINCT page.id, page.slug
      FROM "EventSourceLink" sibling_link
      JOIN "Event" sibling_event ON sibling_event.id = sibling_link."eventId"
      JOIN "EventPageEvent" page_link ON page_link."eventId" = sibling_event.id
      JOIN "EventPage" page ON page.id = page_link."eventPageId"
      WHERE sibling_link."sourceId" = $1 AND trim(sibling_link."metaExternalId") = $2
        AND sibling_event."primaryCityId" = $3
        AND sibling_event.id <> $4
      ORDER BY page.id
      LIMIT 2
    `, [sourceId, metaExternalId, event.primaryCityId, eventId]);
    if (matchingPages.rows.length === 1) {
      const pageId = matchingPages.rows[0].id;
      const linkedEvents = await client.query(`
        SELECT "eventId" FROM "EventPageEvent"
        WHERE "eventPageId" = $1 ORDER BY position, "createdAt"
      `, [pageId]);
      const adapter = { transaction: (callback) => callback({ query: (sql, params) => client.query(sql, params) }) };
      const page = await replaceAdminEventPageEvents(adapter, pageId, {
        eventIds: [...linkedEvents.rows.map((row) => row.eventId), eventId],
        changeNote: `Автопривязка синхронизацией: одинаковый Ticketscloud metaExternalId и город (${event.cityTitle})`,
      });
      return { created: false, grouped: true, id: page.id, slug: page.slug };
    }
  }

  const candidate = eventPageCandidateSlug(event.slug, event.id);
  const adapter = { transaction: (callback) => callback({ query: (sql, params) => client.query(sql, params) }) };
  const page = await createAdminEventPage(adapter, {
    slug: candidate,
    title: String(event.title || 'Событие').trim(),
    summary: null,
    content: { sections: [] },
    seoH1: String(event.title || 'Событие').trim(),
    seoTitle: `${String(event.title || 'Событие').trim()} | Дайбилет`,
    seoDescription: null,
    canonicalPath: null,
    eventIds: [eventId],
    changeNote: explicitGroup.rows.length
      ? 'Создан отдельный черновик: автоматическая привязка по Ticketscloud metaExternalId не была однозначной; требуется проверка'
      : 'Автоматически создан черновик EventPage при синхронизации события; требуется редакционная проверка',
  });
  return { created: true, id: page.id, slug: page.slug };
}

export async function publishAdminEventPage(db, id, actorId = null) {
  return db.transaction(async ({ query }) => {
    const existing = await query(`SELECT * FROM "EventPage" WHERE id = $1 FOR UPDATE`, [id]);
    const page = existing.rows[0];
    if (!page) return null;
    if (page.status !== 'READY') throw new Error('EventPage must be READY before publishing');
    const content = page.content && typeof page.content === 'object' ? page.content : {};
    const sections = Array.isArray(content.sections) ? content.sections : [];
    const hasText = Boolean(String(page.summary || content.summary || '').trim()) || sections.some((section) =>
      String(section?.body || '').trim() || (Array.isArray(section?.items) && section.items.some((item) => String(item?.title || '').trim() || String(item?.description || '').trim())),
    );
    if (!hasText) throw new Error('EventPage needs editorial text before publishing');
    await query(`UPDATE "EventPage" SET "publishedAt" = COALESCE("publishedAt", now()), "updatedAt" = now() WHERE id = $1`, [id]);
    const sourceState = await currentSourceState(query, id);
    await appendPageRevision(query, id, page, { changeNote: 'Опубликован текст EventPage', actorId, sourceState });
    return readPage(query, id);
  });
}

export async function createAdminEventPage(db, payload, actorId = null) {
  const page = normalizePage(payload, { creating: true });
  return db.transaction(async ({ query }) => {
    const sourceResult = await query(`
      SELECT event.id, event.title, event.slug, event.description, event_override."shortDescription",
        event."imageUrl", event."seoH1", event."seoTitle", event."seoDescription",
        event."canonicalPath", event."isIndexable", event.kind, event."purchaseFlow",
        event."managementMode", event."primaryCityId", city.title AS "cityTitle", event."venueId",
        venue.title AS "venueTitle", venue.address AS "venueAddress", supplier.title AS "supplierTitle",
        COALESCE(source_data.sources, '[]'::jsonb) AS sources
      FROM "Event" event
      LEFT JOIN "EventOverride" event_override ON event_override."eventId" = event.id
      LEFT JOIN "City" city ON city.id = event."primaryCityId"
      LEFT JOIN "Venue" venue ON venue.id = event."venueId"
      LEFT JOIN "Supplier" supplier ON supplier.id = COALESCE(event."supplierId", (
        SELECT supplier_event."supplierId" FROM "SupplierEvent" supplier_event
        WHERE supplier_event."eventId" = event.id AND supplier_event."isActive" IS TRUE
        ORDER BY supplier_event."isPrimary" DESC, supplier_event."createdAt" ASC LIMIT 1
      ))
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(jsonb_build_object(
          'code', source.code, 'name', source.name,
          'externalId', source_link."externalId", 'metaExternalId', source_link."metaExternalId",
          'sourceUrl', source_link."sourceUrl"
        ) ORDER BY source.code, source_link."externalId") AS sources
        FROM "EventSourceLink" source_link JOIN "Source" source ON source.id = source_link."sourceId"
        WHERE source_link."eventId" = event.id
      ) source_data ON true
      WHERE event.id = ANY($1::text[])
    `, [page.eventIds]);
    if (sourceResult.rows.length !== page.eventIds.length) throw new Error('One or more Event ids do not exist');

    // EventPage is the stable editorial page candidate. City-qualified slugs
    // distinguish independent local events and tour stops without changing
    // public Event routes or inferring that records belong to one page.
    const primaryCitySlug = page.eventIds.length === 1 ? citySlug(sourceResult.rows[0]?.cityTitle) : '';
    const cityQualifiedSlug = primaryCitySlug && !page.slug.endsWith(`-${primaryCitySlug}`)
      ? `${page.slug}-${primaryCitySlug}`
      : page.slug;
    const slugFamily = cityQualifiedSlug.replace(/-\d+$/u, '') || cityQualifiedSlug;
    await query('SELECT pg_advisory_xact_lock(hashtext($1))', [`event-page-slug:${slugFamily}`]);
    let allocatedSlug = cityQualifiedSlug;
    let suffix = 2;
    while (true) {
      const existingSlug = await query(`
        SELECT 1 FROM "EventPage" WHERE slug = $1
        UNION ALL
        SELECT 1 FROM "EventPageRoute" WHERE path = $2
        LIMIT 1
      `, [allocatedSlug, `/events/${allocatedSlug}`]);
      if (!existingSlug.rows.length) break;
      allocatedSlug = `${cityQualifiedSlug}-${suffix}`;
      suffix += 1;
    }

    const insert = await query(`
      INSERT INTO "EventPage" (id, slug, title, summary, content, "seoH1", "seoTitle", "seoDescription", "canonicalPath", status, "isIndexable", "updatedAt")
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, 'DRAFT', false, now())
      RETURNING id
    `, [randomUUID(), allocatedSlug, page.title, page.summary, JSON.stringify(page.content), page.seoH1, page.seoTitle, page.seoDescription, page.canonicalPath]);
    const id = insert.rows[0].id;
    const allocatedPage = { ...page, slug: allocatedSlug };

    const candidatePath = `/events/${allocatedSlug}`;
    const candidateRoute = await query(`
      INSERT INTO "EventPageRoute" (id, "eventPageId", path, kind, source)
      VALUES ($1, $2, $3, 'CANDIDATE', 'event-page-draft')
      ON CONFLICT (path) DO NOTHING
      RETURNING id, "eventPageId", path, kind, source, "createdAt"
    `, [randomUUID(), id, candidatePath]);

    for (const [position, eventId] of page.eventIds.entries()) {
      const source = sourceResult.rows.find((row) => row.id === eventId);
      await query(`
        INSERT INTO "EventPageEvent" (id, "eventPageId", "eventId", position, role, "sourceSnapshot")
        VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      `, [randomUUID(), id, eventId, position, position === 0 ? 'PRIMARY' : 'PURCHASE_OPTION', JSON.stringify(source)]);
    }
    await appendPageRevision(query, id, allocatedPage, {
      changeNote: page.changeNote,
      actorId,
      sourceState: {
        events: sourceResult.rows.map((source, position) => ({
          eventId: page.eventIds[position],
          position,
          role: position === 0 ? 'PRIMARY' : 'PURCHASE_OPTION',
          sourceSnapshot: source,
        })),
        routes: candidateRoute.rows,
      },
    });
    return readPage(query, id);
  });
}

export async function updateAdminEventPage(db, id, payload, actorId = null) {
  const page = normalizePage(payload);
  return db.transaction(async ({ query }) => {
    const existing = await query(`SELECT id FROM "EventPage" WHERE id = $1 FOR UPDATE`, [id]);
    if (!existing.rows.length) return null;
    const updated = await query(`
      UPDATE "EventPage" SET slug = $2, title = $3, summary = $4, content = $5::jsonb,
        "seoH1" = $6, "seoTitle" = $7, "seoDescription" = $8, "canonicalPath" = $9,
        status = COALESCE($10, status),
        "publishedAt" = CASE WHEN COALESCE($10, status) = 'READY' THEN "publishedAt" ELSE NULL END,
        "updatedAt" = now()
      WHERE id = $1 RETURNING *
    `, [id, page.slug, page.title, page.summary, JSON.stringify(page.content), page.seoH1, page.seoTitle, page.seoDescription, page.canonicalPath, page.status ?? null]);
    const sourceState = await currentSourceState(query, id);
    await appendPageRevision(query, id, updated.rows[0], { changeNote: page.changeNote, actorId, sourceState });
    return readPage(query, id);
  });
}

export async function replaceAdminEventPageEvents(db, id, payload, actorId = null) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid EventPage events payload');
  const eventIds = normalizeEventIds(payload.eventIds);
  const changeNote = optionalText(payload.changeNote, 'changeNote', 1000);
  return db.transaction(async ({ query }) => {
    const page = await query(`SELECT * FROM "EventPage" WHERE id = $1 FOR UPDATE`, [id]);
    if (!page.rows[0]) return null;
    const sourceResult = await query(`
      SELECT event.id, event.title, event.slug, event.description, event_override."shortDescription",
        event."imageUrl", event."seoH1", event."seoTitle", event."seoDescription",
        event."canonicalPath", event."isIndexable", event.kind, event."purchaseFlow",
        event."managementMode", event."primaryCityId", city.title AS "cityTitle", event."venueId",
        venue.title AS "venueTitle", venue.address AS "venueAddress", supplier.title AS "supplierTitle",
        COALESCE(source_data.sources, '[]'::jsonb) AS sources
      FROM "Event" event
      LEFT JOIN "EventOverride" event_override ON event_override."eventId" = event.id
      LEFT JOIN "City" city ON city.id = event."primaryCityId"
      LEFT JOIN "Venue" venue ON venue.id = event."venueId"
      LEFT JOIN "Supplier" supplier ON supplier.id = COALESCE(event."supplierId", (
        SELECT supplier_event."supplierId" FROM "SupplierEvent" supplier_event
        WHERE supplier_event."eventId" = event.id AND supplier_event."isActive" IS TRUE
        ORDER BY supplier_event."isPrimary" DESC, supplier_event."createdAt" ASC LIMIT 1
      ))
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(jsonb_build_object(
          'code', source.code, 'name', source.name,
          'externalId', source_link."externalId", 'metaExternalId', source_link."metaExternalId",
          'sourceUrl', source_link."sourceUrl"
        ) ORDER BY source.code, source_link."externalId") AS sources
        FROM "EventSourceLink" source_link JOIN "Source" source ON source.id = source_link."sourceId"
        WHERE source_link."eventId" = event.id
      ) source_data ON true
      WHERE event.id = ANY($1::text[])
    `, [eventIds]);
    if (sourceResult.rows.length !== eventIds.length) throw new Error('One or more Event ids do not exist');

    const reassignedDraftShells = [];
    for (const eventId of eventIds) {
      const existingLink = await query(`
        SELECT page.id, page.slug FROM "EventPageEvent" event_link
        JOIN "EventPage" page ON page.id = event_link."eventPageId"
        WHERE event_link."eventId" = $1 FOR UPDATE OF page, event_link
      `, [eventId]);
      const existingPage = existingLink.rows[0];
      if (!existingPage || existingPage.id === id) continue;

      const safeShell = await query(`
        SELECT page.id, page.slug FROM "EventPage" page
        WHERE page.id = $1 AND page.status = 'DRAFT' AND page."publishedAt" IS NULL
          AND page."isIndexable" IS FALSE AND page.summary IS NULL
          AND page.content = '{"sections":[]}'::jsonb
          AND (SELECT count(*) FROM "EventPageEvent" owned WHERE owned."eventPageId" = page.id) = 1
          AND (SELECT count(*) FROM "EventPageRevision" revision WHERE revision."eventPageId" = page.id) = 1
          AND (SELECT count(*) FROM "EventPageRoute" route WHERE route."eventPageId" = page.id) = 1
          AND EXISTS (
            SELECT 1 FROM "EventPageRoute" route
            WHERE route."eventPageId" = page.id AND route.kind = 'CANDIDATE'
              AND route.source = 'event-page-draft' AND route.path = '/events/' || page.slug
          )
        FOR UPDATE
      `, [existingPage.id]);
      if (!safeShell.rows[0]) {
        throw new Error(`Event ${eventId} already belongs to another EventPage; only an empty unpublished sync shell can be reassigned`);
      }

      const shell = safeShell.rows[0];
      const candidatePath = `/events/${shell.slug}`;
      const pathOwner = await query(`SELECT 1 FROM "EventPageRoute" WHERE "eventPageId" = $1 AND path = $2 LIMIT 1`, [id, candidatePath]);
      if (!pathOwner.rows.length) {
        await query(`UPDATE "EventPageRoute" SET "eventPageId" = $2, source = 'reused-draft-shell' WHERE "eventPageId" = $1`, [shell.id, id]);
      }
      await query(`DELETE FROM "EventPage" WHERE id = $1`, [shell.id]);
      reassignedDraftShells.push({ eventId, removedDraftPageId: shell.id, removedDraftSlug: shell.slug });
    }

    await query(`DELETE FROM "EventPageEvent" WHERE "eventPageId" = $1`, [id]);
    for (const [position, eventId] of eventIds.entries()) {
      const source = sourceResult.rows.find((row) => row.id === eventId);
      await query(`
        INSERT INTO "EventPageEvent" (id, "eventPageId", "eventId", position, role, "sourceSnapshot")
        VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      `, [randomUUID(), id, eventId, position, position === 0 ? 'PRIMARY' : 'PURCHASE_OPTION', JSON.stringify(source)]);
    }
    await query(`UPDATE "EventPage" SET "updatedAt" = now() WHERE id = $1`, [id]);
    const sourceState = await currentSourceState(query, id);
    sourceState.events = sourceState.events.map((eventLink, position) => ({
      ...eventLink,
      sourceSnapshot: sourceResult.rows.find((row) => row.id === eventLink.eventId) ?? eventLink.sourceSnapshot,
      position,
      role: position === 0 ? 'PRIMARY' : 'PURCHASE_OPTION',
    }));
    if (reassignedDraftShells.length) sourceState.reassignedDraftShells = reassignedDraftShells;
    if (payload.membershipMove && typeof payload.membershipMove === 'object') {
      sourceState.membershipMove = {
        eventId: String(payload.membershipMove.eventId || ''),
        fromPageId: String(payload.membershipMove.fromPageId || ''),
        fromPageSlug: String(payload.membershipMove.fromPageSlug || ''),
      };
    }
    await appendPageRevision(query, id, page.rows[0], {
      changeNote: changeNote || (reassignedDraftShells.length ? 'К EventPage привязано событие из пустого синхронизационного черновика' : null),
      actorId,
      sourceState,
    });
    return readPage(query, id);
  });
}

async function detachEventFromPage(query, page, eventId, destinationPageId, actorId = null) {
  const links = await query(`
    SELECT "eventId", position, role, "sourceSnapshot"
    FROM "EventPageEvent" WHERE "eventPageId" = $1
    ORDER BY position, "createdAt" FOR UPDATE
  `, [page.id]);
  if (!links.rows.some((row) => row.eventId === eventId)) throw new Error('Event is not linked to the source EventPage');
  if (links.rows.length === 1) {
    const safeShell = await query(`
      SELECT page.id FROM "EventPage" page
      WHERE page.id = $1 AND page.status = 'DRAFT' AND page."publishedAt" IS NULL
        AND page."isIndexable" IS FALSE AND page.summary IS NULL
        AND page.content = '{"sections":[]}'::jsonb
        AND (SELECT count(*) FROM "EventPageRevision" revision WHERE revision."eventPageId" = page.id) <= 2
        AND (SELECT count(*) FROM "EventPageRoute" route WHERE route."eventPageId" = page.id) = 1
        AND EXISTS (SELECT 1 FROM "EventPageRoute" route WHERE route."eventPageId" = page.id
          AND route.kind = 'CANDIDATE' AND route.source IN ('event-page-draft', 'reused-draft-shell')
          AND route.path = '/events/' || page.slug)
      FOR UPDATE
    `, [page.id]);
    if (!safeShell.rows.length) {
      throw new Error('Cannot move the only Event off an editorial EventPage; split from a multi-Event page or review its content first');
    }
  }

  await query(`DELETE FROM "EventPageEvent" WHERE "eventPageId" = $1 AND "eventId" = $2`, [page.id, eventId]);
  const remaining = links.rows.filter((row) => row.eventId !== eventId);
  if (remaining.length) {
    await query(`UPDATE "EventPageEvent" SET position = -position - 1 WHERE "eventPageId" = $1`, [page.id]);
    for (const [position, row] of remaining.entries()) {
      await query(`UPDATE "EventPageEvent" SET position = $3, role = $4 WHERE "eventPageId" = $1 AND "eventId" = $2`, [
        page.id,
        row.eventId,
        position,
        position === 0 ? 'PRIMARY' : 'PURCHASE_OPTION',
      ]);
    }
  }
  await query(`UPDATE "EventPage" SET "updatedAt" = now() WHERE id = $1`, [page.id]);
  const sourceState = await currentSourceState(query, page.id);
  sourceState.membershipMove = { eventId, toPageId: destinationPageId };
  await appendPageRevision(query, page.id, page, {
    changeNote: `Event ${eventId} перенесён в EventPage ${destinationPageId}`,
    actorId,
    sourceState,
  });
}

/** Move one Event/slot between editorial pages. The source page remains restorable. */
export async function moveAdminEventPageEvent(db, targetPageId, eventId, actorId = null) {
  const normalizedEventId = requiredText(eventId, 'eventId', 120);
  return db.transaction(async ({ query }) => {
    const targetResult = await query(`SELECT * FROM "EventPage" WHERE id = $1 FOR UPDATE`, [targetPageId]);
    if (!targetResult.rows[0]) return null;
    const currentLink = await query(`
      SELECT page.*, event_link."eventId"
      FROM "EventPageEvent" event_link JOIN "EventPage" page ON page.id = event_link."eventPageId"
      WHERE event_link."eventId" = $1 FOR UPDATE OF page, event_link
    `, [normalizedEventId]);
    const source = currentLink.rows[0];
    if (source?.id === targetPageId) return { target: await readPage(query, targetPageId), source: null, unchanged: true };
    if (source) {
      await detachEventFromPage(query, source, normalizedEventId, targetPageId, actorId);
    }
    const targetLinks = await query(`SELECT "eventId" FROM "EventPageEvent" WHERE "eventPageId" = $1 ORDER BY position, "createdAt"`, [targetPageId]);
    const adapter = { transaction: (callback) => callback({ query }) };
    const target = await replaceAdminEventPageEvents(adapter, targetPageId, {
      eventIds: [...targetLinks.rows.map((row) => row.eventId), normalizedEventId],
      changeNote: source ? `Event ${normalizedEventId} перенесён из ${source.slug}` : `Event ${normalizedEventId} связан с EventPage вручную`,
      membershipMove: source ? { eventId: normalizedEventId, fromPageId: source.id, fromPageSlug: source.slug } : null,
    }, actorId);
    return {
      target,
      source: source ? (await readPage(query, source.id)) : null,
      unchanged: false,
    };
  });
}

/** Split one Event/slot into a new private EventPage draft, retaining an audit revision on both pages. */
export async function splitAdminEventPageEvent(db, pageId, eventId, actorId = null) {
  const normalizedEventId = requiredText(eventId, 'eventId', 120);
  return db.transaction(async ({ query }) => {
    const pageResult = await query(`SELECT * FROM "EventPage" WHERE id = $1 FOR UPDATE`, [pageId]);
    const page = pageResult.rows[0];
    if (!page) return null;
    const links = await query(`SELECT "eventId" FROM "EventPageEvent" WHERE "eventPageId" = $1 ORDER BY position, "createdAt" FOR UPDATE`, [pageId]);
    if (links.rows.length < 2) throw new Error('A single-Event EventPage cannot be split; there is no other Event to keep on the original page');
    const adapter = { transaction: (callback) => callback({ query }) };
    await detachEventFromPage(query, page, normalizedEventId, 'new-event-page', actorId);
    const source = await query(`
      SELECT event.id, event.title, event.slug FROM "Event" event WHERE event.id = $1
    `, [normalizedEventId]);
    if (!source.rows[0]) throw new Error('Event not found');
    const created = await createAdminEventPage(adapter, {
      slug: eventPageCandidateSlug(source.rows[0].slug, source.rows[0].id),
      title: String(source.rows[0].title || 'Событие').trim(),
      summary: null,
      content: { sections: [] },
      seoH1: String(source.rows[0].title || 'Событие').trim(),
      seoTitle: `${String(source.rows[0].title || 'Событие').trim()} | Дайбилет`,
      seoDescription: null,
      canonicalPath: null,
      eventIds: [normalizedEventId],
      changeNote: `Event ${normalizedEventId} отделён из EventPage ${page.slug}; создан private draft без публикации и смены URL`,
    }, actorId);
    const separatedPageResult = await query(`SELECT * FROM "EventPage" WHERE id = $1 FOR UPDATE`, [created.id]);
    const separatedState = await currentSourceState(query, created.id);
    separatedState.membershipMove = {
      eventId: normalizedEventId,
      fromPageId: page.id,
      fromPageSlug: page.slug,
    };
    await appendPageRevision(query, created.id, separatedPageResult.rows[0], {
      changeNote: `Event ${normalizedEventId} отделён из ${page.slug}; перенос можно отменить из новой EventPage`,
      actorId,
      sourceState: separatedState,
    });
    const updatedSource = await readPage(query, pageId);
    const finalSeparated = await readPage(query, created.id);
    return { source: updatedSource, separated: finalSeparated };
  });
}

export async function addAdminEventPageRoute(db, id, payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid EventPage route payload');
  const path = requiredText(payload.path, 'path', 1000);
  const kind = payload.kind ?? 'CANDIDATE';
  const source = optionalText(payload.source, 'source', 100);
  if (!/^\/events\/[a-z0-9а-яё-]+$/i.test(path)) throw new Error('path must be a clean /events/<slug> path');
  if (!ROUTE_KINDS.has(kind)) throw new Error('Invalid EventPage route kind');
  if (kind === 'CANDIDATE' && !source) throw new Error('source is required for candidate routes');
  return db.transaction(async ({ query }) => {
    const owner = await query(`SELECT * FROM "EventPage" WHERE id = $1 FOR UPDATE`, [id]);
    if (!owner.rows.length) return null;
    const result = await query(`
      INSERT INTO "EventPageRoute" (id, "eventPageId", path, kind, source)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, "eventPageId", path, kind, source, "createdAt"
    `, [randomUUID(), id, path, kind, source]);
    await query(`UPDATE "EventPage" SET "updatedAt" = now() WHERE id = $1`, [id]);
    const sourceState = await currentSourceState(query, id);
    sourceState.routeChange = { operation: 'added', route: result.rows[0] };
    await appendPageRevision(query, id, owner.rows[0], { changeNote: `Added URL mapping candidate: ${path}`, sourceState });
    return result.rows[0];
  });
}

export async function deleteAdminEventPageRoute(db, id, routeId, actorId = null) {
  return db.transaction(async ({ query }) => {
    const owner = await query(`SELECT * FROM "EventPage" WHERE id = $1 FOR UPDATE`, [id]);
    if (!owner.rows.length) return false;
    const route = await query(`
      DELETE FROM "EventPageRoute" WHERE id = $1 AND "eventPageId" = $2 RETURNING id, path, kind, source, "createdAt"
    `, [routeId, id]);
    if (!route.rows.length) return false;
    await query(`UPDATE "EventPage" SET "updatedAt" = now() WHERE id = $1`, [id]);
    const sourceState = await currentSourceState(query, id);
    sourceState.routeChange = { operation: 'removed', route: route.rows[0] };
    await appendPageRevision(query, id, owner.rows[0], { changeNote: `Removed URL mapping candidate: ${route.rows[0].path}`, actorId, sourceState });
    return true;
  });
}
