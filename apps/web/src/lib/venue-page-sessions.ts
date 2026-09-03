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
  екатеринбург: 'ekaterinburg',
  ekaterinburg: 'ekaterinburg',
  казань: 'kazan',
  kazan: 'kazan',
  новосибирск: 'novosibirsk',
  novosibirsk: 'novosibirsk',
  самара: 'samara',
  samara: 'samara',
  уфа: 'ufa',
  ufa: 'ufa',
  'нижний новгород': 'nizhny novgorod',
  'nizhny novgorod': 'nizhny novgorod',
  пермь: 'perm',
  perm: 'perm',
  ростов: 'rostov',
  'rostov on don': 'rostov',
  сочи: 'sochi',
  sochi: 'sochi',
  калининград: 'kaliningrad',
  kaliningrad: 'kaliningrad',
};

function canonicalCityKey(value: string | null | undefined): string {
  const folded = foldCityKey(value);
  if (!folded) return '';
  return CITY_ALIASES[folded] || folded;
}

/** City tokens that often leak into tour titles («… / Красноярск»). */
const TITLE_CITY_MARKERS: Array<{ re: RegExp; key: string }> = [
  { re: /\bкрасноярск\w*/iu, key: 'krasnoyarsk' },
  { re: /\bkrasnoyarsk\b/iu, key: 'krasnoyarsk' },
  { re: /\bекатеринбург\w*/iu, key: 'ekaterinburg' },
  { re: /\bekaterinburg\b/iu, key: 'ekaterinburg' },
  { re: /\bказан[ьи]\w*/iu, key: 'kazan' },
  { re: /\bновосибирск\w*/iu, key: 'novosibirsk' },
  { re: /\bсамар[аеы]\b/iu, key: 'samara' },
  { re: /\bуф[аеы]\b/iu, key: 'ufa' },
  { re: /\bперм[ьи]\w*/iu, key: 'perm' },
  { re: /\bсочи\b/iu, key: 'sochi' },
  { re: /\bкалининград\w*/iu, key: 'kaliningrad' },
  { re: /\bмоскв[аеыу]\b/iu, key: 'moskva' },
  { re: /\bmoscow\b/iu, key: 'moskva' },
];

function titleImpliesForeignCity(
  title: string | null | undefined,
  venueCityKey: string,
): boolean {
  if (!venueCityKey || !title) return false;
  const text = String(title);
  for (const marker of TITLE_CITY_MARKERS) {
    if (!marker.re.test(text)) continue;
    if (marker.key !== venueCityKey) return true;
  }
  return false;
}

export function sameVenuePageCity(
  venue: { city?: string | null; citySlug?: string | null },
  session: {
    city?: string | null;
    citySlug?: string | null;
    sourceCitySlug?: string | null;
    title?: string | null;
    eventTitle?: string | null;
  },
): boolean {
  const left = canonicalCityKey(venue.citySlug) || canonicalCityKey(venue.city);
  const right =
    canonicalCityKey(session.citySlug) ||
    canonicalCityKey(session.sourceCitySlug) ||
    canonicalCityKey(session.city);
  if (left && right && left !== right) return false;
  const title = session.title || session.eventTitle;
  if (left && titleImpliesForeignCity(title, left)) return false;
  return true;
}

export function filterVenuePageSessionsByCity<
  T extends {
    city?: string | null;
    citySlug?: string | null;
    sourceCitySlug?: string | null;
    title?: string | null;
    eventTitle?: string | null;
  },
>(
  sessions: T[],
  venue: { city?: string | null; citySlug?: string | null } | null | undefined,
): T[] {
  if (!venue || !sessions?.length) return sessions || [];
  return sessions.filter((session) => sameVenuePageCity(venue, session));
}
