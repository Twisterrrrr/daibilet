import type { PublicDestinationDto } from '@daibilet/contracts/public';

import { buildPodborkiCityHref } from './podborki-city-seo.ts';
import { matchDestination } from './selected-city.ts';

const QUERY_CITY_SECTION_ROOTS = ['/events', '/places', '/podborki'] as const;

/** Keep in sync with `catalog-intent-routes` (avoid @/ import chain in unit tests). */
const PODBORKI_INTENT_ALIASES: Record<string, string> = {
  'na-vyhodnyh': 'na-vyhodnye',
};
const PODBORKI_INTENTS = new Set([
  'besplatno',
  'na-vyhodnye',
  'segodnya-vecherom',
  'do-2000',
  'skoro',
]);

export type CityChangeNavInput = {
  pathname: string;
  /** Display name from CityPicker, or `all`. */
  cityName: string;
  destinations: PublicDestinationDto[];
  /** Current search params (preserved on section index pages). */
  searchParams?: URLSearchParams | null;
};

export type CityChangeNavResult =
  | { action: 'navigate'; href: string }
  | { action: 'persist' }
  /** Unhandled path - caller may try multi-city landing, else persist (never dump to catalog). */
  | { action: 'fallback' };

function cityHubPathSlug(slug: string): string {
  const key = String(slug || '')
    .trim()
    .toLowerCase();
  if (key === 'sankt-peterburg' || key === 'spb' || key === 'peterburg') {
    return 'saint-petersburg';
  }
  return slug;
}

function resolveDestinationSlug(
  destinations: PublicDestinationDto[],
  name: string,
): { matched: PublicDestinationDto | null; slug: string | null } {
  if (!name || name === 'all') return { matched: null, slug: null };
  const matched = matchDestination(destinations, name);
  const slug = matched?.slug?.trim() || null;
  return { matched, slug };
}

function resolvePodborkiIntentSlug(raw: string | undefined): string | null {
  const key = String(raw || '')
    .trim()
    .toLowerCase();
  if (!key) return null;
  const canonical = PODBORKI_INTENT_ALIASES[key] || key;
  return PODBORKI_INTENTS.has(canonical) ? canonical : null;
}

function catalogIntentHref(intent: string, citySlug?: string | null): string {
  const slug = String(citySlug || '').trim();
  if (slug && slug !== 'all') {
    return `/podborki/${intent}/${encodeURIComponent(slug)}`;
  }
  return `/podborki/${intent}`;
}

/**
 * Path-aware destination for header city change.
 * Prefer staying in the current section with a new city slug/query.
 * Catalog (`/events`) only when the user is already in events (or its PDP).
 */
export function resolveCityChangeNav(input: CityChangeNavInput): CityChangeNavResult {
  const path = String(input.pathname || '/').replace(/\/$/, '') || '/';
  const name = String(input.cityName || '').trim() || 'all';
  const { matched, slug: citySlug } = resolveDestinationSlug(input.destinations, name);

  if (path === '/') {
    return { action: 'persist' };
  }

  // Keep /my-day?city= in sync with header / on-page picker (empty Lovable step needs city).
  if (path === '/my-day') {
    const params = new URLSearchParams(input.searchParams?.toString() || '');
    if (name === 'all') params.delete('city');
    else params.set('city', citySlug || name);
    const query = params.toString();
    return { action: 'navigate', href: query ? `/my-day?${query}` : '/my-day' };
  }

  // Cities IA: list or hub → new hub (or list for «Все города»).
  // Prefer SEO-canonical slug (`saint-petersburg`) so we skip the
  // `/cities/sankt-peterburg` → `/cities/saint-petersburg` 301 that left the
  // picker showing the previous city during the redirect.
  if (path === '/cities' || path.startsWith('/cities/')) {
    if (name === 'all' || !matched?.slug) {
      return { action: 'navigate', href: '/cities' };
    }
    const hubSlug = cityHubPathSlug(matched.slug);
    return { action: 'navigate', href: `/cities/${encodeURIComponent(hubSlug)}` };
  }

  // Legacy listing `/venues` `/locations` 301 to `/places`. City change writes the hub
  // directly. Entity PDP `/venues/[slug]` `/locations/[slug]` stay; picker returns to `/places`.
  if (
    path === '/venues' ||
    path.startsWith('/venues/') ||
    path === '/locations' ||
    path.startsWith('/locations/')
  ) {
    const isVenues = path === '/venues' || path.startsWith('/venues/');
    const isIndex = path === '/venues' || path === '/locations';
    const params = isIndex
      ? new URLSearchParams(input.searchParams?.toString() || '')
      : new URLSearchParams();
    if (isIndex) params.set('family', isVenues ? 'institution' : 'location');
    if (name === 'all') params.set('city', 'all');
    else params.set('city', citySlug || name);
    params.delete('page');
    const query = params.toString();
    return { action: 'navigate', href: query ? `/places?${query}` : '/places' };
  }

  // Catalog section indexes + PDPs: stay in section root with ?city=.
  for (const root of QUERY_CITY_SECTION_ROOTS) {
    if (path === root || path.startsWith(`${root}/`)) {
      // Intent collections use path city segment, not ?city=.
      if (root === '/podborki' && path.startsWith('/podborki/')) {
        const segments = path.split('/').filter(Boolean);
        // Marker city hub `/podborki/c/{city}` - swap city via CHPU / soft href helper.
        if (segments[1] === 'c') {
          if (name === 'all') return { action: 'navigate', href: '/podborki' };
          return {
            action: 'navigate',
            href: buildPodborkiCityHref(citySlug || name),
          };
        }
        const intent = resolvePodborkiIntentSlug(segments[1]);
        if (intent) {
          return {
            action: 'navigate',
            href: catalogIntentHref(intent, name === 'all' ? null : citySlug),
          };
        }
      }

      // Podborki index: meta-pilot → marker CHPU; others soft ?city=.
      if (root === '/podborki' && path === '/podborki') {
        if (name === 'all') {
          const params = new URLSearchParams(input.searchParams?.toString() || '');
          params.set('city', 'all');
          params.delete('page');
          const query = params.toString();
          return { action: 'navigate', href: query ? `/podborki?${query}` : '/podborki' };
        }
        return {
          action: 'navigate',
          href: buildPodborkiCityHref(citySlug || name),
        };
      }

      // Leaving a PDP: drop deep-link noise; keep filters when already on the index.
      // Prefer ASCII slug in ?city= (Cyrillic names thrash App Router soft-nav / catalog fetch).
      // `city=all` is required so SelectedCityProvider does not re-inject storage city
      // when the user explicitly picks «Все города» (bare `/venues` was overwritten).
      const params =
        path === root
          ? new URLSearchParams(input.searchParams?.toString() || '')
          : new URLSearchParams();
      if (name === 'all') params.set('city', 'all');
      else params.set('city', citySlug || name);
      params.delete('page');
      const query = params.toString();
      return { action: 'navigate', href: query ? `${root}?${query}` : root };
    }
  }

  // Blog: header city only persists - feed is cross-city; in-page `?city=` is the materials filter.
  if (path === '/blog' || path.startsWith('/blog/')) {
    return { action: 'persist' };
  }

  return { action: 'fallback' };
}

/** @deprecated Prefer resolveCityChangeNav; kept for simple string consumers/tests. */
export function resolveCityChangeHref(input: CityChangeNavInput): string | null {
  const result = resolveCityChangeNav(input);
  if (result.action === 'navigate') return result.href;
  return null;
}
