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
  address?: string | null;
  type: string;
  events: number;
  shortDescription?: string | null;
  heroImageUrl?: string | null;
  nextSlot?: string | null;
  categories?: Record<string, number>;
};
