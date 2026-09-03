/**
 * Drop foreign-city sessions that leaked onto a venue PDP via fuzzy name attach
 * (e.g. TicketsCloud «Эрмитаж» in Krasnoyarsk on SPB Hermitage).
 * Backend also filters; this is a web belt until API is restarted.
 */

function foldCityKey(value: string | null | undefined): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-z0-9а-я]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const CITY_ALIASES: Record<string, string> = {
  moscow: 'moskva',
  moskva: 'moskva',
  'saint petersburg': 'sankt peterburg',
  'sankt peterburg': 'sankt peterburg',
  spb: 'sankt peterburg',
  peterburg: 'sankt peterburg',
  petersburg: 'sankt peterburg',
  'санкт петербург': 'sankt peterburg',
  красноярск: 'krasnoyarsk',
  krasnoyarsk: 'krasnoyarsk',
};

function canonicalCityKey(value: string | null | undefined): string {
  const folded = foldCityKey(value);
  if (!folded) return '';
  return CITY_ALIASES[folded] || folded;
}

export function sameVenuePageCity(
  venue: { city?: string | null; citySlug?: string | null },
  session: { city?: string | null; citySlug?: string | null; sourceCitySlug?: string | null },
): boolean {
  const left =
    canonicalCityKey(venue.citySlug) || canonicalCityKey(venue.city);
  const right =
    canonicalCityKey(session.citySlug) ||
    canonicalCityKey(session.sourceCitySlug) ||
    canonicalCityKey(session.city);
  if (!left || !right) return true;
  return left === right;
}

export function filterVenuePageSessionsByCity<T extends {
  city?: string | null;
  citySlug?: string | null;
  sourceCitySlug?: string | null;
}>(
  sessions: T[],
  venue: { city?: string | null; citySlug?: string | null } | null | undefined,
): T[] {
  if (!venue || !sessions?.length) return sessions || [];
  return sessions.filter((session) => sameVenuePageCity(venue, session));
}
