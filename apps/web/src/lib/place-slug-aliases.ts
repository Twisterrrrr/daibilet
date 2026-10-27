/**
 * Short / invented place slugs that 404 on live but have a published twin.
 * Keep in sync with apps/backend/src/place-slug-aliases.js
 */
export type PlaceSlugAliasTarget = {
  slug: string;
  family: 'location' | 'institution';
};

export const PLACE_SLUG_ALIASES: Record<string, PlaceSlugAliasTarget> = {
  'ufa-monument-salavat-yulaev': {
    slug: 'ufa-pamyatnik-salavatu-yulaevu',
    family: 'location',
  },
  'voronezh-kramskoy': {
    slug: 'voronezh-hudozhestvennyy-muzey-kramskogo',
    family: 'institution',
  },
  'ryazan-kreml': {
    slug: 'ryazan-ryazanskiy-kreml',
    family: 'location',
  },
  'naprotiv-teatra-sovremennik-625af9838532f4ffe3fefe4b': {
    slug: 'moscow-sovremennik',
    family: 'institution',
  },
  // Family audit batch A twins (2026-09-22): hide duplicate PUBLISHED → 301 to canon.
  'yusupovskiy-dvorec-63986bf7a7df': {
    slug: 'saint-petersburg-yusupovskiy-dvorets',
    family: 'institution',
  },
  'petrovskii-putevoi-dvorec-5cd1bf3d079a40000c1e0639': {
    slug: 'moscow-petrovskiy-putevoy-dvorets',
    family: 'institution',
  },
};

function normalizePlaceSlug(value: string): string {
  try {
    return decodeURIComponent(String(value || '').trim()).toLowerCase();
  } catch {
    return String(value || '').trim().toLowerCase();
  }
}

export function resolvePlaceSlugAlias(slug: string): string {
  const key = normalizePlaceSlug(slug);
  return PLACE_SLUG_ALIASES[key]?.slug || key;
}

export function placeSlugAliasHref(slug: string): string | null {
  const key = normalizePlaceSlug(slug);
  const target = PLACE_SLUG_ALIASES[key];
  if (!target) return null;
  const base = target.family === 'location' ? '/locations' : '/venues';
  return `${base}/${target.slug}`;
}

export function placeSlugAliasRedirects(): Array<{
  source: string;
  destination: string;
  permanent: true;
}> {
  return Object.entries(PLACE_SLUG_ALIASES).flatMap(([from, to]) => {
    const destination = `${to.family === 'location' ? '/locations' : '/venues'}/${to.slug}`;
    return [
      { source: `/locations/${from}`, destination, permanent: true as const },
      { source: `/venues/${from}`, destination, permanent: true as const },
    ];
  });
}
