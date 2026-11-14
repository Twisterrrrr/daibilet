export type PublicSearchEventRow = {
  id: string;
  slug: string;
  eventPageSlug?: string | null;
  title: string;
  city?: string | null;
  venue?: string | null;
};

export function publicSearchEventHref(row: PublicSearchEventRow): string {
  const stableSlug = String(row.eventPageSlug || '').trim();
  return `/events/${stableSlug || row.slug}`;
}

function normalizeSearchEventPart(value?: string | null): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[-–—]/gu, ' ')
    .replace(/[^a-z0-9а-я]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** TC can store one Event row per slot. Search should expose the logical event once. */
export function publicSearchEventContextKey(row: PublicSearchEventRow): string {
  const pageSlug = String(row.eventPageSlug || '').trim().toLowerCase();
  if (pageSlug) return `page:${pageSlug}`;
  const title = normalizeSearchEventPart(row.title);
  const city = normalizeSearchEventPart(row.city);
  const venue = normalizeSearchEventPart(row.venue);
  if (!title) return `id:${row.id}`;
  return `context:${title}|city:${city}|venue:${venue}`;
}

export function collapsePublicSearchEventRows<T extends PublicSearchEventRow>(
  rows: T[],
  limit: number,
): T[] {
  const result: T[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const key = publicSearchEventContextKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(row);
    if (result.length >= limit) break;
  }
  return result;
}
