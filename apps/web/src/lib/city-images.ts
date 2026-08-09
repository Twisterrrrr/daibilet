import { citySlug } from '@/lib/routes';

type CityImageSource = {
  slug?: string | null;
  sourceSlug?: string | null;
  name: string;
  heroImageUrl?: string | null;
};

const CITY_CARD_IMAGE_ALIASES: Record<string, string> = {
  moskva: 'moscow',
  'sankt-peterburg': 'saint-petersburg',
  'nizhniy-novgorod': 'nizhny-novgorod',
  'velikiy-novgorod': 'veliky-novgorod',
  'rostov-na-donu': 'rostov-on-don',
  rostov: 'rostov-on-don',
  khabarovsk: 'habarovsk',
  lipetsk: 'lipeck',
  kirov: 'kirov-kirovskaya-oblast',
  arkhangelsk: 'arhangelsk',
  astrakhan: 'astrahan',
  blagoveshchensk: 'blagoveschensk-amurskaya-oblast',
  'blagoveshchensk-amurskaya-oblast': 'blagoveschensk-amurskaya-oblast',
  'yuzhno-sakhalinsk': 'yuzhno-sahalinsk',
};

const CITY_CARD_IMAGE_SLUGS = new Set([
  'saint-petersburg',
  'moscow',
  'kazan',
  'kaliningrad',
  'vladivostok',
  'vologda',
  'irkutsk',
  'perm',
  'samara',
  'sochi',
  'ekaterinburg',
  'nizhny-novgorod',
  'novosibirsk',
  'krasnodar',
  'suzdal',
  'veliky-novgorod',
  'voronezh',
  'yaroslavl',
  'krasnoyarsk',
  'omsk',
  'chelyabinsk',
  'rostov-on-don',
  'saratov',
  'tula',
  'tver',
  'tyumen',
  'ufa',
  'ulan-ude',
  'ryazan',
  'stavropol',
  'tomsk',
  'ulyanovsk',
  'izhevsk',
  'orel',
  'orenburg',
  'penza',
  'volgograd',
  'sortavala',
  // Daytime covers (replaced night batch + next catalog cities)
  'habarovsk',
  'barnaul',
  'cheboksary',
  'lipeck',
  'kurgan',
  'ivanovo',
  'kirov-kirovskaya-oblast',
  'bryansk',
  'kemerovo',
  'smolensk',
  'tambov',
  'vladimir',
  'yoshkar-ola',
  'kursk',
  'saransk',
  'chita',
  'astrahan',
  'belgorod',
  'syktyvkar',
  'yuzhno-sahalinsk',
  'arhangelsk',
  'blagoveschensk-amurskaya-oblast',
  'kaluga',
  'kostroma',
  'murmansk',
  'pskov',
  'abakan',
  'sevastopol',
  'simferopol',
]);

/**
 * Daytime landmark previews that pin a city into the `/cities` top-8 ranking.
 * Keep this set at 8 so second-octet cities stay below the map.
 */
const CITY_TOP_PREVIEW_SLUGS = new Set([
  'saint-petersburg',
  'moscow',
  'kazan',
  'ekaterinburg',
  'nizhny-novgorod',
  'samara',
  'sochi',
  'kaliningrad',
]);

/** Daytime JPG assets under `/images/cities/top/`. */
const CITY_DAYTIME_PREVIEW_SLUGS = new Set([
  ...CITY_TOP_PREVIEW_SLUGS,
  // Second octet (after map)
  'krasnodar',
  'krasnoyarsk',
  'novosibirsk',
  'voronezh',
  'ufa',
  'perm',
  'chelyabinsk',
  'ryazan',
  // Third octet
  'rostov-on-don',
  'tyumen',
  'omsk',
  'penza',
  'saratov',
  'tula',
  'tver',
  'vladivostok',
  // Fourth batch: replace night covers + remaining catalog without cover
  'habarovsk',
  'barnaul',
  'cheboksary',
  'lipeck',
  'kurgan',
  'ivanovo',
  'kirov-kirovskaya-oblast',
  'bryansk',
  'kemerovo',
  'smolensk',
  'tambov',
  'vladimir',
  'yoshkar-ola',
  'kursk',
  'saransk',
  'chita',
  'astrahan',
  'belgorod',
  'syktyvkar',
  'yuzhno-sahalinsk',
  'arhangelsk',
  'blagoveschensk-amurskaya-oblast',
  'kaluga',
  'kostroma',
  'murmansk',
  'pskov',
  'abakan',
  'sevastopol',
  'simferopol',
  // Fifth batch: remaining night PNGs shown on /cities (owner red-V + suzdal/sortavala)
  'irkutsk',
  'yaroslavl',
  'volgograd',
  'tomsk',
  'ulyanovsk',
  'stavropol',
  'izhevsk',
  'orenburg',
  'veliky-novgorod',
  'ulan-ude',
  'orel',
  'vologda',
  'suzdal',
  'sortavala',
]);

function isUsableRemoteImage(url: string): boolean {
  return /^https?:\/\//i.test(url) && !url.startsWith('/images/cities/');
}

function cityCardImageSlug(city: CityImageSource): string {
  const slug = citySlug(city);
  return CITY_CARD_IMAGE_ALIASES[slug] || slug;
}

/** Normalized image slug (aliases applied) for dedupe / exclude sets. */
export function cityImageSlug(city: CityImageSource): string {
  return cityCardImageSlug(city);
}

export function cityHasTopPreview(city: CityImageSource): boolean {
  return CITY_TOP_PREVIEW_SLUGS.has(cityCardImageSlug(city));
}

/** Daytime JPG under `cities/top/` (top-8 pins + later daytime sets). */
export function cityHasDaytimePreview(city: CityImageSource): boolean {
  return CITY_DAYTIME_PREVIEW_SLUGS.has(cityCardImageSlug(city));
}

/** Distinct daytime previews for `/cities` featured tiles. */
export function resolveCityTopPreviewImage(city: CityImageSource): string | null {
  const imageSlug = cityCardImageSlug(city);
  if (!CITY_DAYTIME_PREVIEW_SLUGS.has(imageSlug)) return null;
  return `/images/cities/top/${imageSlug}.jpg`;
}

export function resolveCityCardImage(
  city: CityImageSource,
  options?: { variant?: 'default' | 'top' },
): string | null {
  const daytime = resolveCityTopPreviewImage(city);
  if (options?.variant === 'top' && daytime) return daytime;

  const fromApi = city.heroImageUrl?.trim();
  if (fromApi && isUsableRemoteImage(fromApi)) return fromApi;

  // Prefer daytime JPG over legacy PNG so catalog never keeps night covers primary.
  if (daytime) return daytime;

  const imageSlug = cityCardImageSlug(city);
  if (!CITY_CARD_IMAGE_SLUGS.has(imageSlug)) return null;
  return `/images/cities/${imageSlug}.png`;
}

/** Hero / full-width city image (same sources as card). */
export function resolveCityImage(city: CityImageSource): string | null {
  return resolveCityCardImage(city);
}
