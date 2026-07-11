import { cityEventsHref, cityHref } from '@/lib/routes';
import { concertsLandingHref } from '@/lib/landing-routes';

const CITY_SLUG_BY_TITLE: Record<string, string> = {
  Москва: 'moscow',
  'Санкт-Петербург': 'saint-petersburg',
};

export function resolveBlogCityHref(city?: string | null, citySlug?: string | null): string | null {
  if (citySlug) return cityHref({ name: city || citySlug, slug: citySlug });
  if (city && CITY_SLUG_BY_TITLE[city]) {
    return cityHref({ name: city, slug: CITY_SLUG_BY_TITLE[city] });
  }
  return null;
}

/** Афиша города — сразу к расписанию на CityPage. */
export function resolveBlogCityEventsHref(city?: string | null, citySlug?: string | null): string | null {
  if (citySlug) return cityEventsHref({ name: city || citySlug, slug: citySlug });
  if (city && CITY_SLUG_BY_TITLE[city]) {
    return cityEventsHref({ name: city, slug: CITY_SLUG_BY_TITLE[city] });
  }
  return null;
}

export function resolveBlogConcertGenreHref(citySlug: string, genre = 'Джаз'): string {
  return concertsLandingHref(citySlug, genre);
}

export function isCityBoundArticle(city?: string | null, citySlug?: string | null): boolean {
  return Boolean(resolveBlogCityHref(city, citySlug));
}
