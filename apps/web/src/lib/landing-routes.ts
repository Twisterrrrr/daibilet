import { canonicalLandingSlug, CANONICAL_LANDING_SLUGS } from '@/lib/landing-constants';

export const LANDING_CATEGORY_PATH_BY_SLUG: Record<string, string> = {
  'river-cruises': 'rechnye-progulki',
  'bus-tours': 'avtobusnye-ekskursii',
  'river-party': 'vecherinki-na-teplohode',
  standup: 'stendap-i-yumor',
  'family-kids': 'detyam-i-semyam',
  'concerts-genre': 'kontserty',
  'active-sport': 'aktivnyj-otdyh',
  'walking-tours': 'peshie-ekskursii',
  'country-tours': 'zagorodnye-ekskursii',
  exhibitions: 'vystavki-i-muzei',
  'unusual-theatres': 'neobychnye-teatry',
  excursions: 'ekskursii',
  rooftops: 'progulki-po-krysham',
  'new-year': 'novyj-god',
  'salute-9-may': 'salut-9-maya',
};

export const CITY_LANDING_PATH_BY_SLUG: Record<string, string> = {
  'bridges-night': 'night-bridges',
  'spb-yards': 'spb-yards',
  'moscow-dinner-boat': 'dinner-boat',
  'moscow-museums': 'moscow-museums',
  planetarium: 'planetarium',
};

export const LANDING_SLUG_BY_CATEGORY_PATH: Record<string, string> = Object.fromEntries(
  Object.entries(LANDING_CATEGORY_PATH_BY_SLUG).map(([slug, path]) => [path, slug]),
);

export const LANDING_SLUG_BY_CITY_LANDING_PATH: Record<string, string> = Object.fromEntries(
  Object.entries(CITY_LANDING_PATH_BY_SLUG).map(([slug, path]) => [path, slug]),
);

/** Категории с ЧПУ `/{categoryPath}/{city}` (не `/{city}/…`). */
export const MULTI_CITY_LANDING_SLUGS = new Set<string>([
  CANONICAL_LANDING_SLUGS.river,
  CANONICAL_LANDING_SLUGS.bus,
  CANONICAL_LANDING_SLUGS.party,
  'standup',
  'family-kids',
  'concerts-genre',
  'active-sport',
  'walking-tours',
  'country-tours',
  'exhibitions',
  'unusual-theatres',
  'excursions',
  'rooftops',
  'salute-9-may',
  'new-year',
]);

/** Приоритетные города для sitemap / static params SEO-листингов. */
export const PRIORITY_LISTING_CITY_SLUGS = [
  'moscow',
  'saint-petersburg',
  'kazan',
  'ekaterinburg',
] as const;

/** Ограничения городов для узких SEO-посадок. */
export const LANDING_ALLOWED_CITY_SLUGS: Partial<Record<string, readonly string[]>> = {
  'country-tours': ['saint-petersburg'],
  rooftops: ['saint-petersburg'],
};

export const CITY_SCOPED_LANDING_SLUGS = new Set<string>(Object.keys(CITY_LANDING_PATH_BY_SLUG));

export const DEFAULT_CITY_BY_LANDING_SLUG: Record<string, string> = {
  'bridges-night': 'saint-petersburg',
  'spb-yards': 'saint-petersburg',
  'moscow-dinner-boat': 'moscow',
  'moscow-museums': 'moscow',
  planetarium: 'saint-petersburg',
};

const CITY_SLUG_ALIASES: Record<string, string> = {
  moscow: 'moscow',
  moskva: 'moscow',
  msk: 'moscow',
  spb: 'saint-petersburg',
  'saint-petersburg': 'saint-petersburg',
  'sankt-peterburg': 'saint-petersburg',
  peterburg: 'saint-petersburg',
  kazan: 'kazan',
  'nizhny-novgorod': 'nizhny-novgorod',
  'nizhniy-novgorod': 'nizhny-novgorod',
  samara: 'samara',
  volgograd: 'volgograd',
  yaroslavl: 'yaroslavl',
  krasnoyarsk: 'krasnoyarsk',
  perm: 'perm',
  novosibirsk: 'novosibirsk',
  tver: 'tver',
  rostov: 'rostov-on-don',
  'rostov-on-don': 'rostov-on-don',
  'rostov-na-donu': 'rostov-on-don',
  sochi: 'sochi',
  kaliningrad: 'kaliningrad',
  ekaterinburg: 'ekaterinburg',
};

const KNOWN_CITY_SLUGS = new Set<string>([...Object.values(CITY_SLUG_ALIASES), ...Object.keys(CITY_SLUG_ALIASES)]);

const CITY_URL_SEGMENT: Record<string, string> = {
  moscow: 'moscow',
  'saint-petersburg': 'saint-petersburg',
  kazan: 'kazan',
  'nizhny-novgorod': 'nizhny-novgorod',
  samara: 'samara',
  volgograd: 'volgograd',
  yaroslavl: 'yaroslavl',
  krasnoyarsk: 'krasnoyarsk',
  perm: 'perm',
  novosibirsk: 'novosibirsk',
  tver: 'tver',
  'rostov-on-don': 'rostov-on-don',
  sochi: 'sochi',
  kaliningrad: 'kaliningrad',
  ekaterinburg: 'ekaterinburg',
};

export function normalizeCitySlug(segment: string | null | undefined): string | null {
  const key = String(segment || '').trim().toLowerCase();
  if (!key) return null;
  return CITY_SLUG_ALIASES[key] || key;
}

export function normalizeKnownCitySlug(segment: string | null | undefined): string | null {
  const key = String(segment || '').trim().toLowerCase();
  if (!key) return null;
  if (key in CITY_SLUG_ALIASES) return CITY_SLUG_ALIASES[key];
  if (KNOWN_CITY_SLUGS.has(key)) return key;
  return null;
}

export function cityPathSegment(citySlug: string | null | undefined): string | null {
  const canonical = normalizeCitySlug(citySlug);
  if (!canonical) return null;
  return CITY_URL_SEGMENT[canonical] || canonical;
}

export function isCityScopedLanding(slug: string): boolean {
  return CITY_SCOPED_LANDING_SLUGS.has(canonicalLandingSlug(slug));
}

export function isLandingCityAllowed(landingSlug: string, citySlug: string): boolean {
  const allowed = LANDING_ALLOWED_CITY_SLUGS[canonicalLandingSlug(landingSlug)];
  return !allowed || allowed.includes(citySlug);
}

export type LandingRouteTarget = {
  landingSlug: string;
  citySlug?: string;
  categoryPath: string;
  subcategoryPath?: string;
};

function resolveCityFirstRoute(segment1: string, segment2?: string, segment3?: string): LandingRouteTarget | null {
  const citySlug = normalizeKnownCitySlug(segment1);
  if (!citySlug || !segment2) return null;

  const landingSlug = LANDING_SLUG_BY_CITY_LANDING_PATH[segment2.toLowerCase()];
  if (!landingSlug || !isCityScopedLanding(landingSlug)) return null;

  const defaultCity = DEFAULT_CITY_BY_LANDING_SLUG[landingSlug];
  if (defaultCity && citySlug !== defaultCity) return null;

  return {
    landingSlug,
    citySlug,
    categoryPath: segment2,
    subcategoryPath: segment3,
  };
}

function resolveCategoryFirstRoute(segment1: string, segment2?: string, segment3?: string): LandingRouteTarget | null {
  const landingSlug = LANDING_SLUG_BY_CATEGORY_PATH[segment1.toLowerCase()];
  if (!landingSlug) return null;

  const cityFromPath = normalizeKnownCitySlug(segment2);
  if (cityFromPath) {
    if (!isLandingCityAllowed(landingSlug, cityFromPath)) return null;
    return {
      landingSlug,
      citySlug: cityFromPath,
      categoryPath: segment1,
      subcategoryPath: segment3,
    };
  }

  return {
    landingSlug,
    categoryPath: segment1,
    subcategoryPath: segment2,
  };
}

export function resolveLandingRouteFromLocation(pathname: string): LandingRouteTarget | null {
  const normalizedPath = String(pathname || '/').replace(/\/+$/, '') || '/';
  const match = normalizedPath.match(/^\/([^/]+)(?:\/([^/]+)(?:\/([^/]+))?)?$/);
  if (!match) return null;

  const segment1 = match[1].toLowerCase();
  const segment2 = match[2]?.toLowerCase();
  const segment3 = match[3]?.toLowerCase();

  const cityFirst = resolveCityFirstRoute(segment1, segment2, segment3);
  if (cityFirst) return cityFirst;

  if (normalizeKnownCitySlug(segment1) && LANDING_SLUG_BY_CATEGORY_PATH[segment2 || '']) {
    return null;
  }

  return resolveCategoryFirstRoute(segment1, segment2, segment3);
}

export function landingCategoryHref(
  landingSlug: string,
  citySlug?: string | null,
  options?: { subcategory?: string },
): string {
  const slug = canonicalLandingSlug(landingSlug);

  if (isCityScopedLanding(slug)) {
    const city = DEFAULT_CITY_BY_LANDING_SLUG[slug] || citySlug;
    const citySegment = cityPathSegment(city);
    if (!citySegment) return `/${CITY_LANDING_PATH_BY_SLUG[slug] || slug}/`;
    const topic = CITY_LANDING_PATH_BY_SLUG[slug] || slug;
    const segments = [citySegment, topic];
    if (options?.subcategory) segments.push(options.subcategory.replace(/^\/+|\/+$/g, ''));
    return `/${segments.join('/')}/`;
  }

  const categoryPath = LANDING_CATEGORY_PATH_BY_SLUG[slug] || slug;
  const segments = [categoryPath];

  if (citySlug && MULTI_CITY_LANDING_SLUGS.has(slug) && isLandingCityAllowed(slug, citySlug)) {
    const citySegment = cityPathSegment(citySlug);
    if (citySegment) segments.push(citySegment);
  }

  if (options?.subcategory) {
    segments.push(options.subcategory.replace(/^\/+|\/+$/g, ''));
  }

  return `/${segments.join('/')}/`;
}

export function resolveMisorderedLandingRedirect(pathname: string): string | null {
  const normalized = String(pathname || '').replace(/\/+$/, '') || '/';
  const match = normalized.match(/^\/([^/]+)\/([^/]+)$/i);
  if (!match) return null;

  const citySlug = normalizeKnownCitySlug(match[1]);
  const categoryPath = match[2].toLowerCase();
  const landingSlug = LANDING_SLUG_BY_CATEGORY_PATH[categoryPath];
  if (!citySlug || !landingSlug || !MULTI_CITY_LANDING_SLUGS.has(landingSlug)) return null;
  if (!isLandingCityAllowed(landingSlug, citySlug)) return null;

  return landingCategoryHref(landingSlug, citySlug);
}

export function resolveLegacyLandingRedirect(pathname: string): string | null {
  const normalized = String(pathname || '').replace(/\/+$/, '') || '/';

  const misordered = resolveMisorderedLandingRedirect(normalized);
  if (misordered) return misordered;

  const withCity = normalized.match(/^\/landings\/([^/]+)\/([^/]+)$/i);
  if (withCity) {
    const landingSlug = canonicalLandingSlug(decodeURIComponent(withCity[1]));
    const citySlug = normalizeCitySlug(decodeURIComponent(withCity[2])) || decodeURIComponent(withCity[2]).toLowerCase();
    return landingCategoryHref(landingSlug, citySlug);
  }

  const national = normalized.match(/^\/landings\/([^/]+)$/i);
  if (national) {
    const landingSlug = canonicalLandingSlug(decodeURIComponent(national[1]));
    return landingCategoryHref(landingSlug);
  }

  // Old slug paths without /landings prefix, e.g. /river-cruises → /rechnye-progulki/
  const bareCategory = normalized.match(/^\/([^/]+)$/i);
  if (bareCategory) {
    const segment = decodeURIComponent(bareCategory[1]).toLowerCase();
    if (LANDING_CATEGORY_PATH_BY_SLUG[segment]) {
      return landingCategoryHref(canonicalLandingSlug(segment));
    }
  }

  const bareCategoryWithCity = normalized.match(/^\/([^/]+)\/([^/]+)$/i);
  if (bareCategoryWithCity) {
    const segment = decodeURIComponent(bareCategoryWithCity[1]).toLowerCase();
    if (LANDING_CATEGORY_PATH_BY_SLUG[segment]) {
      const citySlug =
        normalizeCitySlug(decodeURIComponent(bareCategoryWithCity[2])) ||
        decodeURIComponent(bareCategoryWithCity[2]).toLowerCase();
      return landingCategoryHref(canonicalLandingSlug(segment), citySlug);
    }
  }

  return null;
}

export function listLandingStaticParamsOne(): Array<{ segment: string }> {
  return Object.entries(LANDING_CATEGORY_PATH_BY_SLUG)
    .filter(([slug]) => !LANDING_ALLOWED_CITY_SLUGS[slug])
    .map(([, segment]) => ({ segment }));
}

export function listLandingStaticParamsTwo(): Array<{ segment: string; segment2: string }> {
  const paths: Array<{ segment: string; segment2: string }> = [];
  for (const [landingSlug, categoryPath] of Object.entries(LANDING_CATEGORY_PATH_BY_SLUG)) {
    if (!MULTI_CITY_LANDING_SLUGS.has(landingSlug)) continue;
    for (const city of PRIORITY_LISTING_CITY_SLUGS) {
      if (!isLandingCityAllowed(landingSlug, city)) continue;
      paths.push({ segment: categoryPath, segment2: city });
    }
  }
  for (const slug of Object.keys(CITY_LANDING_PATH_BY_SLUG)) {
    const citySegment = cityPathSegment(DEFAULT_CITY_BY_LANDING_SLUG[slug]);
    const topic = CITY_LANDING_PATH_BY_SLUG[slug];
    if (citySegment && topic) paths.push({ segment: citySegment, segment2: topic });
  }
  return paths;
}

export function landingPageHref(slug: string, citySlug?: string) {
  return landingCategoryHref(slug, citySlug);
}

export function busLandingHref(citySlug?: string) {
  return landingCategoryHref(CANONICAL_LANDING_SLUGS.bus, citySlug);
}

export function riverLandingHref(citySlug?: string) {
  return landingCategoryHref(CANONICAL_LANDING_SLUGS.river, citySlug);
}

export function partyLandingHref(citySlug?: string) {
  return landingCategoryHref(CANONICAL_LANDING_SLUGS.party, citySlug);
}

/** Теги жанров на лендинге «Концерты» (совпадают с EventTag.title). */
const CONCERT_GENRE_TAGS = ['Рок', 'Джаз', 'Классика', 'Поп', 'Эстрада', 'Металл', 'Орган'] as const;

const CONCERT_GENRE_ALIASES: Record<string, (typeof CONCERT_GENRE_TAGS)[number]> = {
  jazz: 'Джаз',
  dzhaz: 'Джаз',
  джаз: 'Джаз',
  rock: 'Рок',
  rok: 'Рок',
  рок: 'Рок',
  classic: 'Классика',
  klassika: 'Классика',
  классика: 'Классика',
  pop: 'Поп',
  estrada: 'Эстрада',
  эстрада: 'Эстрада',
  metal: 'Металл',
  metall: 'Металл',
  organ: 'Орган',
};

export function resolveConcertGenreTag(value?: string | null): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const alias = CONCERT_GENRE_ALIASES[raw.toLowerCase()];
  if (alias) return alias;
  const exact = CONCERT_GENRE_TAGS.find((tag) => tag.toLowerCase() === raw.toLowerCase());
  return exact || null;
}

/** /kontserty/moscow/?genre=Джаз — лендинг концертов с городом и жанром. */
export function concertsLandingHref(citySlug?: string | null, genre?: string | null): string {
  const citySegment = citySlug ? cityPathSegment(citySlug) || citySlug : null;
  const base = citySegment ? `/kontserty/${citySegment}/` : '/kontserty/';
  const genreTag = resolveConcertGenreTag(genre);
  if (!genreTag) return base;
  return `${base}?genre=${encodeURIComponent(genreTag)}`;
}
