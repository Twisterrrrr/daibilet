import type { PublicDestinationDto } from '@daibilet/contracts/public';

function citySlug(city: PublicDestinationDto): string {
  return String(city.slug || '').trim().toLowerCase();
}

export function isPopularRailMoscow(city: PublicDestinationDto): boolean {
  const slug = citySlug(city);
  return slug === 'moscow' || slug === 'moskva';
}

export function isPopularRailSpb(city: PublicDestinationDto): boolean {
  const slug = citySlug(city);
  return (
    slug === 'saint-petersburg' ||
    slug === 'sankt-peterburg' ||
    slug === 'spb' ||
    slug === 'peterburg'
  );
}

/** Keep top-N by events, then pin Moscow + SPB to the front for the focal pair. */
export function orderPopularRailCities(
  cities: PublicDestinationDto[],
  limit = 12,
): PublicDestinationDto[] {
  const byEvents = [...cities]
    .sort((a, b) => b.events - a.events || a.name.localeCompare(b.name, 'ru'))
    .slice(0, limit);
  const moscow = byEvents.find(isPopularRailMoscow);
  const spb = byEvents.find(isPopularRailSpb);
  const rest = byEvents.filter((city) => !isPopularRailMoscow(city) && !isPopularRailSpb(city));
  return [...(moscow ? [moscow] : []), ...(spb ? [spb] : []), ...rest];
}
