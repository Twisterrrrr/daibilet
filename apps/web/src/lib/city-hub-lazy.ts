/**
 * Lazy city hub loader — dynamically imports hub data on demand.
 * Each hub file (~800-1200 lines) is loaded only when its city is requested.
 * Loaded hubs are cached in memory for the session lifetime.
 *
 * Used by client components to avoid importing all 26 hub files statically.
 */

import type { CityInfoEntry, CityMustSeeItem, CitySuburbItem, CityDayRoutePreset } from './cityInfo-data';

/** Hub data returned by the lazy loader. Uses real types from cityInfo-data. */
export type CityHubData = {
  mustSee: CityMustSeeItem[];
  significantSuburbs?: CitySuburbItem[];
  faq?: Array<{ q: string; a: string }>;
  travel?: string;
  dayRoutePresets?: CityDayRoutePreset[];
};

type HubLoader = () => Promise<Record<string, unknown>>;

/** Map of city slug → dynamic import function for the hub file. */
const HUB_LOADERS: Record<string, HubLoader> = {
  'ekaterinburg': () => import('./ekaterinburg-hub'),
  'kazan': () => import('./kazan-hub'),
  'samara': () => import('./samara-hub'),
  'krasnodar': () => import('./krasnodar-hub'),
  'krasnoyarsk': () => import('./krasnoyarsk-hub'),
  'novosibirsk': () => import('./novosibirsk-hub'),
  'voronezh': () => import('./voronezh-hub'),
  'omsk': () => import('./omsk-hub'),
  'ryazan': () => import('./ryazan-hub'),
  'tula': () => import('./tula-hub'),
  'smolensk': () => import('./smolensk-hub'),
  'barnaul': () => import('./barnaul-hub'),
  'ufa': () => import('./ufa-hub'),
  'chelyabinsk': () => import('./chelyabinsk-hub'),
  'tyumen': () => import('./tyumen-hub'),
  'rostov-na-donu': () => import('./rostov-na-donu-hub'),
  'penza': () => import('./penza-hub'),
  'tver': () => import('./tver-hub'),
  'tolyatti': () => import('./tolyatti-hub'),
  'surgut': () => import('./surgut-hub'),
  'vladikavkaz': () => import('./vladikavkaz-hub'),
  'volgograd': () => import('./volgograd-hub'),
  'yaroslavl': () => import('./yaroslavl-hub'),
  'saratov': () => import('./saratov-hub'),
  'kirov': () => import('./kirov-hub'),
  'sochi': () => import('./sochi-hub'),
  'ulyanovsk': () => import('./ulyanovsk-hub'),
};

const hubCache = new Map<string, CityHubData>();

/** Load a city hub module on demand. Returns cached result if already loaded. */
export async function loadCityHubData(citySlug: string): Promise<CityHubData | null> {
  const normalized = citySlug.trim().toLowerCase();
  if (hubCache.has(normalized)) return hubCache.get(normalized)!;

  let data: CityHubData = {
    mustSee: [],
    significantSuburbs: [],
    faq: [],
    travel: undefined,
    dayRoutePresets: [],
  };
  let loaded = false;

  const loader = HUB_LOADERS[normalized];
  if (loader) {
    try {
      const mod = await loader();
      // Extract the city-specific data from the module.
      // Hub files export constants like EKB_MUST_SEE, KAZAN_FAQ, etc.
      const prefix = normalized.replace(/-/g, '_').toUpperCase();
      const mustSee = (mod[`${prefix}_MUST_SEE`] || mod.EKB_MUST_SEE || []) as CityHubData['mustSee'];
      const suburbs = (mod[`${prefix}_SUBURBS`] || []) as CityHubData['significantSuburbs'];
      const faq = (mod[`${prefix}_FAQ`] || []) as CityHubData['faq'];
      const travel = (mod[`${prefix}_TRAVEL`] || '') as string;
      const presets = (mod[`${prefix}_DAY_ROUTE_PRESETS`] || []) as CityHubData['dayRoutePresets'];

      data = {
        mustSee: mustSee || [],
        significantSuburbs: suburbs || [],
        faq: faq || [],
        travel: travel || undefined,
        dayRoutePresets: presets || [],
      };
      loaded = true;
    } catch {
      // fall through to the CITY_INFO registry below
    }
  }

  // Registry fallback: CITY_INFO covers every hub city, including capitals
  // (moscow/spb), cities whose packs still live in cityInfo-data (perm) and
  // any city without a lazy hub chunk. Imported lazily so the perf split of
  // hub chunks is preserved for the cities that have them.
  const needsRegistry =
    !loaded || !data.mustSee.length || !data.dayRoutePresets?.length || !data.significantSuburbs?.length;
  if (needsRegistry) {
    try {
      const { resolveCityInfo } = await import('./cityInfo');
      const entry = resolveCityInfo(normalized);
      if (entry) {
        data = {
          mustSee: data.mustSee.length ? data.mustSee : ((entry.mustSee as CityHubData['mustSee']) || []),
          significantSuburbs: data.significantSuburbs?.length
            ? data.significantSuburbs
            : ((entry.significantSuburbs as CityHubData['significantSuburbs']) || []),
          faq: data.faq?.length ? data.faq : ((entry.faq as CityHubData['faq']) || []),
          travel: data.travel || (entry.travel as string | undefined) || undefined,
          dayRoutePresets: data.dayRoutePresets?.length
            ? data.dayRoutePresets
            : ((entry.dayRoutePresets as CityHubData['dayRoutePresets']) || []),
        };
      }
    } catch {
      // registry unavailable - keep whatever the hub module provided
    }
  }

  if (!data.mustSee.length && !data.dayRoutePresets?.length) return null;

  hubCache.set(normalized, data);
  return data;
}

/** Check if a city slug has a hub available. */
export function hasCityHub(citySlug: string): boolean {
  return citySlug.trim().toLowerCase() in HUB_LOADERS;
}
