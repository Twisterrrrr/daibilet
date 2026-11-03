type EventPageLinkRow = {
  slug: string;
  canonicalPath: string | null;
  eventPageSlug: string;
};

type QueryClient = {
  query: (sql: string, params: unknown[]) => Promise<{ rows: EventPageLinkRow[] }>;
};

const EVENT_LINK_PATTERN = /(?:https?:\/\/(?:www\.)?daibilet\.ru)?\/events\/([^\s\])<>"']+)/giu;

function decodeSlug(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
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
  let rows: EventPageLinkRow[];
  try {
    const result = await db.query(`
      SELECT event.slug, event."canonicalPath", page.slug AS "eventPageSlug"
      FROM "Event" event
      JOIN "EventPageEvent" link ON link."eventId" = event.id
      JOIN "EventPage" page ON page.id = link."eventPageId"
      WHERE lower(event.slug) = ANY($1::text[])
         OR lower(coalesce(event."canonicalPath", '')) = ANY($2::text[])
    `, [slugKeys, pathKeys]);
    rows = result.rows;
  } catch {
    // The EventPage migration may not yet be applied on every catalog database.
    return source;
  }

  const pageBySlug = new Map(rows.map((row) => [String(row.slug || '').toLowerCase(), row.eventPageSlug]));
  const pageByPath = new Map(rows
    .filter((row) => row.canonicalPath)
    .map((row) => [String(row.canonicalPath).toLowerCase(), row.eventPageSlug]));

  return source.replace(EVENT_LINK_PATTERN, (url, capturedSlug: string) => {
    const path = url.replace(/^https?:\/\/(?:www\.)?daibilet\.ru/iu, '');
    const pathOnly = (path.split(/[?#]/u, 1)[0] || '').toLowerCase();
    const decodedSlug = decodeSlug(String(capturedSlug || '').split(/[?#]/u, 1)[0] || '').toLowerCase();
    const stableSlug = pageBySlug.get(decodedSlug) || pageByPath.get(pathOnly);
    if (!stableSlug) return url;
    const suffix = path.slice(pathOnly.length);
    return `/events/${stableSlug}${suffix}`;
  });
}
