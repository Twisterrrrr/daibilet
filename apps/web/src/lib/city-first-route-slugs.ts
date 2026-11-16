import { canonicalCitySlug } from '@/lib/routes';

/**
 * Legacy city hubs currently present in the production city sitemap, captured
 * from the reviewed URL map. New destinations must be added only after their
 * city PDP is editorially published; a raw destination row is not sufficient.
 */
export const CITY_FIRST_LEGACY_ROUTE_SLUGS = [
  'barnaul',
  'bryansk',
  'cheboksary',
  'chelyabinsk',
  'chita',
  'ekaterinburg',
  'irkutsk',
  'izhevsk',
  'kaliningrad',
  'kazan',
  'kemerovo',
  'kirov-kirovskaya-oblast',
  'kostroma',
  'krasnodar',
  'krasnoyarsk',
  'kursk',
  'lipeck',
  'moscow',
  'nizhny-novgorod',
  'novokuzneck',
  'novosibirsk',
  'omsk',
  'orenburg',
  'penza',
  'perm',
  'rostov-na-donu',
  'ryazan',
  'samara',
  'sankt-peterburg',
  'saratov',
  'smolensk',
  'sochi',
  'stavropol',
  'surgut',
  'syktyvkar',
  'tambov',
  'tolyatti',
  'tomsk',
  'tula',
  'tver',
  'tyumen',
  'ufa',
  'ulyanovsk',
  'veliky-novgorod',
  'vladikavkaz',
  'vladimir',
  'vladivostok',
  'volgograd',
  'vologda',
  'voronezh',
  'yaroslavl',
] as const;

const cityRouteSlugSet = new Set<string>(CITY_FIRST_LEGACY_ROUTE_SLUGS);

export function isCityFirstLegacyRouteSlug(slug: string): boolean {
  return cityRouteSlugSet.has(String(slug || '').trim().toLowerCase());
}
export function resolveCityFirstRedirectPath(pathname: string, enabled: boolean): string | null {
  if (!enabled) return null;
  const legacyMatch = pathname.match(/^\/(?:cities\/([^/]+)|places\/c\/([^/]+))\/?$/);
  const aliasMatch = pathname.match(/^\/([^/]+)(\/places)?\/?$/);
  const rawSlug = legacyMatch?.[1] || legacyMatch?.[2] || aliasMatch?.[1];
  if (!rawSlug) return null;

  const canonical = canonicalCitySlug(rawSlug);
  if (!isCityFirstLegacyRouteSlug(canonical)) return null;
  const isPlaces = pathname.startsWith('/places/c/') || Boolean(aliasMatch?.[2]);
  const isLegacyNamespace = Boolean(legacyMatch);
  if (!isLegacyNamespace && canonical === rawSlug) return null;
  return isPlaces ? `/${canonical}/places` : `/${canonical}`;
}
