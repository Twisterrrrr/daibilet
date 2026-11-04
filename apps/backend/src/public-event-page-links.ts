type QueryClient = {
  query: (sql: string, params: unknown[]) => Promise<{ rows: Array<Record<string, any>> }>;
};

type EventPageSlugRow = { eventId: string; slug: string };

const PRODUCT_DATE_PREFIX = /^\s*(?:\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?|\d{1,2}\s+[а-яё]+(?:\s+\d{4})?)\s*[/|—–:-]+\s*/iu;
const PRODUCT_DATE_ANYWHERE = /(?<!\d)\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?(?!\d)|(?<!\d)\d{1,2}\s+[а-яё]+(?:\s+\d{4})?(?!\w)/giu;
const PRODUCT_WEEKDAY = /\(\s*(?:пн|вт|ср|чт|пт|сб|вс|понедельник|вторник|среда|четверг|пятница|суббота|воскресенье)\s*\)/giu;
const PRODUCT_TRAILING_EVENT_ID = /[-\s]+(?:[0-9a-f]{24}|[0-9a-f]{32})\s*$/iu;

/** Same product-key normalization as scripts/build-eventpage-parent-sibling-matrix.py. */
export function normalizeEventPageProductTitle(value: unknown): string {
  return String(value || '')
    .replace(PRODUCT_DATE_PREFIX, '')
    .replace(PRODUCT_DATE_ANYWHERE, ' ')
    .replace(PRODUCT_WEEKDAY, ' ')
    .replace(PRODUCT_TRAILING_EVENT_ID, '')
    .toLocaleLowerCase('ru')
    .replace(/ё/gu, 'е')
    .replace(/[^\p{L}\p{N}_]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

/**
 * Resolve direct EventPage links and unambiguous Ticketscloud product groups.
 * Product siblings must match source + metaExternalId + city + normalized
 * product title. This keeps distinct programs under one provider parent apart.
 */
export async function resolveEventPageSlugsForEventIds(
  eventIds: string[],
  db: QueryClient,
): Promise<Map<string, string>> {
  const ids = [...new Set(eventIds.map((id) => String(id || '').trim()).filter(Boolean))];
  if (!ids.length) return new Map();
  try {
    const directResult = await db.query(`
      SELECT requested_event.id AS "eventId", requested_event.title,
        requested_event."primaryCityId" AS "cityId",
        direct_page.id AS "directPageId", direct_page.slug AS "directPageSlug",
        tc_meta."sourceId", tc_meta."metaExternalId", tc_meta."metaCount",
        provider_identity."organizerId", provider_identity."sellerId"
      FROM "Event" requested_event
      LEFT JOIN "EventPageEvent" direct_link ON direct_link."eventId" = requested_event.id
      LEFT JOIN "EventPage" direct_page ON direct_page.id = direct_link."eventPageId"
      LEFT JOIN LATERAL (
        SELECT min(link."sourceId") AS "sourceId",
          min(trim(link."metaExternalId")) AS "metaExternalId",
          min(link."externalId") AS "externalId",
          count(DISTINCT trim(link."metaExternalId"))::int AS "metaCount"
        FROM "EventSourceLink" link
        JOIN "Source" source ON source.id = link."sourceId"
        WHERE link."eventId" = requested_event.id
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
      WHERE requested_event.id = ANY($1::text[])
    `, [ids]);

    const eventPageByEventId = new Map<string, string>();
    for (const row of directResult.rows) {
      if (row.directPageId && row.directPageSlug) eventPageByEventId.set(String(row.eventId), String(row.directPageSlug));
    }

    const groupRows = directResult.rows.filter((row) =>
      !eventPageByEventId.has(String(row.eventId)) && Number(row.metaCount) === 1 && row.sourceId && row.metaExternalId,
    );
    const groupsByKey = new Map<string, {
      sourceId: string;
      metaExternalId: string;
      cityId: string | null;
      productKey: string;
      organizerId: string | null;
      sellerId: string | null;
      requestedEventIds: string[];
      identityConflict: boolean;
    }>();
    for (const row of groupRows) {
      const productKey = normalizeEventPageProductTitle(row.title);
      if (!productKey) continue;
      const sourceId = String(row.sourceId);
      const metaExternalId = String(row.metaExternalId);
      const cityId = row.cityId == null ? null : String(row.cityId);
      const organizerId = row.organizerId == null ? null : String(row.organizerId);
      const sellerId = row.sellerId == null ? null : String(row.sellerId);
      const key = JSON.stringify([sourceId, metaExternalId, cityId, productKey]);
      const group = groupsByKey.get(key) || { sourceId, metaExternalId, cityId, productKey, organizerId, sellerId, requestedEventIds: [], identityConflict: false };
      if (group.organizerId !== organizerId || group.sellerId !== sellerId) group.identityConflict = true;
      group.requestedEventIds.push(String(row.eventId));
      groupsByKey.set(key, group);
    }
    if (!groupsByKey.size) return eventPageByEventId;

    const candidateResult = await db.query(`
      WITH requested_groups AS (
        SELECT * FROM jsonb_to_recordset($1::jsonb) AS item(
          "groupKey" text, "sourceId" text, "metaExternalId" text, "cityId" text, "productKey" text
        )
      )
      SELECT groups."groupKey", sibling_event.id AS "memberEventId", sibling_event.title,
        sibling_event."venueId", page.id AS "pageId", page.slug, sibling_event.status,
        provider_identity."organizerId", provider_identity."sellerId",
        EXISTS (
          SELECT 1 FROM "EventOffer" offer
          WHERE offer."eventId" = sibling_event.id AND offer.active IS NOT FALSE
        ) AND EXISTS (
          SELECT 1 FROM "EventSession" session
          WHERE session."eventId" = sibling_event.id AND session."isActive" IS NOT FALSE
            AND session."cancelledAt" IS NULL AND session."startsAt" >= now() - interval '15 minutes'
        ) AS "isSaleable"
      FROM requested_groups groups
      JOIN "EventSourceLink" sibling_link ON sibling_link."sourceId" = groups."sourceId"
        AND trim(sibling_link."metaExternalId") = groups."metaExternalId"
      JOIN "Event" sibling_event ON sibling_event.id = sibling_link."eventId"
        AND sibling_event."primaryCityId" IS NOT DISTINCT FROM groups."cityId"
      LEFT JOIN "EventPageEvent" page_link ON page_link."eventId" = sibling_event.id
      LEFT JOIN "EventPage" page ON page.id = page_link."eventPageId"
      LEFT JOIN LATERAL (
        SELECT record.payload->>'organizerId' AS "organizerId",
          record.payload #>> '{seller,id}' AS "sellerId"
        FROM "RawImportRecord" record
        WHERE record."sourceId" = sibling_link."sourceId"
          AND record."entityType" = 'event_provider_metadata'
          AND record."externalId" = sibling_link."externalId"
        LIMIT 1
      ) provider_identity ON true
      WHERE NULLIF(trim(sibling_link."metaExternalId"), '') IS NOT NULL
    `, [JSON.stringify([...groupsByKey.entries()].map(([groupKey, group]) => ({
      groupKey,
      sourceId: group.sourceId,
      metaExternalId: group.metaExternalId,
      cityId: group.cityId,
      productKey: group.productKey,
    })))]);

    const pagesByGroup = new Map<string, Map<string, string>>();
    const reviewStateByGroup = new Map<string, { venues: Set<string>; liveIdentities: Set<string>; liveIdentityRows: number; liveRows: number; allIdentities: Set<string>; allIdentityRows: number; rows: number }>();
    for (const row of candidateResult.rows) {
      const groupKey = String(row.groupKey);
      const group = groupsByKey.get(groupKey);
      if (!group || normalizeEventPageProductTitle(row.title) !== group.productKey) continue;
      if (String(row.status || '').toUpperCase() === 'HIDDEN') continue;
      const reviewState = reviewStateByGroup.get(groupKey) || { venues: new Set<string>(), liveIdentities: new Set<string>(), liveIdentityRows: 0, liveRows: 0, allIdentities: new Set<string>(), allIdentityRows: 0, rows: 0 };
      reviewState.rows += 1;
      if (row.venueId) reviewState.venues.add(String(row.venueId));
      const organizerId = String(row.organizerId || '').trim();
      const sellerId = String(row.sellerId || '').trim();
      if (organizerId && sellerId) {
        reviewState.allIdentityRows += 1;
        reviewState.allIdentities.add(`${organizerId}:${sellerId}`);
      }
      if (row.isSaleable) {
        reviewState.liveRows += 1;
        if (organizerId && sellerId) {
          reviewState.liveIdentityRows += 1;
          reviewState.liveIdentities.add(`${organizerId}:${sellerId}`);
        }
      }
      reviewStateByGroup.set(groupKey, reviewState);
      if (!row.pageId || !row.slug) continue;
      const pages = pagesByGroup.get(groupKey) || new Map<string, string>();
      pages.set(String(row.pageId), String(row.slug));
      pagesByGroup.set(groupKey, pages);
    }

    for (const [groupKey, group] of groupsByKey) {
      if (group.identityConflict) continue;
      const pages = pagesByGroup.get(groupKey);
      if (pages?.size !== 1) continue;
      const reviewState = reviewStateByGroup.get(groupKey);
      const identities = reviewState?.liveRows ? reviewState.liveIdentities : reviewState?.allIdentities;
      const identityRows = reviewState?.liveRows ? reviewState.liveIdentityRows : reviewState?.allIdentityRows;
      const rowCount = reviewState?.liveRows || reviewState?.rows || 0;
      if (!reviewState || identityRows !== rowCount || identities?.size !== 1) continue;
      if (!group.organizerId || !group.sellerId || !identities || !identities.has(`${group.organizerId}:${group.sellerId}`)) continue;
      const slug = [...pages.values()][0];
      if (!slug) continue;
      for (const eventId of group.requestedEventIds) eventPageByEventId.set(eventId, slug);
    }
    return eventPageByEventId;
  } catch {
    // EventPage migrations may be absent during a rolling deploy.
    return new Map();
  }
}

const EVENT_LINK_PATTERN = /(?:https?:\/\/(?:www\.)?daibilet\.ru)?\/events\/([^\s\])<>"']+)/giu;

function decodeSlug(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function eventIdFromSlug(value: string): string | null {
  const match = String(value || '').match(/(?:^|-)([a-f\d]{24})(?:-|$)/iu);
  return match ? `evt_${match[1]}` : null;
}

/** Rewrite only exact, existing Event identities; unmatched and historical links stay intact. */
export async function rewriteArticleEventLinks(content: string, db: QueryClient): Promise<string> {
  const source = String(content || '');
  const matches = [...source.matchAll(EVENT_LINK_PATTERN)];
  if (!matches.length) return source;

  const urls = matches.map((match) => match[0]);
  const pathKeys = [...new Set(urls.map((url) => {
    const path = url.replace(/^https?:\/\/(?:www\.)?daibilet\.ru/iu, '');
    return (path.split(/[?#]/u, 1)[0] || '').toLowerCase();
  }))];
  const slugKeys = [...new Set(matches.map((match) => decodeSlug(String(match[1] || '').split(/[?#]/u, 1)[0] || '').toLowerCase()))];
  const eventIdHints = [...new Set(slugKeys.map(eventIdFromSlug).filter((id): id is string => Boolean(id)))];
  let rows: Array<{ id: string; slug: string; canonicalPath: string | null }>;
  try {
    const result = await db.query(`
      SELECT event.id, event.slug, event."canonicalPath"
      FROM "Event" event
      WHERE lower(event.slug) = ANY($1::text[])
         OR lower(coalesce(event."canonicalPath", '')) = ANY($2::text[])
         OR event.id = ANY($3::text[])
    `, [slugKeys, pathKeys, eventIdHints]);
    rows = result.rows as Array<{ id: string; slug: string; canonicalPath: string | null }>;
  } catch {
    // The EventPage migration may not yet be applied on every catalog database.
    return source;
  }

  const eventPageSlugById = await resolveEventPageSlugsForEventIds(rows.map((row) => row.id), db);

  const pageBySlug = new Map(rows.map((row) => [
    String(row.slug || '').toLowerCase(),
    eventPageSlugById.get(row.id),
  ]));
  const pageByPath = new Map(rows
    .filter((row) => row.canonicalPath)
    .map((row) => [String(row.canonicalPath).toLowerCase(), eventPageSlugById.get(row.id)]));
  const pageById = new Map(rows.map((row) => [row.id, eventPageSlugById.get(row.id)]));

  return source.replace(EVENT_LINK_PATTERN, (url, capturedSlug: string) => {
    const path = url.replace(/^https?:\/\/(?:www\.)?daibilet\.ru/iu, '');
    const pathOnly = (path.split(/[?#]/u, 1)[0] || '').toLowerCase();
    const decodedSlug = decodeSlug(String(capturedSlug || '').split(/[?#]/u, 1)[0] || '').toLowerCase();
    const eventId = eventIdFromSlug(decodedSlug);
    const stableSlug = (eventId && pageById.get(eventId)) || pageBySlug.get(decodedSlug) || pageByPath.get(pathOnly);
    if (!stableSlug) return url;
    const suffix = path.slice(pathOnly.length);
    return `/events/${stableSlug}${suffix}`;
  });
}
