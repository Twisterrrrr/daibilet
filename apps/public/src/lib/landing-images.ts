import { canonicalLandingSlug } from '@/lib/landing-slugs';

/** Тематические обложки для карточек подборок (public/images/landings). Без текста на изображении. */
const LANDING_CARD_IMAGES: Record<string, string> = {
  'river-cruises': '/images/landings/river-cruises.jpg',
  'river-party': '/images/landings/river-party.jpg',
  'bridges-night': '/images/landings/bridges-night.jpg',
  'new-year': '/images/landings/new-year.jpg',
  'moscow-dinner-boat': '/images/landings/moscow-dinner-boat.jpg',
  'moscow-city-day': '/images/landings/moscow-city-day.jpg',
  'salute-9-may': '/images/landings/salute-9-may.jpg',
  'bus-tours': '/images/landings/bus-tours.jpg',
  standup: '/images/landings/standup.jpg',
  planetarium: '/images/landings/planetarium.jpg',
  'spb-yards': '/images/landings/spb-yards.jpg',
  'family-kids': '/images/landings/family-kids.jpg',
  'concerts-genre': '/images/landings/concerts-genre.jpg',
  'moscow-museums': '/images/landings/moscow-museums.jpg',
  'active-sport': '/images/landings/active-sport.jpg',
  rooftops: '/images/landings/rooftops.jpg',
  'walking-tours': '/images/landings/walking-tours.jpg',
  excursions: '/images/landings/excursions.jpg',
  'country-tours': '/images/landings/country-tours.jpg',
  exhibitions: '/images/home/promo-museums.jpg',
  'unusual-theatres': '/images/home/promo-party.jpg',
  'quest-tours': '/images/home/promo-museums.jpg',
  'show-programs': '/images/home/promo-party.jpg',
  'self-development': '/images/home/promo-museums.jpg',
  'intimate-concerts': '/images/home/promo-concerts.jpg',
  'improv-tribute': '/images/home/promo-party.jpg',
  graduation: '/images/home/promo-dinner.jpg',
  'international-womens-day': '/images/home/promo-dinner.jpg',
  maslenitsa: '/images/home/promo-yards.jpg',
};

const CITY_LANDING_CARD_IMAGES: Record<string, Partial<Record<string, string>>> = {
  perm: {
    'river-cruises': '/images/landings/perm/kama-embankment.jpg',
    excursions: '/images/landings/perm/city-center.jpg',
    'walking-tours': '/images/landings/perm/kama-embankment.jpg',
    rooftops: '/images/landings/perm/kama-embankment.jpg',
    'bus-tours': '/images/landings/perm/city-center.jpg',
  },
};

export function resolveLandingCardImage(slug: string, citySlug?: string | null): string | null {
  const canonical = canonicalLandingSlug(slug);
  const city = String(citySlug || '')
    .trim()
    .toLowerCase();
  if (city) {
    const override = CITY_LANDING_CARD_IMAGES[city]?.[canonical];
    if (override) return override;
  }
  return LANDING_CARD_IMAGES[canonical] || null;
}
