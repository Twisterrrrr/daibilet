/**
 * Legacy spelling aliases must skip the old `/cities` or `/places/c` layer
 * once city-first URLs are enabled, avoiding a 301→308 chain.
 * Keep this module dependency-free: next.config.ts imports it at build time.
 */
const CITY_SPELLING_ALIASES: Record<string, { legacy: string; cityFirst: string }> = {
  '/cities/saint-petersburg': {
    legacy: '/cities/sankt-peterburg',
    cityFirst: '/sankt-peterburg',
  },
  '/cities/velikiy-novgorod': {
    legacy: '/cities/veliky-novgorod',
    cityFirst: '/veliky-novgorod',
  },
  '/cities/nizhniy-novgorod': {
    legacy: '/cities/nizhny-novgorod',
    cityFirst: '/nizhny-novgorod',
  },
  '/cities/moskva': {
    legacy: '/cities/moscow',
    cityFirst: '/moscow',
  },
  '/places/c/nizhniy-novgorod': {
    legacy: '/places/c/nizhny-novgorod',
    cityFirst: '/nizhny-novgorod/places',
  },
  '/places/c/velikiy-novgorod': {
    legacy: '/places/c/veliky-novgorod',
    cityFirst: '/veliky-novgorod/places',
  },
};

export function resolveLegacyCitySpellingRedirect(
  pathname: string,
  cityFirstEnabled: boolean,
): string | null {
  const alias = CITY_SPELLING_ALIASES[pathname.replace(/\/+$/, '')];
  return alias ? (cityFirstEnabled ? alias.cityFirst : alias.legacy) : null;
}
