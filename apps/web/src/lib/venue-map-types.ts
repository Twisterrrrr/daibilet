export type VenueMapMarker = {
  id: string;
  lat: number;
  lng: number;
};

export type VenueMapTip = {
  id: string;
  slug: string;
  name: string;
  city: string;
  address: string | null;
  events: number;
  href: string;
  type: string;
};

/** Flat card fields for /venues + /locations grids (no SEO / description blobs). */
export type VenueCatalogCard = {
  id: string;
  slug?: string | null;
  name: string;
  city: string;
  /** City entity id when API provides it (day-route bucket). */
  cityId?: string | null;
  citySlug?: string | null;
  address?: string | null;
  /** Required for «Мой день» add-from-catalog (Yandex CTA). */
  latitude?: number | null;
  longitude?: number | null;
  type: string;
  events: number;
  /** Progressive /venues: counts still loading (hide badge / show pulse). */
  eventsPending?: boolean;
  /** Editorial hook for picker cards («зачем сюда»). */
  hookFact?: string | null;
  shortDescription?: string | null;
  heroImageUrl?: string | null;
  nextSlot?: string | null;
  categories?: Record<string, number>;
  metroStation?: string | null;
  /** Landmark / «Как найти» from Venue.wayToFind when API sends it. */
  wayToFind?: string | null;
  stopEventCount?: number;
  /** Only render stars when API actually provides a rating - never invent. */
  rating?: number | null;
  /**
   * Mini-афиша titles (1-3) when catalog DTO already includes upcoming sessions.
   * Absent on lean hub list today - cards skip without fakes.
   */
  upcomingTitles?: string[];
};
