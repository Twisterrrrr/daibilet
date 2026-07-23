import type { VenueMapMarker, VenueMapTip } from '@/lib/venue-map-types';
import { loadVenueMapTip as loadTip } from '@daibilet/backend/public-read';

export type { VenueMapMarker, VenueMapTip };

/** Flat primitives for client map hydration - never pass full venue DTOs. */
export function toVenueMapMarkers(
  venues: Array<{ id?: string | null; latitude?: number | null; longitude?: number | null }>,
): VenueMapMarker[] {
  const out: VenueMapMarker[] = [];
  for (const venue of venues) {
    const id = String(venue.id || '').trim();
    const lat = Number(venue.latitude);
    const lng = Number(venue.longitude);
    if (!id || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
    out.push({ id, lat, lng });
  }
  return out;
}

export async function loadVenueMapTip(idOrSlug: string): Promise<VenueMapTip | null> {
  return loadTip(idOrSlug);
}
