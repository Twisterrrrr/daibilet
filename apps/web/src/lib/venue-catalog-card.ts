import { resolveVenueHeroImage } from './city-place-images';
import type { VenueCatalogCard } from './venue-map-types';

type VenueCatalogSource = {
  id: string;
  slug?: string | null;
  name: string;
  city: string;
  cityId?: string | null;
  citySlug?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  type: string;
  events: number;
  hookFact?: string | null;
  shortDescription?: string | null;
  heroImageUrl?: string | null;
  nextSlot?: string | null;
  metroStation?: string | null;
  wayToFind?: string | null;
  stopEventCount?: number | null;
  rating?: number | null;
  upcomingTitles?: string[] | null;
  categories?: Record<string, number> | null;
};

function hasValidCatalogCoords(latitude: unknown, longitude: unknown): boolean {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

/** Keep catalog cards lean but never drop lat/lng needed by «Мой день». */
export function toVenueCatalogCard(venue: VenueCatalogSource): VenueCatalogCard {
  const hasCoords = hasValidCatalogCoords(venue.latitude, venue.longitude);
  const slug = String(venue.slug || venue.id);
  const ratingRaw = venue.rating;
  const rating =
    ratingRaw != null && Number.isFinite(Number(ratingRaw)) && Number(ratingRaw) > 0
      ? Number(ratingRaw)
      : null;
  const upcomingTitles = Array.isArray(venue.upcomingTitles)
    ? venue.upcomingTitles.map((title) => String(title || '').trim()).filter(Boolean).slice(0, 3)
    : undefined;

  return {
    id: venue.id,
    slug,
    name: venue.name,
    city: venue.city,
    cityId: venue.cityId ?? null,
    citySlug: venue.citySlug ?? null,
    address: venue.address ?? null,
    latitude: hasCoords ? Number(venue.latitude) : null,
    longitude: hasCoords ? Number(venue.longitude) : null,
    type: venue.type,
    events: venue.events || 0,
    hookFact: venue.hookFact ?? null,
    shortDescription: venue.shortDescription ?? null,
    heroImageUrl: resolveVenueHeroImage(slug, venue.heroImageUrl),
    nextSlot: venue.nextSlot ?? null,
    metroStation: venue.metroStation ?? null,
    wayToFind: venue.wayToFind ?? null,
    stopEventCount:
      venue.stopEventCount != null && Number.isFinite(Number(venue.stopEventCount))
        ? Number(venue.stopEventCount)
        : undefined,
    rating,
    upcomingTitles: upcomingTitles?.length ? upcomingTitles : undefined,
    categories: venue.categories || undefined,
  };
}
