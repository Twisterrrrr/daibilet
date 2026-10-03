import regionHubsFile from '../../../../data/geo/region-hubs.ru.json';

type RegionCenterConfig = {
  regionName: string;
  regionSlug: string;
  centerCity: string;
  centerSlugs?: string[];
};

const REGION_HUBS = (regionHubsFile.regionCenters || []) as RegionCenterConfig[];

/** Короткий макро-ярлык для бейджа hero («Пермский край · Урал»). */
const REGION_MACRO_LABEL: Record<string, string> = {
  'permskiy-kray': 'Урал',
  'sverdlovskaya-oblast': 'Урал',
  'chelyabinskaya-oblast': 'Урал',
  'respublika-bashkortostan': 'Урал',
  'orenburgskaya-oblast': 'Урал',
  'udmurtskaya-respublika': 'Урал',
  'tyumenskaya-oblast': 'Урал',
  'hanty-mansiyskiy-avtonomnyy-okrug': 'Урал',
  'novosibirskaya-oblast': 'Сибирь',
  'krasnoyarskiy-kray': 'Сибирь',
  'irkutskaya-oblast': 'Сибирь',
  'kemerovskaya-oblast': 'Сибирь',
  'altayskiy-kray': 'Сибирь',
  'tomskaya-oblast': 'Сибирь',
  'habarovskiy-kray': 'Дальний Восток',
  'primorskiy-kray': 'Дальний Восток',
  'amurskaya-oblast': 'Дальний Восток',
  'krasnodarskiy-kray': 'Юг',
  'rostovskaya-oblast': 'Юг',
  'stavropolskiy-kray': 'Кавказ',
  'respublika-tatarstan': 'Поволжье',
  'samarskaya-oblast': 'Поволжье',
  'nizhegorodskaya-oblast': 'Поволжье',
  'ulyanovskaya-oblast': 'Поволжье',
  'kirovskaya-oblast': 'Поволжье',
  'moskovskaya-oblast': 'Центр',
  'tulskaya-oblast': 'Центр',
  'kaluzhskaya-oblast': 'Центр',
  'yaroslavskaya-oblast': 'Центр',
  'tverskaya-oblast': 'Центр',
  'vladimirskaya-oblast': 'Центр',
  'orlovskaya-oblast': 'Центр',
  'bryanskaya-oblast': 'Центр',
  'lipetskaya-oblast': 'Центр',
  'voronezhskaya-oblast': 'Центр',
  'leningradskaya-oblast': 'Северо-Запад',
  'vologodskaya-oblast': 'Северо-Запад',
  'pskovskaya-oblast': 'Северо-Запад',
  'respublika-kareliya': 'Северо-Запад',
  'respublika-komi': 'Северо-Запад',
  'kaliningradskaya-oblast': 'Балтика',
  'respublika-hakasiya': 'Сибирь',
};

const CITY_TO_REGION = (() => {
  const map = new Map<string, RegionCenterConfig>();
  for (const hub of REGION_HUBS) {
    for (const key of [hub.centerCity, ...(hub.centerSlugs || [])]) {
      const normalized = normalizeKey(key);
      if (normalized) map.set(normalized, hub);
    }
  }
  return map;
})();

function normalizeKey(value?: string | null) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function resolveCityHeroRegionBadge(city: {
  slug?: string | null;
  sourceSlug?: string | null;
  name?: string | null;
}): string | null {
  let hub: RegionCenterConfig | undefined;
  for (const key of [city.slug, city.sourceSlug, city.name]) {
    const normalized = normalizeKey(key);
    if (!normalized) continue;
    hub = CITY_TO_REGION.get(normalized);
    if (hub) break;
  }
  if (!hub) return null;
  const macro = REGION_MACRO_LABEL[hub.regionSlug];
  if (macro) return `${hub.regionName} · ${macro}`;
  return hub.regionName;
}
