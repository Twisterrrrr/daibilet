import type { PublicDestinationDto } from '@daibilet/contracts/public';

import { createSearchGeoMatcher, type SearchGeoHit } from '../../../backend/src/search-geo-match.ts';
import { expandSearchQuery } from '../../../backend/src/search-synonyms.ts';
import routing from '../../../../data/geo/city-routing.ru.json';
import { cityHref, citySlug } from './routes';

const matchGeo = createSearchGeoMatcher({
  standaloneCities: routing.standaloneCities,
  cityToRegion: routing.cityToRegion,
});

export type CitiesCatalogSearchKind = 'city' | 'suburb' | 'satellite';

export type CitiesCatalogSearchHit = {
  kind: CitiesCatalogSearchKind;
  /** Dropdown / results primary: «Выборг, Ленинградская область». */
  title: string;
  /** Formula A for satellites; event count or suburb hint otherwise. */
  subtitle: string;
  href: string;
};

export type CitiesCatalogSearchResult = {
  /** Existing destination city cards only - never synthesized from geo hits. */
  gridCities: PublicDestinationDto[];
  /** Folded towns and palace suburbs: links, not CityCard. */
  geoHits: CitiesCatalogSearchHit[];
  suggestions: CitiesCatalogSearchHit[];
};

function destinationSlug(city: PublicDestinationDto): string {
  return citySlug(city);
}

function cityHitCovered(hit: SearchGeoHit, cities: PublicDestinationDto[]): boolean {
  if (hit.kind !== 'city') return false;
  const hitSlug = hit.slug;
  return cities.some((city) => {
    const slug = destinationSlug(city);
    return slug === hitSlug || city.name === hit.shortLabel || city.name === hit.label;
  });
}

function toGeoHit(hit: SearchGeoHit): CitiesCatalogSearchHit {
  if (hit.kind === 'satellite') {
    return {
      kind: 'satellite',
      title: hit.shortLabel,
      subtitle: hit.label,
      href: hit.href,
    };
  }
  return {
    kind: hit.kind,
    title: hit.shortLabel,
    subtitle: hit.sublabel,
    href: hit.href,
  };
}

function toCityHit(city: PublicDestinationDto, eventsLabel: (count: number) => string): CitiesCatalogSearchHit {
  return {
    kind: 'city',
    title: city.name,
    subtitle: eventsLabel(city.events),
    href: cityHref(city),
  };
}

export function matchCitiesCatalogSearch(
  query: string,
  cities: PublicDestinationDto[],
  options?: {
    suggestionLimit?: number;
    geoLimit?: number;
    eventsLabel?: (count: number) => string;
  },
): CitiesCatalogSearchResult {
  const suggestionLimit = options?.suggestionLimit ?? 6;
  const geoLimit = options?.geoLimit ?? 8;
  const eventsLabel = options?.eventsLabel ?? ((count) => String(count));
  const trimmed = query.trim();
  const normalized = trimmed.toLowerCase().replace(/ё/g, 'е');

  if (!trimmed) {
    return { gridCities: cities, geoHits: [], suggestions: [] };
  }

  const terms = expandSearchQuery(trimmed);
  const geoMatches = matchGeo(terms, geoLimit);

  const byName = cities.filter((city) =>
    city.name.toLowerCase().replace(/ё/g, 'е').includes(normalized),
  );
  const byGeoCity = geoMatches
    .filter((hit) => hit.kind === 'city')
    .map((hit) => cities.find((city) => cityHitCovered(hit, [city])))
    .filter((city): city is PublicDestinationDto => Boolean(city));

  const seenGrid = new Set<string>();
  const gridCities: PublicDestinationDto[] = [];
  for (const city of [...byGeoCity, ...byName]) {
    const key = destinationSlug(city) || city.name;
    if (seenGrid.has(key)) continue;
    seenGrid.add(key);
    gridCities.push(city);
  }

  const geoHits = geoMatches
    .filter((hit) => !cityHitCovered(hit, gridCities))
    .map(toGeoHit);

  const suggestions: CitiesCatalogSearchHit[] = [];
  const seenHref = new Set<string>();
  const push = (item: CitiesCatalogSearchHit) => {
    if (seenHref.has(item.href) || suggestions.length >= suggestionLimit) return;
    seenHref.add(item.href);
    suggestions.push(item);
  };

  for (const hit of geoMatches) {
    if (hit.kind === 'city') {
      const city = gridCities.find((item) => cityHitCovered(hit, [item]));
      if (city) push(toCityHit(city, eventsLabel));
      else push(toGeoHit(hit));
      continue;
    }
    push(toGeoHit(hit));
  }
  for (const city of gridCities) {
    push(toCityHit(city, eventsLabel));
  }

  return { gridCities, geoHits, suggestions };
}
