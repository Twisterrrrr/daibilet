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

/** Daytime JPG assets under `/images/cities/top/` (top-8 + second octet). */
const CITY_DAYTIME_PREVIEW_SLUGS = new Set([
  ...CITY_TOP_PREVIEW_SLUGS,
  'krasnodar',
  'krasnoyarsk',
  'novosibirsk',
  'voronezh',
  'ufa',
  'perm',
  'chelyabinsk',
  'ryazan',
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

/** Daytime JPG under `cities/top/` (top-8 pins + second-octet set). */
export function cityHasDaytimePreview(city: CityImageSource): boolean {
  return CITY_DAYTIME_PREVIEW_SLUGS.has(cityCardImageSlug(city));
}

/** Distinct daytime previews for `/cities` featured tiles (top + second octet). */
export function resolveCityTopPreviewImage(city: CityImageSource): string | null {
  const imageSlug = cityCardImageSlug(city);
  if (!CITY_DAYTIME_PREVIEW_SLUGS.has(imageSlug)) return null;
  return `/images/cities/top/${imageSlug}.jpg`;
}

export function resolveCityCardImage(
  city: CityImageSource,
  options?: { variant?: 'default' | 'top' },
): string | null {
  if (options?.variant === 'top') {
    const top = resolveCityTopPreviewImage(city);
    if (top) return top;
  }

  const fromApi = city.heroImageUrl?.trim();
  if (fromApi && isUsableRemoteImage(fromApi)) return fromApi;

  const imageSlug = cityCardImageSlug(city);
  if (!CITY_CARD_IMAGE_SLUGS.has(imageSlug)) return null;
  return `/images/cities/${imageSlug}.png`;
}

/** Hero / full-width city image (same sources as card). */
export function resolveCityImage(city: CityImageSource): string | null {
  return resolveCityCardImage(city);
}
