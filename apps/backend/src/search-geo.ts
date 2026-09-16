import { loadCityRoutingConfig } from './city-routing-config.js';
import {
  createSearchGeoMatcher,
  type CityRoutingConfig,
  type SearchGeoHit,
} from './search-geo-match.js';

export type { SearchGeoHit, SearchGeoKind } from './search-geo-match.js';
export {
  canonicalizeRegionChildCitySearch,
  childCityScopeLabel,
  childCityShortLabel,
  createSearchGeoMatcher,
  hubHrefSlug,
  matchSearchGeoHitsWithRouting,
  parseRegionChildCityQuery,
  publicCitySlug,
  regionChildCityHref,
} from './search-geo-match.js';

const routing = loadCityRoutingConfig(import.meta.url) as CityRoutingConfig;
const matchCached = createSearchGeoMatcher(routing);

/**
 * Geo hits for header search: standalone hubs + editorial suburbs + cityToRegion satellites.
 * Formula A label `{City}, {Region} • Ближайшие события`
 * href `/cities/{regionSlug}?city={citySlug}` — UX-скоуп, не indexed document.
 * Palace suburbs stay on the parent hub `#city-suburbs` (with ?suburb= focus).
 * Выборг is not an SPb suburb: `/cities/leningradskaya-oblast?city=vyborg`.
 */
export function matchSearchGeoHits(terms: string[], limit = 2): SearchGeoHit[] {
  return matchCached(terms, limit);
}
