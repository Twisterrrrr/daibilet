/**
 * Short / invented place slugs that 404 on live but have a published twin.
 * Keep in sync with apps/web/src/lib/place-slug-aliases.ts
 */
export const PLACE_SLUG_ALIASES = {
  'ufa-monument-salavat-yulaev': 'ufa-pamyatnik-salavatu-yulaevu',
  'voronezh-kramskoy': 'voronezh-hudozhestvennyy-muzey-kramskogo',
  'ryazan-kreml': 'ryazan-ryazanskiy-kreml',
};

export function resolvePlaceSlugAlias(slug) {
  const key = String(slug || '')
    .trim()
    .toLowerCase();
  return PLACE_SLUG_ALIASES[key] || key;
}
