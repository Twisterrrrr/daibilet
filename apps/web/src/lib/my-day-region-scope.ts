import type { PublicDestinationDto } from '@daibilet/contracts/public';

import routing from '../../../../data/geo/city-routing.ru.json';

import { stripCityDisambiguator } from './city-declension.ts';
import { getRegionCenterCityName } from './cityRegionHub.ts';
import { matchDestination } from './selected-city.ts';

export type MyDayRegionAlternatives = {
  regionName: string;
  regionSlug: string | null;
  /** Admin center city row when present in destinations. */
  hub: PublicDestinationDto | null;
  /** cityToRegion children that exist as type=city destinations (hub excluded). */
  children: PublicDestinationDto[];
};

function normalizeKey(value?: string | null): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

/** City names mapped to this region in city-routing (catalog may use disambiguators). */
export function listCityToRegionChildren(regionName: string): string[] {
  const map = routing.cityToRegion || {};
  const regionKey = normalizeKey(regionName);
  const out: string[] = [];
  for (const [cityName, mapped] of Object.entries(map)) {
    if (normalizeKey(mapped) !== regionKey) continue;
    out.push(cityName);
  }
  return out;
}

/**
 * My Day builds day routes for a city hub, not a subject/region aggregator.
 * When chrome/storage holds type=region, offer hub + oblast towns instead.
 */
export function resolveMyDayRegionAlternatives(
  region: Pick<PublicDestinationDto, 'name' | 'slug' | 'type'> | null | undefined,
  destinations: PublicDestinationDto[],
): MyDayRegionAlternatives | null {
  if (!region || region.type !== 'region') return null;
  const regionName = String(region.name || '').trim();
  if (!regionName) return null;

  const centerName = getRegionCenterCityName(region);
  const hub = centerName
    ? destinations.find(
        (item) =>
          item.type === 'city' &&
          (normalizeKey(item.name) === normalizeKey(centerName) ||
            normalizeKey(item.slug) === normalizeKey(centerName) ||
            normalizeKey(item.sourceSlug) === normalizeKey(centerName)),
      ) ||
      matchDestination(destinations, centerName)
    : null;
  const hubCity = hub?.type === 'city' ? hub : null;
  const hubKey = normalizeKey(hubCity?.name);

  const children: PublicDestinationDto[] = [];
  const seen = new Set<string>();
  for (const rawName of listCityToRegionChildren(regionName)) {
    const matched =
      matchDestination(destinations, rawName) ||
      matchDestination(destinations, stripCityDisambiguator(rawName));
    if (!matched || matched.type !== 'city') continue;
    const key = normalizeKey(matched.name);
    if (!key || key === hubKey || seen.has(key)) continue;
    seen.add(key);
    children.push(matched);
  }

  children.sort(
    (a, b) => (b.events || 0) - (a.events || 0) || a.name.localeCompare(b.name, 'ru'),
  );

  return {
    regionName,
    regionSlug: region.slug || null,
    hub: hubCity,
    children,
  };
}

/** Display label for a child city chip (drop catalog parentheses). */
export function myDayCityChipLabel(city: Pick<PublicDestinationDto, 'name'>): string {
  return stripCityDisambiguator(city.name) || city.name;
}
