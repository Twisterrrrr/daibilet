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
]);

export function resolveCityImage(city: CityImageSource): string | null {
  const fromApi = city.heroImageUrl?.trim();
  if (fromApi) return fromApi;

  const slug = citySlug(city);
  const imageSlug = CITY_CARD_IMAGE_ALIASES[slug] || slug;
  if (!CITY_CARD_IMAGE_SLUGS.has(imageSlug)) return null;
  return `/images/cities/${imageSlug}.png`;
}

export function resolveCityCardImage(city: CityImageSource): string | null {
  return resolveCityImage(city);
}
