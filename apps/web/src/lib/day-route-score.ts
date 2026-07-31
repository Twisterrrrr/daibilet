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
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
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
