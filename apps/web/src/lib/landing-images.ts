import { canonicalLandingSlug } from '@/lib/landing-constants';
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
  rooftops: '/images/home/format-tours.jpg',
  'walking-tours': '/images/home/format-tours.jpg',
  excursions: '/images/home/format-tours.jpg',
  'country-tours': '/images/home/format-tours.jpg',
  exhibitions: '/images/home/promo-museums.jpg',
  'unusual-theatres': '/images/home/promo-concerts.jpg',
};

export function resolveLandingCardImage(slug: string): string | null {
  const canonical = canonicalLandingSlug(slug);
  if (LANDING_CARD_IMAGES[canonical]) return LANDING_CARD_IMAGES[canonical];
  // Keyword fallback onto home JPG set so tiles never render as solid dark.
  return resolveHomePromoImage(canonical);
}
