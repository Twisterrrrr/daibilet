import { createSearchGeoMatcher, type SearchGeoHit } from '../../../backend/src/search-geo-match.ts';
import { expandSearchQuery } from '../../../backend/src/search-synonyms.ts';
import routing from '../../../../data/geo/city-routing.ru.json';

const matchGeo = createSearchGeoMatcher({
  standaloneCities: routing.standaloneCities,
  cityToRegion: routing.cityToRegion,
});

export type HeaderSearchItem = {
  type: 'event' | 'city' | 'landing' | 'venue' | 'suburb';
  label: string;
  sublabel?: string | null;
  href: string;
  imageUrl?: string | null;
};

const RESULT_LIMIT = 8;
const GEO_SLOTS = 2;

function geoHitToSearchItem(hit: SearchGeoHit): HeaderSearchItem {
  return {
    type: hit.kind === 'suburb' ? 'suburb' : 'city',
    label: hit.label,
    sublabel: hit.sublabel,
    href: hit.href,
    imageUrl: null,
  };
}

/** First token of Formula A / hub label: «Выборг» from «Выборг, Ленинградская область • …». */
export function cityNameFromSearchLabel(label: string): string {
  return String(label || '')
    .split('•')[0]
    .split(',')[0]
    .trim()
    .toLowerCase();
}

export function headerSearchGeoItems(query: string, limit = GEO_SLOTS): HeaderSearchItem[] {
  const terms = expandSearchQuery(query);
  if (!terms.length) return [];
  return matchGeo(terms, limit).map(geoHitToSearchItem);
}

function isSupersededThinCity(item: HeaderSearchItem, geoItems: HeaderSearchItem[]): boolean {
  if (item.type !== 'city' && item.type !== 'suburb') return false;
  const label = String(item.label || '').trim().toLowerCase();
  const href = String(item.href || '');
  return geoItems.some((geo) => {
    if (geo.href === href) return true;
    const geoCity = cityNameFromSearchLabel(geo.label);
    if (label && geoCity && (label === geoCity || label.startsWith(`${geoCity},`))) return true;
    return false;
  });
}

/**
 * Header dropdown: geo hubs/satellites first (max 2), then API events/venues/landings.
 * Replaces thin City-row hits like `/cities/раменское` with the oblast `?city=` href.
 * Idempotent if the API already prepended the same geo hits.
 */
export function mergeHeaderSearchItems(
  query: string,
  apiItems: Array<HeaderSearchItem | null | undefined> = [],
  limit = RESULT_LIMIT,
): HeaderSearchItem[] {
  const geoItems = headerSearchGeoItems(query, GEO_SLOTS);
  const out: HeaderSearchItem[] = [];
  const seen = new Set<string>();
  const push = (item: HeaderSearchItem | null | undefined) => {
    const href = String(item?.href || '').trim();
    if (!item || !href || seen.has(href) || out.length >= limit) return;
    seen.add(href);
    out.push(item);
  };
  for (const item of geoItems) push(item);
  for (const item of apiItems) {
    if (!item) continue;
    if (isSupersededThinCity(item, geoItems)) continue;
    push(item);
  }
  return out;
}
