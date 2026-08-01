/**
 * Day-route match scoring + haversine (pure, unit-testable).
 */

const EARTH_RADIUS_M = 6371000;
export const DAY_ROUTE_NEARBY_RADIUS_M = 300;

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function isValidCoordinatePair(latitude: number, longitude: number): boolean {
  // Reject null-island (Number(null)===0) and out-of-range junk.
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (latitude === 0 && longitude === 0) return false;
  return Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}

export type DayRouteCovered = {
  stop: string[];
  start: string[];
  nearby: string[];
};

export function scoreDayRouteCoverage(covered: DayRouteCovered): number {
  return 3 * covered.stop.length + 2 * covered.start.length + 1 * covered.nearby.length;
}

export function coveragePct(covered: DayRouteCovered, venueCount: number): number {
  if (venueCount <= 0) return 0;
  return (covered.stop.length + covered.start.length) / venueCount;
}

/** Normalize title for sibling collapse (Санкт-Петербург ≈ Санкт Петербург). */
export function normalizeDayRouteTitleKey(title: string): string {
  return String(title || '')
    .toLowerCase()
    .replace(/[-–—]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strip TC/dated id suffixes from event slug so siblings share one key.
 * Examples:
 * - `title-slug-69ca5d1e…` → `title-slug`
 * - `tc-6a3932f3…-title-slug` → `title-slug`
 */
export function dayRouteEventBaseSlug(slug: string, eventId?: string | null): string {
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
  return value.replace(/-+/g, '-').replace(/^-|-$/g, '');
}

/** Canonical dedupe key for day-route match cards (one product, many TC sessions). */
export function dayRouteMatchDedupeKey(input: {
  eventId: string;
  slug: string;
  title: string;
}): string {
  const base = dayRouteEventBaseSlug(input.slug, input.eventId);
  if (base.length >= 8) return `slug:${base}`;
  const titleKey = normalizeDayRouteTitleKey(input.title);
  if (titleKey.length >= 8) return `title:${titleKey}`;
  return `id:${input.eventId}`;
}

export type DayRouteMatchRankable = {
  eventId: string;
  slug: string;
  title: string;
  score: number;
  coveragePct: number;
  priceFromRub: number | null;
};

/** Keep best sibling per dedupe key: score → coverage → lower price → stable id. */
export function dedupeDayRouteMatches<T extends DayRouteMatchRankable>(matches: T[]): T[] {
  const best = new Map<string, T>();
  for (const match of matches) {
    const key = dayRouteMatchDedupeKey(match);
    const prev = best.get(key);
    if (!prev || isBetterDayRouteMatch(match, prev)) best.set(key, match);
  }
  return [...best.values()];
}

function isBetterDayRouteMatch(a: DayRouteMatchRankable, b: DayRouteMatchRankable): boolean {
  if (a.score !== b.score) return a.score > b.score;
  if (a.coveragePct !== b.coveragePct) return a.coveragePct > b.coveragePct;
  const ap = a.priceFromRub ?? Number.POSITIVE_INFINITY;
  const bp = b.priceFromRub ?? Number.POSITIVE_INFINITY;
  if (ap !== bp) return ap < bp;
  return a.eventId < b.eventId;
}

/**
 * Classify selected venue ids against one event.
 * Nearby only for ids not already in stop/start.
 */
export function classifyEventCoverage(input: {
  selectedVenueIds: string[];
  stopVenueIds: string[];
  startVenueId: string | null | undefined;
  startLat: number | null | undefined;
  startLng: number | null | undefined;
  selectedCoords: Map<string, { latitude: number; longitude: number }>;
  nearbyRadiusM?: number;
}): DayRouteCovered {
  const selected = new Set(input.selectedVenueIds);
  const stops = new Set(input.stopVenueIds);
  const stop: string[] = [];
  const start: string[] = [];
  const nearby: string[] = [];
  const radius = input.nearbyRadiusM ?? DAY_ROUTE_NEARBY_RADIUS_M;

  for (const id of selected) {
    if (stops.has(id)) {
      stop.push(id);
      continue;
    }
    if (input.startVenueId && id === input.startVenueId) {
      start.push(id);
      continue;
    }
    const coords = input.selectedCoords.get(id);
    if (
      coords &&
      isValidCoordinatePair(coords.latitude, coords.longitude) &&
      isValidCoordinatePair(Number(input.startLat), Number(input.startLng))
    ) {
      const d = haversineMeters(
        coords.latitude,
        coords.longitude,
        Number(input.startLat),
        Number(input.startLng),
      );
      if (d <= radius) nearby.push(id);
    }
  }

  return { stop, start, nearby };
}
