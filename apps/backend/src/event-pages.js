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
  return String(value || '').trim().toLowerCase().split('')
    .map((char) => CITY_TRANSLITERATION[char] ?? char).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
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
  const [events, routes] = await Promise.all([
    query(`SELECT "eventId", position, role, "sourceSnapshot" FROM "EventPageEvent" WHERE "eventPageId" = $1 ORDER BY position`, [id]),
    query(`SELECT path, kind, source, "createdAt" FROM "EventPageRoute" WHERE "eventPageId" = $1 ORDER BY "createdAt"`, [id]),
  ]);
  return { events: events.rows, routes: routes.rows };
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
      "canonicalPath", status, "isIndexable", "publishedAt", "createdAt", "updatedAt"
    FROM "EventPage" WHERE id = $1
  `, [id]);
  if (!pageResult.rows[0]) return null;
  const [events, routes, revisions] = await Promise.all([
    query(`
      SELECT link.id, link."eventId", link.position, link.role, link."sourceSnapshot", link."createdAt",
        event.title AS "eventTitle", event.slug AS "eventSlug", event.kind AS "eventKind",
        event."primaryCityId", city.title AS "cityTitle"
      FROM "EventPageEvent" link
      JOIN "Event" event ON event.id = link."eventId"
      LEFT JOIN "City" city ON city.id = event."primaryCityId"
      WHERE link."eventPageId" = $1 ORDER BY link.position, link."createdAt"
    `, [id]),
    query(`SELECT id, path, kind, source, "createdAt" FROM "EventPageRoute" WHERE "eventPageId" = $1 ORDER BY "createdAt"`, [id]),
    query(`SELECT id, version, content, "sourceSnapshot", "changeNote", "createdBy", "createdAt" FROM "EventPageRevision" WHERE "eventPageId" = $1 ORDER BY version DESC`, [id]),
  ]);
  return { ...pageResult.rows[0], events: events.rows, routes: routes.rows, revisions: revisions.rows };
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

/** Public content is activated explicitly; READY drafts remain private until publishedAt is set. */
export async function readPublishedEventPageForEvent(db, eventId) {
  try {
    const result = await db.query(`
      SELECT page.slug, page.title, page.summary, page.content, page."seoH1", page."publishedAt"
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
        venue.title AS "venueTitle"
      FROM "Event" event
      LEFT JOIN "EventOverride" event_override ON event_override."eventId" = event.id
      LEFT JOIN "City" city ON city.id = event."primaryCityId"
      LEFT JOIN "Venue" venue ON venue.id = event."venueId"
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
      const existingSlug = await query('SELECT 1 FROM "EventPage" WHERE slug = $1 LIMIT 1', [allocatedSlug]);
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
        routes: [],
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
        venue.title AS "venueTitle"
      FROM "Event" event
      LEFT JOIN "EventOverride" event_override ON event_override."eventId" = event.id
      LEFT JOIN "City" city ON city.id = event."primaryCityId"
      LEFT JOIN "Venue" venue ON venue.id = event."venueId"
      WHERE event.id = ANY($1::text[])
    `, [eventIds]);
    if (sourceResult.rows.length !== eventIds.length) throw new Error('One or more Event ids do not exist');

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
    await appendPageRevision(query, id, page.rows[0], { changeNote, actorId, sourceState });
    return readPage(query, id);
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
