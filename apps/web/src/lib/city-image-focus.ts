import { citySlug } from '@/lib/routes';

/** Вертикальное (и при необходимости горизонтальное) кадрирование карточек городов. */
const CITY_IMAGE_OBJECT_POSITION: Record<string, string> = {
  chelyabinsk: '65% 57%',
  // Небоскрёбы (Исеть и др.) у верхнего края кадра - якорим к top, иначе hero их срезает.
  ekaterinburg: '72% 0%',
  irkutsk: '59% 52%',
  izhevsk: '60% 52%',
  kaliningrad: '65% 49%',
  kazan: '58% 56%',
  krasnodar: '59% 58%',
  krasnoyarsk: '54% 53%',
  moscow: '56% 54%',
  'nizhny-novgorod': 'center 54%',
  novosibirsk: '58% 56%',
  omsk: '65% 50%',
  orel: '62% 50%',
  orenburg: '65% 55%',
  penza: '65% 54%',
  perm: '65% 50%',
  'rostov-on-don': '58% 55%',
  ryazan: '65% 53%',
  'saint-petersburg': '63% 56%',
  samara: '65% 47%',
  saratov: '64% 53%',
  sochi: '65% 51%',
  sortavala: '54% 50%',
  stavropol: '65% 57%',
  suzdal: '65% 49%',
  tomsk: '61% 53%',
  tula: '59% 57%',
  tver: '60% 50%',
  tyumen: '65% 56%',
  ufa: '65% 50%',
  'ulan-ude': '60% 54%',
  ulyanovsk: '65% 53%',
  'veliky-novgorod': '65% 49%',
  vladivostok: 'center 56%',
  volgograd: '57% 53%',
  vologda: '65% 53%',
  voronezh: '54% 55%',
  yaroslavl: '64% 50%',
};

const SLUG_ALIASES: Record<string, string> = {
  moskva: 'moscow',
  msk: 'moscow',
  spb: 'saint-petersburg',
  'sankt-peterburg': 'saint-petersburg',
  'nizhniy-novgorod': 'nizhny-novgorod',
  'velikiy-novgorod': 'veliky-novgorod',
  'rostov-na-donu': 'rostov-on-don',
  rostov: 'rostov-on-don',
};

type CityFocusSource = {
  slug?: string | null;
  sourceSlug?: string | null;
  name: string;
};

export function resolveCityImageObjectPosition(city: CityFocusSource): string {
  const slug = citySlug(city);
  const key = SLUG_ALIASES[slug] || slug;
  return CITY_IMAGE_OBJECT_POSITION[key] || 'center 32%';
}

export function cityImageObjectPositionClass(city: CityFocusSource): string {
  const value = resolveCityImageObjectPosition(city).replace(/\s+/g, '_');
  return `object-[${value}]`;
}
