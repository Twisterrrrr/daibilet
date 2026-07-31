/**
 * Shared city-scope + SSR pagination for public landing pages.
 * Kept free of dto/db imports so unit tests stay lightweight.
 */

const CITY_SLUG_CANONICAL: Record<string, string> = {
  moscow: 'moskva',
  moskva: 'moskva',
  'saint-petersburg': 'sankt-peterburg',
  'sankt-peterburg': 'sankt-peterburg',
  'nizhny-novgorod': 'nizhniy-novgorod',
  'nizhniy-novgorod': 'nizhniy-novgorod',
  'veliky-novgorod': 'velikiy-novgorod',
  'velikiy-novgorod': 'velikiy-novgorod',
  rostov: 'rostov-na-donu',
  'rostov-on-don': 'rostov-na-donu',
  'rostov-na-donu': 'rostov-na-donu',
};

const PUBLIC_CITY_PATH_SEGMENT = new Set([
  'moscow',
  'saint-petersburg',
  'kazan',
  'ekaterinburg',
  'nizhny-novgorod',
  'samara',
  'novosibirsk',
  'sochi',
  'kaliningrad',
  'rostov-na-donu',
  'volgograd',
  'perm',
  'krasnoyarsk',
  'yaroslavl',
  'tver',
]);

function publicCitySlug(value?: string | null): string {
  const letters: Record<string, string> = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'e',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'h',
    ц: 'c',
    ч: 'ch',
    ш: 'sh',
    щ: 'sch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
  };
  return String(value || '')
    .trim()
    .toLowerCase()
    .split('')
    .map((character) => letters[character] ?? character)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function canonicalCitySlug(value?: string | null): string {
  const slug = publicCitySlug(value) || String(value || '').trim().toLowerCase();
  return CITY_SLUG_CANONICAL[slug] || slug;
}

function resolvePromoCitySlug(cityFilter?: string | null): string | null {
  const key = String(cityFilter || '')
    .trim()
    .toLowerCase();
  if (!key || key === 'all') return null;
  if (PUBLIC_CITY_PATH_SEGMENT.has(key)) return key === 'moskva' ? 'moscow' : key;
  const canonical = canonicalCitySlug(key);
  if (canonical === 'moskva') return 'moscow';
  if (canonical === 'sankt-peterburg') return 'saint-petersburg';
  if (PUBLIC_CITY_PATH_SEGMENT.has(canonical)) return canonical;
  if (key.includes('моск')) return 'moscow';
  if (key.includes('петерб') || key.includes('spb')) return 'saint-petersburg';
  if (key.includes('казан')) return 'kazan';
  if (key.includes('самар')) return 'samara';
  return null;
}

export type LandingSessionCityFields = {
  city?: string | null;
  destination?: string | null;
  citySlug?: string | null;
  sourceCitySlug?: string | null;
};

/** Lean SSR grid budget; stats must use uncapped city-scoped matchCount. */
export const LANDING_PAGE_SESSION_LIMIT = 48;

export function scopePublicCatalogSessions<T extends LandingSessionCityFields>(
  sessions: T[],
  cityFilter?: string | null,
): T[] {
  const key = String(cityFilter || '')
    .trim()
    .toLowerCase();
  if (!key || key === 'all') return sessions;
  const canonical = canonicalCitySlug(key);
  const keys = new Set<string>([key, canonical].filter(Boolean));
  const seoSlug = resolvePromoCitySlug(key);
  if (seoSlug) {
    keys.add(seoSlug);
    keys.add(canonicalCitySlug(seoSlug));
  }
  return sessions.filter((session) => {
    const cityName = String(session.city || '').toLowerCase();
    const destination = String(session.destination || '').toLowerCase();
    const citySlug = String(session.citySlug || session.sourceCitySlug || '').toLowerCase();
    const sessionCanon = canonicalCitySlug(citySlug || cityName);
    return (
      keys.has(cityName) ||
      keys.has(destination) ||
      keys.has(citySlug) ||
      (Boolean(sessionCanon) && keys.has(sessionCanon))
    );
  });
}

/**
 * City-scope landing matches BEFORE the SSR cap so hub cards and /{landing}/{city}
 * share the same event count (landings-catalog?city= / city hub facets).
 */
export function selectLandingPageSessions<T extends LandingSessionCityFields>(
  matchedSessions: T[],
  cityFilter: string | null | undefined = '',
  limit: number = LANDING_PAGE_SESSION_LIMIT,
): { matchedSessions: T[]; pageSessions: T[]; matchCount: number } {
  const scoped = scopePublicCatalogSessions(matchedSessions, cityFilter);
  const pageLimit = Math.max(0, Number(limit) || LANDING_PAGE_SESSION_LIMIT);
  return {
    matchedSessions: scoped,
    pageSessions: scoped.slice(0, pageLimit),
    matchCount: scoped.length,
  };
}
