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

/**
 * Night hub heroes restored under `/images/cities/night/` (git history before night→day overwrite).
 * Catalog/home keep daytime; hubs without a night asset fall back to day.
 */
const CITY_NIGHT_HUB_SLUGS = new Set([
  'astrahan',
  'barnaul',
  'belgorod',
  'bryansk',
  'cheboksary',
  'chelyabinsk',
  'chita',
  'ekaterinburg',
  'habarovsk',
  'irkutsk',
  'ivanovo',
  'izhevsk',
  'kaliningrad',
  'kazan',
  'kemerovo',
  'kirov-kirovskaya-oblast',
  'krasnodar',
  'krasnoyarsk',
  'kurgan',
  'kursk',
  'lipeck',
  'moscow',
  'nizhny-novgorod',
  'novosibirsk',
  'omsk',
  'orel',
  'orenburg',
  'penza',
  'perm',
  'rostov-on-don',
  'ryazan',
  'saint-petersburg',
  'samara',
  'saransk',
  'saratov',
  'smolensk',
  'sochi',
  'sortavala',
  'stavropol',
  'suzdal',
  'tambov',
  'tomsk',
  'tula',
  'tver',
  'tyumen',
  'ufa',
  'ulan-ude',
  'ulyanovsk',
  'veliky-novgorod',
  'vladimir',
  'vladivostok',
  'volgograd',
  'vologda',
  'voronezh',
  'yaroslavl',
  'yoshkar-ola',
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

export function cityHasNightHubImage(city: CityImageSource): boolean {
  return CITY_NIGHT_HUB_SLUGS.has(cityCardImageSlug(city));
}

/** Distinct daytime previews for `/cities` featured tiles + home destinations. */
export function resolveCityTopPreviewImage(city: CityImageSource): string | null {
  const imageSlug = cityCardImageSlug(city);
  if (!CITY_DAYTIME_PREVIEW_SLUGS.has(imageSlug)) return null;
  return `/images/cities/top/${imageSlug}.jpg`;
}

/** Catalog/home card src: sibling `-thumb.jpg` (~640px). Hub hero stays full / night. */
export function resolveCityCardThumbImage(city: CityImageSource): string | null {
  const daytime = resolveCityTopPreviewImage(city);
  if (!daytime) return null;
  return daytime.replace(/\.jpe?g$/i, '-thumb.jpg');
}

/** Night hero for city hub (`/cities/[slug]`). */
export function resolveCityNightImage(city: CityImageSource): string | null {
  const imageSlug = cityCardImageSlug(city);
  if (!CITY_NIGHT_HUB_SLUGS.has(imageSlug)) return null;
  return `/images/cities/night/${imageSlug}.png`;
}

export function resolveCityCardImage(
  city: CityImageSource,
  options?: { variant?: 'default' | 'top' },
): string | null {
  const cardThumb = resolveCityCardThumbImage(city);
  if (options?.variant === 'top' && cardThumb) return cardThumb;

  const fromApi = city.heroImageUrl?.trim();
  if (fromApi && isUsableRemoteImage(fromApi)) return fromApi;

  // Prefer daytime card thumb over legacy PNG so catalog/home never keep night covers primary.
  if (cardThumb) return cardThumb;

  const imageSlug = cityCardImageSlug(city);
  if (!CITY_CARD_IMAGE_SLUGS.has(imageSlug)) return null;
  return `/images/cities/${imageSlug}.png`;
}

/** Hero / OG for city hub: night when restored, else full daytime, else remote/root. */
export function resolveCityImage(city: CityImageSource): string | null {
  const night = resolveCityNightImage(city);
  if (night) return night;

  const daytime = resolveCityTopPreviewImage(city);
  if (daytime) return daytime;

  const fromApi = city.heroImageUrl?.trim();
  if (fromApi && isUsableRemoteImage(fromApi)) return fromApi;

  const imageSlug = cityCardImageSlug(city);
  if (!CITY_CARD_IMAGE_SLUGS.has(imageSlug)) return null;
  return `/images/cities/${imageSlug}.png`;
}
