import type { PublicVenuesDto } from '@daibilet/contracts/public';

import { toVenueCatalogCard } from '@/lib/venue-catalog-card';
import type { VenueCatalogCard } from '@/lib/venue-map-types';

/** First screen + infinite-scroll page size (24–48 band). Trimmed for faster first paint. */
export const VENUE_CATALOG_PAGE_SIZE = 24;

export type VenueCatalogFamily = 'institution' | 'location';
export type VenueCatalogSort = 'events' | 'asc' | 'desc';

export type VenueCatalogFeedQuery = {
  family: VenueCatalogFamily;
  city?: string;
  type?: string;
  scale?: string;
  logistics?: string;
  sort?: VenueCatalogSort;
  q?: string;
  cursor?: string | null;
  limit?: number;
  /** Progressive /venues: skip waiting for distinct product counts. */
  counts?: boolean;
};

export type VenueCatalogFeedStats = {
  venues: number;
  /** Filtered-universe event total (event≠slots); 0 while countsPending. */
  events?: number;
  cities: Record<string, number>;
  types: Record<string, number>;
  scales?: Record<string, number>;
  logistics?: Record<string, number>;
};

export type VenueCatalogFeedPage = {
  venues: VenueCatalogCard[];
  total: number;
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
  stats: VenueCatalogFeedStats;
  /** Shell response: client should enrich event counts. */
  countsPending?: boolean;
};

export type VenueCatalogMapPin = {
  id: string;
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
  kind: string;
};

function emptyStats(): VenueCatalogFeedStats {
  return {
    venues: 0,
    events: 0,
    cities: {},
    types: {},
    scales: {},
    logistics: {},
  };
}

export function buildVenueCatalogSearchParams(query: VenueCatalogFeedQuery): URLSearchParams {
  const params = new URLSearchParams();
  params.set('family', query.family);
  params.set('limit', String(query.limit || VENUE_CATALOG_PAGE_SIZE));
  if (query.city && query.city !== 'all') params.set('city', query.city);
  if (query.type && query.type !== 'all') params.set('type', query.type);
  if (query.scale && query.scale !== 'all') params.set('scale', query.scale);
  if (query.logistics && query.logistics !== 'all') params.set('logistics', query.logistics);
  if (query.sort && query.sort !== 'events') params.set('sort', query.sort);
  if (query.q?.trim()) params.set('q', query.q.trim());
  if (query.cursor) params.set('cursor', query.cursor);
  if (query.counts === false) params.set('counts', '0');
  return params;
}

/** Cache key for list API: city+kind+cursor(+scale/logistics[+sort/q]). */
export function venueCatalogCacheKey(query: VenueCatalogFeedQuery): string {
  return [
    query.family,
    query.city || 'all',
    query.type || 'all',
    query.scale || 'all',
    query.logistics || 'all',
    query.sort || 'events',
    query.q?.trim() || '',
    query.cursor || '',
    String(query.limit || VENUE_CATALOG_PAGE_SIZE),
    query.counts === false ? 'shell' : 'full',
  ].join('|');
}

/** SSR default feed key: unfiltered «all cities», sort by events. */
export function venueCatalogDefaultQueryKey(family: VenueCatalogFamily): string {
  return venueCatalogCacheKey({
    family,
    sort: 'events',
    limit: VENUE_CATALOG_PAGE_SIZE,
  });
}

export function mapVenueCatalogFeedPage(payload: PublicVenuesDto | null | undefined): VenueCatalogFeedPage {
  const countsPending = Boolean(payload?.countsPending);
  const venues = (payload?.venues ?? []).map((item) => {
    const card = toVenueCatalogCard(item);
    if (countsPending) return { ...card, events: 0, eventsPending: true };
    return card;
  });
  const stats = payload?.stats;
  return {
    venues,
    total: Number(payload?.total) || venues.length,
    nextCursor: payload?.nextCursor ?? null,
    hasMore: Boolean(payload?.hasMore ?? payload?.nextCursor),
    limit: Number(payload?.limit) || VENUE_CATALOG_PAGE_SIZE,
    countsPending,
    stats: {
      venues: Number(stats?.venues) || Number(payload?.total) || venues.length,
      events: Number(stats?.events) || 0,
      cities: stats?.cities || {},
      types: stats?.types || {},
      scales: stats?.scales || {},
      logistics: stats?.logistics || {},
    },
  };
}

export async function fetchVenueCatalogPage(
  query: VenueCatalogFeedQuery,
  init?: RequestInit,
): Promise<VenueCatalogFeedPage> {
  const params = buildVenueCatalogSearchParams(query);
  const response = await fetch(`/api/public/venues?${params.toString()}`, init);
  if (!response.ok) {
    return {
      venues: [],
      total: 0,
      nextCursor: null,
      hasMore: false,
      limit: query.limit || VENUE_CATALOG_PAGE_SIZE,
      stats: emptyStats(),
    };
  }
  const payload = (await response.json()) as PublicVenuesDto;
  return mapVenueCatalogFeedPage(payload);
}

/** Distinct product counts (event≠slots) for progressive card enrich. */
export async function fetchVenueCatalogEventCounts(
  venueIds: string[],
  init?: RequestInit,
): Promise<Record<string, number>> {
  const ids = [...new Set(venueIds.map((id) => String(id || '').trim()).filter(Boolean))].slice(0, 100);
  if (!ids.length) return {};
  const response = await fetch(`/api/public/venues/event-counts?ids=${encodeURIComponent(ids.join(','))}`, init);
  if (!response.ok) return {};
  const payload = (await response.json()) as { counts?: Record<string, number> };
  const counts = payload.counts || {};
  const out: Record<string, number> = {};
  for (const [id, value] of Object.entries(counts)) {
    out[id] = Number(value) || 0;
  }
  return out;
}

export function applyVenueCatalogEventCounts(
  page: VenueCatalogFeedPage,
  counts: Record<string, number>,
): VenueCatalogFeedPage {
  if (!page.venues.length) return { ...page, countsPending: false };
  const venues = page.venues.map((venue) => ({
    ...venue,
    events: counts[venue.id] ?? venue.events ?? 0,
    eventsPending: false,
  }));
  return { ...page, venues, countsPending: false };
}

export async function fetchVenueCatalogPins(
  query: Omit<VenueCatalogFeedQuery, 'cursor' | 'limit'>,
  init?: RequestInit,
): Promise<VenueCatalogMapPin[]> {
  const params = buildVenueCatalogSearchParams({ ...query, limit: 10000 });
  params.set('mode', 'pins');
  const response = await fetch(`/api/public/venues?${params.toString()}`, init);
  if (!response.ok) return [];
  const payload = (await response.json()) as PublicVenuesDto;
  return (payload.pins ?? [])
    .map((pin) => ({
      id: String(pin.id),
      slug: String(pin.slug || pin.id),
      name: String(pin.name || ''),
      latitude: Number(pin.latitude),
      longitude: Number(pin.longitude),
      kind: String(pin.kind || 'other'),
    }))
    .filter(
      (pin) =>
        Number.isFinite(pin.latitude) &&
        Number.isFinite(pin.longitude) &&
        !(pin.latitude === 0 && pin.longitude === 0),
    );
}
