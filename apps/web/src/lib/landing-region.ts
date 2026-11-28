import cityRouting from '../../../../data/geo/city-routing.ru.json';
import regionHubs from '../../../../data/geo/region-hubs.ru.json';
import { citySlug } from './routes';

const REGION_NAMES = [...new Set([
  ...Object.values(cityRouting.cityToRegion),
  ...regionHubs.regionCenters.map((item) => item.regionName),
])];

export function resolveLandingRegionName(regionSlug?: string | null): string | null {
  const key = String(regionSlug || '').trim().toLowerCase();
  if (!key) return null;
  return REGION_NAMES.find((name) => citySlug({ name }) === key) || null;
}
