import { prisma } from '@/lib/db';
import { DAY_ROUTE_MAX } from '@/lib/day-route';
import {
  classifyEventCoverage,
  coveragePct,
  dedupeDayRouteMatches,
  haversineMeters,
  isValidCoordinatePair,
  scoreDayRouteCoverage,
  type DayRouteCovered,
} from '@/lib/day-route-score';
import {
  dayRouteMatchSaleableSelect,
  dayRouteMatchSaleableWhere,
  isDayRouteMatchSaleable,
} from '@/server/day-route-match-saleable';

export type DayRouteMatchVenue = {
  id: string;
  slug: string | null;
  title: string;
  cityId: string | null;
  cityTitle: string | null;
  citySlug: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  heroImageUrl: string | null;
  /** Present when locator was an event id/slug (share hydrate). */
  eventId?: string | null;
  eventSlug?: string | null;
};

export type DayRouteMatchItem = {
  eventId: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  priceFromRub: number | null;
  /** Always true for returned matches - public page would not soft-404. */
  purchaseReady: boolean;
  score: number;
  coveragePct: number;
  covered: DayRouteCovered;
  missing: string[];
  /** Start + STOP venues of the excursion (stubs for «добавить в маршрут»). */
  routeVenues: DayRouteMatchVenue[];
};

export type DayRouteMatchPayload = {
  cityId: string | null;
  multiCityWarning: boolean;
  venues: DayRouteMatchVenue[];
  matches: DayRouteMatchItem[];
};

const MATCH_LIMIT = 24;
const BBOX_DEG = 0.005;

function toMatchVenueDto(venue: {
  id: string;
  slug: string | null;
  title: string;
  cityId: string | null;
  address?: string | null;
  latitude: number | null;
  longitude: number | null;
  heroImageUrl: string | null;
  city?: { title: string; slug: string } | null;
}): DayRouteMatchVenue {
  return {
    id: venue.id,
    slug: venue.slug,
    title: venue.title,
    cityId: venue.cityId,
    cityTitle: venue.city?.title ?? null,
    citySlug: venue.city?.slug ?? null,
    address: venue.address ?? null,
    latitude: venue.latitude,
    longitude: venue.longitude,
    heroImageUrl: venue.heroImageUrl,
  };
}

function collectEventRouteVenues(event: {
  venueId: string | null;
  venue: {
    id: string;
    slug: string | null;
    title: string;
    cityId: string | null;
    address?: string | null;
    latitude: number | null;
    longitude: number | null;
    heroImageUrl: string | null;
    city?: { title: string; slug: string } | null;
  } | null;
  routeItems: Array<{
    venueId: string;
    venue: {
      id: string;
      slug: string | null;
      title: string;
      cityId: string | null;
      address?: string | null;
      latitude: number | null;
      longitude: number | null;
      heroImageUrl: string | null;
      city?: { title: string; slug: string } | null;
    } | null;
  }>;
}): DayRouteMatchVenue[] {
  const out: DayRouteMatchVenue[] = [];
  const seen = new Set<string>();
  const push = (venue: Parameters<typeof toMatchVenueDto>[0] | null | undefined) => {
    if (!venue?.id || seen.has(venue.id)) return;
    seen.add(venue.id);
    out.push(toMatchVenueDto(venue));
  };
  push(event.venue);
  for (const item of event.routeItems) push(item.venue);
  return out;
}

export async function matchDayRouteVenues(venueIds: string[]): Promise<DayRouteMatchPayload> {
  const locators = [...new Set(venueIds.map(String).filter(Boolean))].slice(0, DAY_ROUTE_MAX);
  if (!locators.length) {
    return { cityId: null, multiCityWarning: false, venues: [], matches: [] };
  }

  const venues = await prisma.venue.findMany({
    where: {
      OR: [{ id: { in: locators } }, { slug: { in: locators } }],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      cityId: true,
      address: true,
      latitude: true,
      longitude: true,
      heroImageUrl: true,
      city: { select: { title: true, slug: true } },
    },
  });

  // Preserve request order (first match per locator).
  const byLocator = new Map<string, (typeof venues)[number]>();
  for (const venue of venues) {
    byLocator.set(venue.id, venue);
    if (venue.slug) byLocator.set(venue.slug, venue);
  }

  const unresolved = locators.filter((locator) => !byLocator.has(locator));
  type EventResolveRow = {
    id: string;
    slug: string;
    title: string;
    imageUrl: string | null;
    override: { imageUrl: string | null } | null;
    venue: {
      id: string;
      slug: string | null;
      title: string;
      cityId: string | null;
      address: string | null;
      latitude: number | null;
      longitude: number | null;
      heroImageUrl: string | null;
      city: { title: string; slug: string } | null;
    } | null;
  };
  const eventsByLocator = new Map<string, EventResolveRow>();
  if (unresolved.length) {
    const events = await prisma.event.findMany({
      where: {
        ...dayRouteMatchSaleableWhere(),
        OR: [{ id: { in: unresolved } }, { slug: { in: unresolved } }],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        imageUrl: true,
        ...dayRouteMatchSaleableSelect(),
        override: { select: { imageUrl: true } },
        venue: {
          select: {
            id: true,
            slug: true,
            title: true,
            cityId: true,
            address: true,
            latitude: true,
            longitude: true,
            heroImageUrl: true,
            city: { select: { title: true, slug: true } },
          },
        },
      },
      take: 16,
    });
    for (const event of events) {
      if (!isDayRouteMatchSaleable(event)) continue;
      eventsByLocator.set(event.id, event);
      if (event.slug) eventsByLocator.set(event.slug, event);
    }
  }

  type OrderedStop =
    | { kind: 'venue'; venue: (typeof venues)[number] }
    | { kind: 'event'; event: EventResolveRow };

  const orderedStops: OrderedStop[] = [];
  const seenStopKeys = new Set<string>();
  for (const locator of locators) {
    const venue = byLocator.get(locator);
    if (venue) {
      const key = `v:${venue.id}`;
      if (seenStopKeys.has(key)) continue;
      seenStopKeys.add(key);
      orderedStops.push({ kind: 'venue', venue });
      continue;
    }
    const event = eventsByLocator.get(locator);
    if (!event) continue;
    const key = `e:${event.id}`;
    if (seenStopKeys.has(key)) continue;
    seenStopKeys.add(key);
    orderedStops.push({ kind: 'event', event });
  }

  const ids = orderedStops
    .map((stop) => (stop.kind === 'venue' ? stop.venue.id : stop.event.venue?.id))
    .filter((id): id is string => Boolean(id));

  const venueDtos: DayRouteMatchVenue[] = orderedStops.map((stop) => {
    if (stop.kind === 'venue') return toMatchVenueDto(stop.venue);
    const event = stop.event;
    const imageUrl = event.override?.imageUrl || event.imageUrl;
    if (event.venue) {
      return {
        ...toMatchVenueDto(event.venue),
        title: event.title,
        heroImageUrl: imageUrl || event.venue.heroImageUrl,
        eventId: event.id,
        eventSlug: event.slug,
      };
    }
    return {
      id: event.id,
      slug: event.slug,
      title: event.title,
      cityId: null,
      cityTitle: null,
      citySlug: null,
      address: null,
      latitude: null,
      longitude: null,
      heroImageUrl: imageUrl,
      eventId: event.id,
      eventSlug: event.slug,
    };
  });

  const cityCounts = new Map<string, number>();
  for (const v of venueDtos) {
    if (!v.cityId) continue;
    cityCounts.set(v.cityId, (cityCounts.get(v.cityId) || 0) + 1);
  }
  let dominantCityId: string | null = null;
  let dominantCount = 0;
  for (const [cityId, count] of cityCounts) {
    if (count > dominantCount) {
      dominantCityId = cityId;
      dominantCount = count;
    }
  }
  const multiCityWarning = cityCounts.size > 1;

  const selectedCoords = new Map<string, { latitude: number; longitude: number }>();
  for (const v of venueDtos) {
    if (v.latitude != null && v.longitude != null && isValidCoordinatePair(v.latitude, v.longitude)) {
      // Coverage map keys are venue ids (not event ids).
      const coordKey = v.eventId && v.id === v.eventId ? null : v.id;
      if (coordKey) selectedCoords.set(coordKey, { latitude: v.latitude, longitude: v.longitude });
    }
  }

  if (!ids.length) {
    return {
      cityId: dominantCityId,
      multiCityWarning,
      venues: venueDtos,
      matches: [],
    };
  }

  // Direct hits: STOP on selected / start at selected (saleable only - avoid soft-404 buy CTAs).
  const now = new Date();
  const eventSelect = buildEventSelect(now);
  const directEvents = await prisma.event.findMany({
    where: {
      ...dayRouteMatchSaleableWhere(now),
      ...(dominantCityId ? { primaryCityId: dominantCityId } : {}),
      OR: [
        { venueId: { in: ids } },
        { routeItems: { some: { role: 'STOP', venueId: { in: ids } } } },
      ],
    },
    select: eventSelect,
    take: 200,
  });

  // Nearby candidates: same city, start venue within bbox of any selected point.
  const nearbyEvents = await loadNearbyStartEvents(dominantCityId, selectedCoords, now);

  const byId = new Map<string, (typeof directEvents)[number]>();
  for (const event of [...directEvents, ...nearbyEvents]) {
    if (!isDayRouteMatchSaleable(event, now.getTime())) continue;
    byId.set(event.id, event);
  }

  const matches: DayRouteMatchItem[] = [];
  for (const event of byId.values()) {
    const stopVenueIds = event.routeItems.map((r) => r.venueId);
    const covered = classifyEventCoverage({
      selectedVenueIds: ids,
      stopVenueIds,
      startVenueId: event.venueId,
      startLat: event.venue?.latitude,
      startLng: event.venue?.longitude,
      selectedCoords,
    });
    const score = scoreDayRouteCoverage(covered);
    if (score < 1) continue;
    const coveredSet = new Set([...covered.stop, ...covered.start, ...covered.nearby]);
    const missing = ids.filter((id) => !coveredSet.has(id));
    matches.push({
      eventId: event.id,
      slug: event.slug,
      title: event.title,
      imageUrl: event.override?.imageUrl || event.imageUrl,
      priceFromRub: event.priceFromRub,
      purchaseReady: true,
      score,
      coveragePct: coveragePct(covered, ids.length),
      covered,
      missing,
      routeVenues: collectEventRouteVenues(event),
    });
  }

  // TC/supplier often store one Event row per session (same product, different ids).
  // Collapse siblings before rank/limit so «Мой день» shows one card per product.
  const unique = dedupeDayRouteMatches(matches);

  unique.sort(
    (a, b) =>
      b.score - a.score ||
      b.coveragePct - a.coveragePct ||
      (a.priceFromRub ?? Number.POSITIVE_INFINITY) - (b.priceFromRub ?? Number.POSITIVE_INFINITY),
  );

  return {
    cityId: dominantCityId,
    multiCityWarning,
    venues: venueDtos,
    matches: unique.slice(0, MATCH_LIMIT),
  };
}

function buildEventSelect(now = new Date()) {
  return {
    id: true,
    slug: true,
    title: true,
    imageUrl: true,
    priceFromRub: true,
    venueId: true,
    ...dayRouteMatchSaleableSelect(now),
    venue: {
      select: {
        id: true,
        slug: true,
        title: true,
        cityId: true,
        address: true,
        latitude: true,
        longitude: true,
        heroImageUrl: true,
        city: { select: { title: true, slug: true } },
      },
    },
    routeItems: {
      where: { role: 'STOP' as const },
      select: {
        venueId: true,
        venue: {
          select: {
            id: true,
            slug: true,
            title: true,
            cityId: true,
            address: true,
            latitude: true,
            longitude: true,
            heroImageUrl: true,
            city: { select: { title: true, slug: true } },
          },
        },
      },
    },
    override: { select: { imageUrl: true } },
  } as const;
}

async function loadNearbyStartEvents(
  cityId: string | null,
  selectedCoords: Map<string, { latitude: number; longitude: number }>,
  now = new Date(),
) {
  if (!cityId || !selectedCoords.size) return [];

  const coords = [...selectedCoords.values()];
  const minLat = Math.min(...coords.map((c) => c.latitude)) - BBOX_DEG;
  const maxLat = Math.max(...coords.map((c) => c.latitude)) + BBOX_DEG;
  const minLng = Math.min(...coords.map((c) => c.longitude)) - BBOX_DEG;
  const maxLng = Math.max(...coords.map((c) => c.longitude)) + BBOX_DEG;

  const rows = await prisma.event.findMany({
    where: {
      ...dayRouteMatchSaleableWhere(now),
      primaryCityId: cityId,
      venue: {
        is: {
          latitude: { gte: minLat, lte: maxLat },
          longitude: { gte: minLng, lte: maxLng },
        },
      },
    },
    select: buildEventSelect(now),
    take: 300,
  });

  // Soft filter: at least one selected point within ~550m bbox already; haversine in classify.
  return rows.filter((event) => {
    if (!isDayRouteMatchSaleable(event, now.getTime())) return false;
    const lat = event.venue?.latitude;
    const lng = event.venue?.longitude;
    if (lat == null || lng == null) return false;
    for (const point of coords) {
      if (haversineMeters(point.latitude, point.longitude, lat, lng) <= 500) return true;
    }
    return false;
  });
}
