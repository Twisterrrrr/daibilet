/**
 * Guest «Собери свой день» bucket (localStorage). Separate from favorites wishlist.
 */

export const DAY_ROUTE_STORAGE_KEY = 'daibilet:dayRoute';
export const DAY_ROUTE_CHANGED_EVENT = 'daibilet:day-route-changed';

export const DAY_ROUTE_MIN = 2;
export const DAY_ROUTE_MAX = 8;

export type DayRouteVenueItem = {
  id: string;
  slug?: string | null;
  title: string;
  city?: string | null;
  cityId?: string | null;
  href?: string | null;
  imageUrl?: string | null;
};

export type DayRouteState = {
  cityId: string | null;
  venues: DayRouteVenueItem[];
};

export function emptyDayRoute(): DayRouteState {
  return { cityId: null, venues: [] };
}

export function readDayRoute(): DayRouteState {
  if (typeof window === 'undefined') return emptyDayRoute();
  try {
    const raw = localStorage.getItem(DAY_ROUTE_STORAGE_KEY);
    if (!raw) return emptyDayRoute();
    const parsed = JSON.parse(raw) as Partial<DayRouteState>;
    const venues = Array.isArray(parsed.venues)
      ? parsed.venues.filter(
          (item): item is DayRouteVenueItem =>
            Boolean(item) && typeof item.id === 'string' && typeof item.title === 'string',
        )
      : [];
    return {
      cityId: typeof parsed.cityId === 'string' ? parsed.cityId : null,
      venues: venues.slice(0, DAY_ROUTE_MAX),
    };
  } catch {
    return emptyDayRoute();
  }
}

export function writeDayRoute(state: DayRouteState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      DAY_ROUTE_STORAGE_KEY,
      JSON.stringify({
        cityId: state.cityId,
        venues: state.venues.slice(0, DAY_ROUTE_MAX),
      }),
    );
    notifyDayRouteChanged();
  } catch {
    // ignore quota
  }
}

export function notifyDayRouteChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(DAY_ROUTE_CHANGED_EVENT));
}

export function isInDayRoute(venueId: string, state = readDayRoute()): boolean {
  return state.venues.some((v) => v.id === venueId);
}

export function addToDayRoute(item: DayRouteVenueItem): DayRouteState {
  const current = readDayRoute();
  if (current.venues.some((v) => v.id === item.id)) return current;

  const nextCityId = item.cityId || current.cityId;
  const mixedCity =
    Boolean(current.cityId && item.cityId && current.cityId !== item.cityId) ||
    Boolean(current.venues.length && nextCityId && current.cityId && current.cityId !== nextCityId);

  if (current.venues.length >= DAY_ROUTE_MAX) return current;

  const next: DayRouteState = {
    cityId: nextCityId || current.cityId,
    venues: [...current.venues, item].slice(0, DAY_ROUTE_MAX),
  };
  // Keep first city as dominant; still allow add but UI warns on mixed.
  if (mixedCity && current.cityId) {
    next.cityId = current.cityId;
  }
  writeDayRoute(next);
  return next;
}

export function removeFromDayRoute(venueId: string): DayRouteState {
  const current = readDayRoute();
  const venues = current.venues.filter((v) => v.id !== venueId);
  const next: DayRouteState = {
    cityId: venues[0]?.cityId || (venues.length ? current.cityId : null),
    venues,
  };
  writeDayRoute(next);
  return next;
}

export function clearDayRoute() {
  writeDayRoute(emptyDayRoute());
}

export function toggleDayRoute(item: DayRouteVenueItem): DayRouteState {
  if (isInDayRoute(item.id)) return removeFromDayRoute(item.id);
  return addToDayRoute(item);
}

/** Parse `?day=id1,slug2` share query into locators (max DAY_ROUTE_MAX). */
export function parseDayRouteQueryParam(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return [
    ...new Set(
      String(raw)
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ].slice(0, DAY_ROUTE_MAX);
}

/** Build absolute or relative share URL for current day route. */
export function buildDayRouteSharePath(venues: DayRouteVenueItem[]): string {
  const tokens = venues
    .map((venue) => venue.slug || venue.id)
    .filter(Boolean)
    .slice(0, DAY_ROUTE_MAX);
  if (!tokens.length) return '/my-day';
  return `/my-day?day=${encodeURIComponent(tokens.join(','))}`;
}

/** Replace localStorage day route from resolved venue list (share hydrate). */
export function replaceDayRouteFromVenues(
  venues: DayRouteVenueItem[],
  cityId: string | null = null,
): DayRouteState {
  const next: DayRouteState = {
    cityId: cityId || venues[0]?.cityId || null,
    venues: venues.slice(0, DAY_ROUTE_MAX),
  };
  writeDayRoute(next);
  return next;
}

/** Pure score: 3*STOP + 2*start + 1*nearby. */
export function dayRouteMatchScore(covered: {
  stop?: string[];
  start?: string[];
  nearby?: string[];
}): number {
  const stop = covered.stop?.length ?? 0;
  const start = covered.start?.length ?? 0;
  const nearby = covered.nearby?.length ?? 0;
  return 3 * stop + 2 * start + 1 * nearby;
}
