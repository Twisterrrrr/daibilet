import { canonicalLandingSlug } from '@/lib/landing-constants';
import { normalizeKnownCitySlug } from '@/lib/landing-routes';
import { resolveHomePromoImage } from '@/lib/home-scenarios';

/** Тематические обложки для карточек подборок (public/images/landings). */
const LANDING_CARD_IMAGES: Record<string, string> = {
  'river-cruises': '/images/landings/river-cruises.png',
  'river-party': '/images/landings/river-party.png',
  'bridges-night': '/images/landings/bridges-night.png',
  'new-year': '/images/landings/new-year.png',
  'moscow-dinner-boat': '/images/landings/moscow-dinner-boat.png',
  'moscow-city-day': '/images/landings/salute-9-may.png',
  'salute-9-may': '/images/landings/salute-9-may.png',
  'bus-tours': '/images/landings/bus-tours.png',
  standup: '/images/landings/standup.png',
  planetarium: '/images/landings/planetarium.png',
  'spb-yards': '/images/landings/spb-yards.png',
  'family-kids': '/images/landings/family-kids.png',
  'concerts-genre': '/images/landings/concerts-genre.png',
  'moscow-museums': '/images/landings/moscow-museums.png',
  'active-sport': '/images/landings/active-sport.png',
  // Unique covers - never share SPB Savior-on-Blood (`format-tours.jpg`).
  rooftops: '/images/landings/rooftops.jpg',
  'walking-tours': '/images/landings/walking-tours.jpg',
  excursions: '/images/landings/excursions.jpg',
  'country-tours': '/images/landings/country-tours.jpg',
  exhibitions: '/images/home/promo-museums.jpg',
  'unusual-theatres': '/images/home/promo-concerts.jpg',
};

/**
 * City-hub overrides so national landing tiles do not bleed SPB/MSK landmarks
 * into regional hubs (Perm, etc.).
 */
const CITY_LANDING_CARD_IMAGES: Record<string, Partial<Record<string, string>>> = {
  perm: {
    'river-cruises': '/images/landings/perm/kama-embankment.jpg',
    excursions: '/images/landings/perm/city-center.jpg',
    'walking-tours': '/images/landings/perm/kama-embankment.jpg',
    rooftops: '/images/landings/perm/kama-embankment.jpg',
    'bus-tours': '/images/landings/perm/city-center.jpg',
  },
};

/** Neutral fallback when slug has no dedicated cover (avoid SPB format-tours bleed). */
const NEUTRAL_LANDING_FALLBACK = '/images/home/format-museums.jpg';

export function resolveLandingCardImage(slug: string, citySlug?: string | null): string | null {
  const canonical = canonicalLandingSlug(slug);
  const city = normalizeKnownCitySlug(citySlug);
  if (city) {
    const cityOverride = CITY_LANDING_CARD_IMAGES[city]?.[canonical];
    if (cityOverride) return cityOverride;
  }
  if (LANDING_CARD_IMAGES[canonical]) return LANDING_CARD_IMAGES[canonical];
  // Keyword fallback onto home JPG set - but never the SPB tours stock photo.
  const promo = resolveHomePromoImage(canonical);
  if (promo === '/images/home/format-tours.jpg') return NEUTRAL_LANDING_FALLBACK;
  return promo;
}
