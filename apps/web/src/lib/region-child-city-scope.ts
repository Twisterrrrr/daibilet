import routing from '../../../../data/geo/city-routing.ru.json';
import {
  parseRegionChildCityQuery,
  publicCitySlug,
  regionChildCityHref,
} from '../../../backend/src/search-geo-match.ts';

import {
  buildChildCityScopeLabel,
  buildChildCityScopeLead,
  buildChildCityScopeSeoTitle,
} from './region-hub-seo.ts';

export {
  canonicalizeRegionChildCitySearch,
  parseRegionChildCityQuery,
  regionChildCityHref,
} from '../../../backend/src/search-geo-match.ts';

export type RegionChildCityMatch = {
  slug: string;
  name: string;
};

export type RegionChildCityChrome = {
  child: RegionChildCityMatch;
  h1: string;
  lead: string;
  title: string;
};

function sameSlug(left?: string | null, right?: string | null): boolean {
  const a = publicCitySlug(left);
  const b = publicCitySlug(right);
  return Boolean(a && b && a === b);
}

/**
 * Resolve `?city=vyborg` (or broken `?city-vyborg`) against region children / cityToRegion.
 * Unknown tokens and the region/center itself do not scope the hub.
 */
export function resolveRegionChildCityScope(input: {
  search: string | URLSearchParams;
  regionName: string;
  regionSlug: string;
  centerSlug?: string | null;
  childCities: Array<{ slug?: string | null; name: string }>;
  cityToRegion?: Record<string, string>;
}): RegionChildCityMatch | null {
  const querySlug = parseRegionChildCityQuery(input.search);
  if (!querySlug) return null;
  if (sameSlug(querySlug, input.regionSlug) || sameSlug(querySlug, input.regionName)) return null;
  if (input.centerSlug && sameSlug(querySlug, input.centerSlug)) return null;

  const fromChildren = input.childCities.find(
    (city) => sameSlug(city.slug, querySlug) || sameSlug(city.name, querySlug),
  );
  if (fromChildren) {
    return {
      slug: publicCitySlug(fromChildren.slug) || publicCitySlug(fromChildren.name) || querySlug,
      name: fromChildren.name,
    };
  }

  const map = input.cityToRegion || routing.cityToRegion || {};
  for (const [cityName, regionName] of Object.entries(map)) {
    if (!sameSlug(regionName, input.regionName) && !sameSlug(regionName, input.regionSlug)) continue;
    if (sameSlug(cityName, querySlug)) {
      return { slug: publicCitySlug(cityName) || querySlug, name: cityName };
    }
  }
  return null;
}

export function buildRegionChildCityChrome(
  input: {
    search: string | URLSearchParams;
    regionName: string;
    regionSlug: string;
    centerSlug?: string | null;
    childCities: Array<{ slug?: string | null; name: string }>;
    cityToRegion?: Record<string, string>;
    now?: Date;
  },
): RegionChildCityChrome | null {
  const child = resolveRegionChildCityScope(input);
  if (!child) return null;
  return {
    child,
    h1: buildChildCityScopeLabel(child.name, input.regionName),
    lead: buildChildCityScopeLead(child.name, input.regionName),
    title: buildChildCityScopeSeoTitle(child.name, input.now),
  };
}

export function sessionMatchesRegionCityFilter(
  session?: {
    city?: string | null;
    citySlug?: string | null;
    sourceCitySlug?: string | null;
  } | null,
  names: string[] = [],
  slugs: string[] = [],
): boolean {
  if (!session) return false;
  const nameSet = new Set(names.map((name) => String(name || '').trim().toLowerCase()).filter(Boolean));
  const slugSet = new Set(slugs.map((slug) => publicCitySlug(slug)).filter(Boolean));
  const city = String(session.city || '').trim().toLowerCase();
  const citySlug = publicCitySlug(session.citySlug);
  const sourceSlug = publicCitySlug(session.sourceCitySlug);
  if (city && nameSet.has(city)) return true;
  if (citySlug && slugSet.has(citySlug)) return true;
  if (sourceSlug && slugSet.has(sourceSlug)) return true;
  return false;
}

export function filterSessionsForRegionChildCity<
  T extends {
    city?: string | null;
    citySlug?: string | null;
    sourceCitySlug?: string | null;
  },
>(
  sessions: Array<T | null | undefined>,
  child: { name: string; slug: string } | null,
  childCities: Array<{ slug?: string | null; name: string }> = [],
): T[] {
  const list = (sessions || []).filter((session): session is T => Boolean(session));
  if (!child) return list;
  const extraSlugs = childCities
    .filter((item) => String(item.name || '').toLowerCase() === child.name.toLowerCase())
    .map((item) => item.slug)
    .filter((slug): slug is string => Boolean(slug));
  return list.filter((session) =>
    sessionMatchesRegionCityFilter(session, [child.name], [child.slug, ...extraSlugs]),
  );
}
