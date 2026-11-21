/**
 * Dedupe slim STOP / nearby cards on location PDP.
 * Same product class as day-route match dedupe (TC often emits one Event row per session).
 * Key: normalized title + venue (not per-session id/slug).
 */

export type VenueLinkedEventLike = {
  id: string;
  slug: string;
  title: string;
  priceFrom?: number | null;
  venue?: string | null;
  venueId?: string | null;
};

/** Mirror apps/web day-route-score.normalizeDayRouteTitleKey */
export function normalizeLinkedEventTitleKey(title: string): string {
  return String(title || '')
    .toLowerCase()
    .replace(/[-–—]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Mirror apps/web day-route-score.dayRouteEventBaseSlug */
export function linkedEventBaseSlug(slug: string, eventId?: string | null): string {
  let value = String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/^tc-[a-f0-9]+-/i, '');
  const idTail = String(eventId || '')
    .replace(/^evt_/i, '')
    .toLowerCase();
  if (idTail && value.endsWith(`-${idTail}`)) {
    value = value.slice(0, -(idTail.length + 1));
  }
  value = value.replace(/-[a-f0-9]{20,}$/i, '');
  value = value.replace(/-[a-f0-9]{24}(?=-|$)/gi, '');
  value = value.replace(/-\d{8,}(?=-|$)/g, '');
  return value.replace(/-+/g, '-').replace(/^-|-$/g, '');
}

/**
 * One card per logical offer: title + start venue.
 * Title-first when long enough (TC session slugs rarely share a base).
 */
export function venueLinkedEventDedupeKey(input: {
  id: string;
  slug: string;
  title: string;
  venue?: string | null;
  venueId?: string | null;
}): string {
  const titleKey = normalizeLinkedEventTitleKey(input.title);
  const venueKey =
    normalizeLinkedEventTitleKey(input.venue || '') ||
    String(input.venueId || '')
      .trim()
      .toLowerCase();
  const venueSuffix = venueKey ? `|venue:${venueKey}` : '';

  if (titleKey.length >= 12) return `title:${titleKey}${venueSuffix}`;
  const base = linkedEventBaseSlug(input.slug, input.id);
  if (base.length >= 8) return `slug:${base}${venueSuffix}`;
  if (titleKey.length >= 8) return `title:${titleKey}${venueSuffix}`;
  return `id:${input.id}`;
}

/**
 * Collapse session twins. Caller should pass distance-sorted rows;
 * first sibling wins as href representative; priceFrom becomes min across group.
 */
export function dedupePublicVenueLinkedEvents<T extends VenueLinkedEventLike>(events: T[]): T[] {
  const best = new Map<string, T>();
  for (const event of events) {
    const key = venueLinkedEventDedupeKey(event);
    const prev = best.get(key);
    if (!prev) {
      best.set(key, event);
      continue;
    }
    const prevPrice = Number.isFinite(Number(prev.priceFrom))
      ? Number(prev.priceFrom)
      : Number.POSITIVE_INFINITY;
    const nextPrice = Number.isFinite(Number(event.priceFrom))
      ? Number(event.priceFrom)
      : Number.POSITIVE_INFINITY;
    if (nextPrice < prevPrice) {
      best.set(key, { ...prev, priceFrom: event.priceFrom ?? null });
    }
  }
  return [...best.values()];
}
