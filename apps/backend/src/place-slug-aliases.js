/**
 * Short / invented place slugs that 404 on live but have a published twin.
 * Keep in sync with apps/web/src/lib/place-slug-aliases.ts
 */
export const PLACE_SLUG_ALIASES = {
  'ufa-monument-salavat-yulaev': 'ufa-pamyatnik-salavatu-yulaevu',
  'voronezh-kramskoy': 'voronezh-hudozhestvennyy-muzey-kramskogo',
  'ryazan-kreml': 'ryazan-ryazanskiy-kreml',
  // Family audit batch A twins (2026-09-22)
  'naprotiv-teatra-sovremennik-625af9838532f4ffe3fefe4b': 'moscow-sovremennik',
  'yusupovskiy-dvorec-63986bf7a7df': 'saint-petersburg-yusupovskiy-dvorets',
  'petrovskii-putevoi-dvorec-5cd1bf3d079a40000c1e0639': 'moscow-petrovskiy-putevoy-dvorets',
};

export function resolvePlaceSlugAlias(slug) {
  const key = String(slug || '')
    .trim()
    .toLowerCase();
  return PLACE_SLUG_ALIASES[key] || key;
}
