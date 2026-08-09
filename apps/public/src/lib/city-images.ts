import { citySlug } from '@/routes';

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

/** Daytime JPG under `/images/cities/top/` when available; else legacy PNG. */
const CITY_DAYTIME_PREVIEW_SLUGS = new Set([
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
  'saint-petersburg',
  'moscow',
  'kazan',
  'ekaterinburg',
  'nizhny-novgorod',
  'samara',
  'sochi',
  'kaliningrad',
  'krasnodar',
  'krasnoyarsk',
  'novosibirsk',
  'voronezh',
  'ufa',
  'perm',
  'chelyabinsk',
  'ryazan',
  'rostov-on-don',
  'tyumen',
  'omsk',
  'penza',
  'saratov',
  'tula',
  'tver',
  'vladivostok',
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

/** Night hub heroes under `/images/cities/night/`. */
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

function cityCardImageSlug(city: CityImageSource): string {
  const slug = citySlug(city);
  return CITY_CARD_IMAGE_ALIASES[slug] || slug;
}

function resolveCityTopPreviewImage(city: CityImageSource): string | null {
  const imageSlug = cityCardImageSlug(city);
  if (!CITY_DAYTIME_PREVIEW_SLUGS.has(imageSlug)) return null;
  return `/images/cities/top/${imageSlug}.jpg`;
}

function resolveCityNightImage(city: CityImageSource): string | null {
  const imageSlug = cityCardImageSlug(city);
  if (!CITY_NIGHT_HUB_SLUGS.has(imageSlug)) return null;
  return `/images/cities/night/${imageSlug}.png`;
}

/** Catalog / cards: daytime first. */
export function resolveCityCardImage(city: CityImageSource): string | null {
  const fromApi = city.heroImageUrl?.trim();
  if (fromApi) return fromApi;

  const daytime = resolveCityTopPreviewImage(city);
  if (daytime) return daytime;

  const imageSlug = cityCardImageSlug(city);
  if (!CITY_CARD_IMAGE_SLUGS.has(imageSlug)) return null;
  return `/images/cities/${imageSlug}.png`;
}

/** City hub hero: night when available, else daytime / API / root PNG. */
export function resolveCityImage(city: CityImageSource): string | null {
  const night = resolveCityNightImage(city);
  if (night) return night;

  const daytime = resolveCityTopPreviewImage(city);
  if (daytime) return daytime;

  const fromApi = city.heroImageUrl?.trim();
  if (fromApi) return fromApi;

  const imageSlug = cityCardImageSlug(city);
  if (!CITY_CARD_IMAGE_SLUGS.has(imageSlug)) return null;
  return `/images/cities/${imageSlug}.png`;
}
