type QueryClient = {
  query: (sql: string, params: unknown[]) => Promise<{ rows: Array<Record<string, any>> }>;
};

type EventPageSlugRow = { eventId: string; slug: string };

/**
 * Resolve direct EventPage links and one-page Ticketscloud product groups.
 * Meta groups are exact by source + metaExternalId + city; conflicting pages
 * intentionally return no mapping so callers keep the existing Event URL.
 */
export async function resolveEventPageSlugsForEventIds(
  eventIds: string[],
  db: QueryClient,
): Promise<Map<string, string>> {
  const ids = [...new Set(eventIds.map((id) => String(id || '').trim()).filter(Boolean))];
  if (!ids.length) return new Map();
  try {
    const result = await db.query(`
      WITH requested AS (
        SELECT unnest($1::text[]) AS "requestedEventId"
      ),
      direct_members AS (
        SELECT requested."requestedEventId", requested."requestedEventId" AS "memberEventId"
        FROM requested
      ),
      unique_tc_meta AS (
        SELECT sl."eventId", sl."sourceId", min(trim(sl."metaExternalId")) AS "metaExternalId"
        FROM "EventSourceLink" sl
        JOIN "Source" source ON source.id = sl."sourceId"
        JOIN requested ON requested."requestedEventId" = sl."eventId"
        WHERE upper(source.code::text) = 'TICKETSCLOUD'
          AND NULLIF(trim(sl."metaExternalId"), '') IS NOT NULL
        GROUP BY sl."eventId", sl."sourceId"
          HAVING count(DISTINCT trim(sl."metaExternalId")) = 1
      ),
      meta_members AS (
        SELECT requested."requestedEventId", sibling."eventId" AS "memberEventId"
        FROM requested
        JOIN "Event" requested_event ON requested_event.id = requested."requestedEventId"
        JOIN unique_tc_meta requested_meta ON requested_meta."eventId" = requested_event.id
        JOIN "EventSourceLink" sibling ON sibling."sourceId" = requested_meta."sourceId"
          AND trim(sibling."metaExternalId") = requested_meta."metaExternalId"
        JOIN "Event" sibling_event ON sibling_event.id = sibling."eventId"
          AND sibling_event."primaryCityId" IS NOT DISTINCT FROM requested_event."primaryCityId"
        WHERE requested_meta."metaExternalId" IS NOT NULL
      ),
      members AS (
        SELECT * FROM direct_members
        UNION
        SELECT * FROM meta_members
      )
      SELECT members."requestedEventId" AS "eventId", min(page.slug) AS slug
      FROM members
      JOIN "EventPageEvent" page_link ON page_link."eventId" = members."memberEventId"
      JOIN "EventPage" page ON page.id = page_link."eventPageId"
      WHERE EXISTS (
        SELECT 1 FROM "EventPageEvent" route_link
        JOIN "Event" route_event ON route_event.id = route_link."eventId"
        WHERE route_link."eventPageId" = page.id
          AND upper(coalesce(route_event.status::text, '')) <> 'HIDDEN'
      )
      GROUP BY members."requestedEventId"
      HAVING count(DISTINCT page.id) = 1
    `, [ids]);
    return new Map(result.rows.map((row) => [String(row.eventId), String(row.slug)]));
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
