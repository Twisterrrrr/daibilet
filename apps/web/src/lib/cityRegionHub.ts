import type { PublicDestinationDto } from '@daibilet/contracts/public';

export type CityCardRegion = {
  slug: string;
  name: string;
  eventCount: number;
};

/** Публичный регион → областной / республиканский центр. */
const REGION_HUBS: Array<{
  regionName: string;
  regionSlug: string;
  centerCity: string;
  centerSlugs?: string[];
}> = [
  { regionName: 'Московская область', regionSlug: 'moskovskaya-oblast', centerCity: 'Москва', centerSlugs: ['moskva', 'moscow'] },
  {
    regionName: 'Ленинградская область',
    regionSlug: 'leningradskaya-oblast',
    centerCity: 'Санкт-Петербург',
    centerSlugs: ['sankt-peterburg', 'saint-petersburg', 'spb'],
  },
  { regionName: 'Краснодарский край', regionSlug: 'krasnodarskiy-kray', centerCity: 'Краснодар', centerSlugs: ['krasnodar'] },
  { regionName: 'Красноярский край', regionSlug: 'krasnoyarskiy-kray', centerCity: 'Красноярск', centerSlugs: ['krasnoyarsk'] },
  { regionName: 'Республика Татарстан', regionSlug: 'respublika-tatarstan', centerCity: 'Казань', centerSlugs: ['kazan'] },
  { regionName: 'Ульяновская область', regionSlug: 'ulyanovskaya-oblast', centerCity: 'Ульяновск', centerSlugs: ['ulyanovsk'] },
  { regionName: 'Республика Хакасия', regionSlug: 'respublika-hakasiya', centerCity: 'Абакан', centerSlugs: ['abakan'] },
  { regionName: 'Хабаровский край', regionSlug: 'habarovskiy-kray', centerCity: 'Хабаровск', centerSlugs: ['habarovsk', 'khabarovsk'] },
  { regionName: 'Приморский край', regionSlug: 'primorskiy-kray', centerCity: 'Владивосток', centerSlugs: ['vladivostok'] },
  { regionName: 'Алтайский край', regionSlug: 'altayskiy-kray', centerCity: 'Барнаул', centerSlugs: ['barnaul'] },
  { regionName: 'Самарская область', regionSlug: 'samarskaya-oblast', centerCity: 'Самара', centerSlugs: ['samara'] },
  { regionName: 'Челябинская область', regionSlug: 'chelyabinskaya-oblast', centerCity: 'Челябинск', centerSlugs: ['chelyabinsk', 'cheljabinsk'] },
  { regionName: 'Кемеровская область', regionSlug: 'kemerovskaya-oblast', centerCity: 'Кемерово', centerSlugs: ['kemerovo'] },
  { regionName: 'Ростовская область', regionSlug: 'rostovskaya-oblast', centerCity: 'Ростов-на-Дону', centerSlugs: ['rostov-na-donu'] },
  { regionName: 'Свердловская область', regionSlug: 'sverdlovskaya-oblast', centerCity: 'Екатеринбург', centerSlugs: ['ekaterinburg', 'yekaterinburg'] },
  {
    regionName: 'Нижегородская область',
    regionSlug: 'nizhegorodskaya-oblast',
    centerCity: 'Нижний Новгород',
    centerSlugs: ['nizhniy-novgorod', 'nizhny-novgorod'],
  },
  { regionName: 'Оренбургская область', regionSlug: 'orenburgskaya-oblast', centerCity: 'Оренбург', centerSlugs: ['orenburg'] },
  { regionName: 'Тульская область', regionSlug: 'tulskaya-oblast', centerCity: 'Тула', centerSlugs: ['tula'] },
  { regionName: 'Вологодская область', regionSlug: 'vologodskaya-oblast', centerCity: 'Вологда', centerSlugs: ['vologda'] },
  { regionName: 'Ставропольский край', regionSlug: 'stavropolskiy-kray', centerCity: 'Ставрополь', centerSlugs: ['stavropol'] },
  { regionName: 'Калининградская область', regionSlug: 'kaliningradskaya-oblast', centerCity: 'Калининград', centerSlugs: ['kaliningrad'] },
  { regionName: 'Калужская область', regionSlug: 'kaluzhskaya-oblast', centerCity: 'Калуга', centerSlugs: ['kaluga'] },
  { regionName: 'Ярославская область', regionSlug: 'yaroslavskaya-oblast', centerCity: 'Ярославль', centerSlugs: ['yaroslavl'] },
  {
    regionName: 'Республика Башкортостан',
    regionSlug: 'respublika-bashkortostan',
    centerCity: 'Уфа',
    centerSlugs: ['ufa'],
  },
  {
    regionName: 'Амурская область',
    regionSlug: 'amurskaya-oblast',
    centerCity: 'Благовещенск (Амурская область)',
    centerSlugs: ['blagoveschensk-amurskaya-oblast', 'blagoveshchensk-amurskaya-oblast'],
  },
  { regionName: 'Воронежская область', regionSlug: 'voronezhskaya-oblast', centerCity: 'Воронеж', centerSlugs: ['voronezh'] },
  { regionName: 'Владимирская область', regionSlug: 'vladimirskaya-oblast', centerCity: 'Владимир', centerSlugs: ['vladimir'] },
  { regionName: 'Тюменская область', regionSlug: 'tyumenskaya-oblast', centerCity: 'Тюмень', centerSlugs: ['tyumen'] },
  { regionName: 'Иркутская область', regionSlug: 'irkutskaya-oblast', centerCity: 'Иркутск', centerSlugs: ['irkutsk'] },
  { regionName: 'Пермский край', regionSlug: 'permskiy-kray', centerCity: 'Пермь', centerSlugs: ['perm'] },
  { regionName: 'Удмуртская Республика', regionSlug: 'udmurtskaya-respublika', centerCity: 'Ижевск', centerSlugs: ['izhevsk'] },
  { regionName: 'Псковская область', regionSlug: 'pskovskaya-oblast', centerCity: 'Псков', centerSlugs: ['pskov'] },
  { regionName: 'Липецкая область', regionSlug: 'lipetskaya-oblast', centerCity: 'Липецк', centerSlugs: ['lipetsk'] },
  { regionName: 'Тверская область', regionSlug: 'tverskaya-oblast', centerCity: 'Тверь', centerSlugs: ['tver'] },
  { regionName: 'Орловская область', regionSlug: 'orlovskaya-oblast', centerCity: 'Орёл', centerSlugs: ['orel', 'oryol'] },
  { regionName: 'Брянская область', regionSlug: 'bryanskaya-oblast', centerCity: 'Брянск', centerSlugs: ['bryansk'] },
  { regionName: 'Республика Коми', regionSlug: 'respublika-komi', centerCity: 'Сыктывкар', centerSlugs: ['syktyvkar'] },
  {
    regionName: 'Кировская область',
    regionSlug: 'kirovskaya-oblast',
    centerCity: 'Киров (Кировская область)',
    centerSlugs: ['kirov-kirovskaya-oblast', 'kirov'],
  },
];

const HUB_CITY_TO_REGION_SLUG = buildHubCityToRegionSlug();
const REGION_CENTER_BY_NAME = new Map(REGION_HUBS.map((hub) => [hub.regionName, hub.centerCity]));
const REGION_CENTER_BY_SLUG = new Map(REGION_HUBS.map((hub) => [hub.regionSlug, hub.centerCity]));
const REGION_NAME_BY_SLUG = new Map(REGION_HUBS.map((hub) => [hub.regionSlug, hub.regionName]));

/** Федеральные города: крошки без сегмента области. */
const FEDERAL_VENUE_BREADCRUMB_SLUGS = new Set([
  'moscow',
  'moskva',
  'msk',
  'saint-petersburg',
  'sankt-peterburg',
  'spb',
  'petersburg',
  'peterburg',
]);

const FEDERAL_VENUE_BREADCRUMB_NAMES = new Set(['москва', 'санкт-петербург', 'петербург', 'спб']);

function buildHubCityToRegionSlug() {
  const map: Record<string, string> = {};

  for (const hub of REGION_HUBS) {
    const keys = new Set<string>([normalizeKey(hub.centerCity), ...(hub.centerSlugs || []).map(normalizeKey)]);

    for (const key of keys) {
      if (key) map[key] = hub.regionSlug;
    }
  }

  return map;
}

function cityMatchesRegionCenter(
  input: { city?: string | null; citySlug?: string | null },
  centerCity: string,
  centerSlugs?: string[],
): boolean {
  const centerKeys = new Set<string>([normalizeKey(centerCity), ...(centerSlugs || []).map(normalizeKey)]);
  for (const candidate of [input.citySlug, input.city]) {
    const key = normalizeKey(candidate);
    if (key && centerKeys.has(key)) return true;
  }
  return false;
}

/** Москва / СПб (и алиасы). */
export function isMajorVenueBreadcrumbCity(input: {
  city?: string | null;
  citySlug?: string | null;
  name?: string | null;
  slug?: string | null;
}): boolean {
  for (const candidate of [input.citySlug, input.slug, input.city, input.name]) {
    const key = normalizeKey(candidate);
    if (!key) continue;
    if (FEDERAL_VENUE_BREADCRUMB_SLUGS.has(key) || FEDERAL_VENUE_BREADCRUMB_NAMES.has(key)) return true;
  }
  return false;
}

/**
 * Адм. центр субъекта РФ: федеральные города + столицы из REGION_HUBS
 * (+ совпадение city с центром привязанного regionSlug/regionTitle).
 * В City нет isAdminCenter - список хабов + data-driven match по Region.
 */
export function isAdminCenterVenueBreadcrumbCity(input: {
  city?: string | null;
  citySlug?: string | null;
  name?: string | null;
  slug?: string | null;
  regionSlug?: string | null;
  regionTitle?: string | null;
}): boolean {
  if (isMajorVenueBreadcrumbCity(input)) return true;

  for (const candidate of [input.citySlug, input.slug, input.city, input.name]) {
    const key = normalizeKey(candidate);
    if (key && HUB_CITY_TO_REGION_SLUG[key]) return true;
  }

  const regionSlug = String(input.regionSlug || '')
    .trim()
    .toLowerCase();
  const regionTitle = String(input.regionTitle || '').trim();
  if (regionSlug || regionTitle) {
    const hub =
      REGION_HUBS.find((item) => item.regionSlug === regionSlug) ||
      REGION_HUBS.find((item) => item.regionName === regionTitle) ||
      null;
    if (hub && cityMatchesRegionCenter(input, hub.centerCity, hub.centerSlugs)) return true;
  }

  return false;
}

/**
 * Регион для venue-крошек только у не-адм. центров.
 * Только City.region из API (`regionSlug` / `regionTitle`).
 * Адм. центры (включая Тулу и др.) - без сегмента области.
 */
export function resolveVenueBreadcrumbRegion(input: {
  city?: string | null;
  citySlug?: string | null;
  regionSlug?: string | null;
  regionTitle?: string | null;
}): { slug: string; name: string } | null {
  if (isAdminCenterVenueBreadcrumbCity(input)) return null;

  const apiSlug = String(input.regionSlug || '')
    .trim()
    .toLowerCase();
  if (!apiSlug) return null;

  const name =
    String(input.regionTitle || '').trim() || REGION_NAME_BY_SLUG.get(apiSlug) || apiSlug;
  return { slug: apiSlug, name };
}

export function resolveCityRegion(
  city: Pick<PublicDestinationDto, 'slug' | 'sourceSlug' | 'name'>,
  destinations: PublicDestinationDto[],
): CityCardRegion | null {
  const regionSlug = lookupRegionSlug(city);
  if (!regionSlug) return null;

  const region = destinations.find((item) => item.type === 'region' && item.slug === regionSlug);
  if (!region?.slug || !region.events) return null;

  return {
    slug: region.slug,
    name: region.name,
    eventCount: region.events,
  };
}

/** Регионы без карточки областного центра в текущем списке городов. */
export function filterOrphanRegions(
  regions: PublicDestinationDto[],
  visibleCities: PublicDestinationDto[],
): PublicDestinationDto[] {
  const cityNames = new Set(visibleCities.map((city) => city.name));
  return regions.filter((region) => {
    const center = getRegionCenterCityName(region);
    if (!center) return true;
    return !cityNames.has(center);
  });
}

export function getRegionCenterCityName(region: Pick<PublicDestinationDto, 'name' | 'slug'>): string | null {
  const byName = region.name ? REGION_CENTER_BY_NAME.get(region.name) : null;
  if (byName) return byName;
  const bySlug = region.slug ? REGION_CENTER_BY_SLUG.get(region.slug) : null;
  return bySlug || null;
}

function lookupRegionSlug(city: Pick<PublicDestinationDto, 'slug' | 'sourceSlug' | 'name'>) {
  for (const key of [city.slug, city.sourceSlug, city.name]) {
    const normalized = normalizeKey(key);
    if (normalized && HUB_CITY_TO_REGION_SLUG[normalized]) {
      return HUB_CITY_TO_REGION_SLUG[normalized];
    }
  }
  return null;
}

function normalizeKey(value?: string | null) {
  return String(value || '')
    .trim()
    .toLowerCase();
}
