import { prisma } from '@/lib/db';
import {
  classifyEventCoverage,
  coveragePct,
  dedupeDayRouteMatches,
  haversineMeters,
  isValidCoordinatePair,
  scoreDayRouteCoverage,
  type DayRouteCovered,
} from '@/lib/day-route-score';

export type DayRouteMatchVenue = {
  id: string;
  slug: string | null;
  title: string;
  cityId: string | null;
  cityTitle: string | null;
  citySlug: string | null;
  latitude: number | null;
  longitude: number | null;
  heroImageUrl: string | null;
};

export type DayRouteMatchItem = {
  eventId: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  priceFromRub: number | null;
  score: number;
  coveragePct: number;
  covered: DayRouteCovered;
  missing: string[];
};

export type DayRouteMatchPayload = {
  cityId: string | null;
  multiCityWarning: boolean;
  venues: DayRouteMatchVenue[];
  matches: DayRouteMatchItem[];
};

const MATCH_LIMIT = 24;
const BBOX_DEG = 0.005;

export async function matchDayRouteVenues(venueIds: string[]): Promise<DayRouteMatchPayload> {
  const locators = [...new Set(venueIds.map(String).filter(Boolean))].slice(0, 8);
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
  const ordered: typeof venues = [];
  const seenIds = new Set<string>();
  for (const locator of locators) {
    const venue = byLocator.get(locator);
    if (!venue || seenIds.has(venue.id)) continue;
    seenIds.add(venue.id);
    ordered.push(venue);
  }

  const ids = ordered.map((v) => v.id);

  const venueDtos: DayRouteMatchVenue[] = ordered.map((v) => ({
    id: v.id,
    slug: v.slug,
    title: v.title,
    cityId: v.cityId,
    cityTitle: v.city?.title ?? null,
    citySlug: v.city?.slug ?? null,
    latitude: v.latitude,
    longitude: v.longitude,
    heroImageUrl: v.heroImageUrl,
  }));

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
      selectedCoords.set(v.id, { latitude: v.latitude, longitude: v.longitude });
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

  // Direct hits: STOP on selected / start at selected.
  const directEvents = await prisma.event.findMany({
    where: {
      status: { notIn: ['HIDDEN', 'DRAFT'] },
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
  const nearbyEvents = await loadNearbyStartEvents(dominantCityId, selectedCoords);

  const byId = new Map<string, (typeof directEvents)[number]>();
  for (const event of [...directEvents, ...nearbyEvents]) {
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
      score,
      coveragePct: coveragePct(covered, ids.length),
      covered,
      missing,
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

const eventSelect = {
  id: true,
  slug: true,
  title: true,
  imageUrl: true,
  priceFromRub: true,
  venueId: true,
  venue: { select: { latitude: true, longitude: true } },
  routeItems: {
    where: { role: 'STOP' as const },
    select: { venueId: true },
  },
  override: { select: { imageUrl: true } },
} as const;

async function loadNearbyStartEvents(
  cityId: string | null,
  selectedCoords: Map<string, { latitude: number; longitude: number }>,
) {
  if (!cityId || !selectedCoords.size) return [];

  const coords = [...selectedCoords.values()];
  const minLat = Math.min(...coords.map((c) => c.latitude)) - BBOX_DEG;
  const maxLat = Math.max(...coords.map((c) => c.latitude)) + BBOX_DEG;
  const minLng = Math.min(...coords.map((c) => c.longitude)) - BBOX_DEG;
  const maxLng = Math.max(...coords.map((c) => c.longitude)) + BBOX_DEG;

  const rows = await prisma.event.findMany({
    where: {
      status: { notIn: ['HIDDEN', 'DRAFT'] },
      primaryCityId: cityId,
      venue: {
        is: {
          latitude: { gte: minLat, lte: maxLat },
          longitude: { gte: minLng, lte: maxLng },
        },
      },
    },
    select: eventSelect,
    take: 300,
  });

  // Soft filter: at least one selected point within ~550m bbox already; haversine in classify.
  return rows.filter((event) => {
    const lat = event.venue?.latitude;
    const lng = event.venue?.longitude;
    if (lat == null || lng == null) return false;
    for (const point of coords) {
      if (haversineMeters(point.latitude, point.longitude, lat, lng) <= 500) return true;
    }
    return false;
  });
}
