import beltsFile from '../../../../data/geo/region-city-belts.ru.json';

export type RegionCityBelt = 'near' | 'mid' | 'far';

export type RegionCityBeltEntry = {
  name?: string;
  belt: RegionCityBelt;
  kmFromMkad: number;
  transit?: 'MCD' | 'rail' | 'car' | string;
  lat?: number;
  lng?: number;
};

type RegionBeltConfig = {
  anchor: { name: string; lat: number; lng: number };
  cities: Record<string, RegionCityBeltEntry>;
};

const BELTS = beltsFile as Record<string, RegionBeltConfig>;

const BELT_LABELS: Record<RegionCityBelt, string> = {
  near: 'Ближние',
  mid: 'Чуть дальше',
  far: 'Дальние',
};

const TRANSIT_LABELS: Record<string, string> = {
  MCD: 'МЦД',
  rail: 'Электричка',
  car: 'На авто',
};

function normalizeKey(value: string | null | undefined): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-z0-9а-я-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function getRegionBeltConfig(regionSlug: string | null | undefined): RegionBeltConfig | null {
  if (!regionSlug) return null;
  return BELTS[regionSlug] || null;
}

export function regionHasBeltData(regionSlug: string | null | undefined): boolean {
  return Boolean(getRegionBeltConfig(regionSlug)?.cities);
}

export function resolveCityBeltEntry(
  regionSlug: string | null | undefined,
  city: { slug?: string | null; name?: string | null; sourceSlug?: string | null },
): RegionCityBeltEntry | null {
  const config = getRegionBeltConfig(regionSlug);
  if (!config) return null;

  const keys = [city.slug, city.sourceSlug, city.name]
    .map((value) => normalizeKey(value))
    .filter(Boolean);

  for (const key of keys) {
    if (config.cities[key]) return config.cities[key];
  }

  // Match by display name inside entries
  const nameKey = normalizeKey(city.name);
  if (nameKey) {
    for (const entry of Object.values(config.cities)) {
      if (normalizeKey(entry.name) === nameKey) return entry;
    }
  }

  return null;
}

export function beltLabel(belt: RegionCityBelt): string {
  return BELT_LABELS[belt];
}

export function formatLogisticsChip(entry: RegionCityBeltEntry | null): string | null {
  if (!entry) return null;
  const transit = entry.transit ? TRANSIT_LABELS[entry.transit] || entry.transit : null;
  const km =
    typeof entry.kmFromMkad === 'number' && entry.kmFromMkad > 0
      ? `~${Math.round(entry.kmFromMkad)} км`
      : null;
  if (transit && km) return `${transit} · ${km}`;
  return transit || km;
}

export const REGION_BELT_FILTERS: Array<{ id: 'all' | RegionCityBelt; label: string }> = [
  { id: 'all', label: 'Все города' },
  { id: 'near', label: BELT_LABELS.near },
  { id: 'mid', label: BELT_LABELS.mid },
  { id: 'far', label: BELT_LABELS.far },
];
