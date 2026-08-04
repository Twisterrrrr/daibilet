'use client';

import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { buildCatalogHref } from '@/lib/catalog-url';
import { confirmClearDayRouteForCityChange } from '@/lib/day-route-city-change';
import { resolveLandingCityName } from '@/lib/landing-city';
import { canonicalLandingSlug } from '@/lib/landing-constants';
import {
  isCityFilterPath,
  matchDestination,
  mergeStoredCityIntoSearchParams,
  persistSelectedCity,
  readStoredSelectedCity,
  resolveCityLabel,
} from '@/lib/selected-city';
import {
  landingCategoryHref,
  isLandingCityAllowed,
  MULTI_CITY_LANDING_SLUGS,
  normalizeKnownCitySlug,
  resolveLandingRouteFromLocation,
} from '@/lib/landing-routes';

export type SetCityOptions = {
  /** Share hydrate already replaced the route - do not confirm/clear again. */
  skipRouteConfirm?: boolean;
};

type SelectedCityContextValue = {
  cityValue: string;
  cityLabel: string;
  /** False until client has read storage / URL — avoid flashing «Все города». */
  cityReady: boolean;
  selectedDestination: PublicDestinationDto | null;
  /** Full destinations list (city picker on /my-day and chrome). */
  destinations: PublicDestinationDto[];
  /** False when /my-day user cancels route-reset confirm (city value unchanged). */
  setCity: (name: string, options?: SetCityOptions) => boolean;
};

const SelectedCityContext = createContext<SelectedCityContextValue | null>(null);

function catalogPathBase(pathname: string): string {
  const path = pathname.replace(/\/$/, '') || '/';
  if (path.startsWith('/venues')) return '/venues';
  if (path.startsWith('/locations')) return '/locations';
  if (path.startsWith('/podborki')) return '/podborki';
  return '/events';
}

function readClientSearchParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

/**
 * Isolates useSearchParams in its own Suspense hole so SiteLayout chrome + page
 * HTML can SSR. Without this, Next bails the whole tree to client render
 * (blank site-header-spacer for 2-3s on first paint).
 */
function CitySearchParamsBridge({
  onParams,
}: {
  onParams: (params: URLSearchParams) => void;
}) {
  const searchParams = useSearchParams();
  useLayoutEffect(() => {
    onParams(new URLSearchParams(searchParams.toString()));
  }, [onParams, searchParams]);
  return null;
}

export function SelectedCityProvider({
  destinations,
  children,
}: {
  destinations: PublicDestinationDto[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [urlCity, setUrlCity] = useState<string | null>(null);
  const [searchParamsKey, setSearchParamsKey] = useState('');
  const [cityLabel, setCityLabel] = useState('Все города');
  const [cityReady, setCityReady] = useState(false);

  const onParams = useCallback((params: URLSearchParams) => {
    setUrlCity(params.get('city'));
    setSearchParamsKey(params.toString());
  }, []);

  // Sync before paint so the first meaningful filter render already has the stored city.
  useLayoutEffect(() => {
    const landingRoute = resolveLandingRouteFromLocation(pathname);
    if (landingRoute?.citySlug && MULTI_CITY_LANDING_SLUGS.has(canonicalLandingSlug(landingRoute.landingSlug))) {
      const fromLanding =
        matchDestination(destinations, landingRoute.citySlug) ||
        matchDestination(destinations, resolveLandingCityName(landingRoute.citySlug));
      if (fromLanding?.name) {
        setCityLabel(fromLanding.name);
        setCityReady(true);
        return;
      }
      const fallbackName = resolveLandingCityName(landingRoute.citySlug);
      if (fallbackName) {
        setCityLabel(fallbackName);
        setCityReady(true);
        return;
      }
    }
    const fromUrl = isCityFilterPath(pathname) ? urlCity : null;
    setCityLabel(resolveCityLabel(destinations, fromUrl));
    setCityReady(true);
  }, [destinations, pathname, urlCity]);

  // Index pages without explicit city= — inject header city into URL (deep-links untouched).
  useLayoutEffect(() => {
    if (!isCityFilterPath(pathname)) return;
    const base = catalogPathBase(pathname);
    const path = pathname.replace(/\/$/, '') || '/';
    if (path !== base) return;

    const current = searchParamsKey
      ? new URLSearchParams(searchParamsKey)
      : readClientSearchParams();
    const merged = mergeStoredCityIntoSearchParams(destinations, current);
    if (!merged) return;
    const query = merged.toString();
    router.replace(query ? `${base}?${query}` : base, { scroll: false });
  }, [destinations, pathname, router, searchParamsKey]);

  // Multi-city national landing without city segment — sync header city into path (like ?city= on catalogs).
  useLayoutEffect(() => {
    const landingRoute = resolveLandingRouteFromLocation(pathname);
    if (!landingRoute) return;
    const slug = canonicalLandingSlug(landingRoute.landingSlug);
    if (!MULTI_CITY_LANDING_SLUGS.has(slug)) return;
    if (landingRoute.citySlug) return;

    const stored = readStoredSelectedCity(destinations);
    if (!stored) return;
    const matched = matchDestination(destinations, stored);
    const citySlug =
      normalizeKnownCitySlug(matched?.slug) ||
      normalizeKnownCitySlug(matched?.sourceSlug) ||
      normalizeKnownCitySlug(stored);
    if (!citySlug || !isLandingCityAllowed(slug, citySlug)) return;

    router.replace(landingCategoryHref(slug, citySlug), { scroll: false });
  }, [destinations, pathname, router]);

  // Keep storage aligned with an explicit catalog city (including deep-links).
  useLayoutEffect(() => {
    if (!isCityFilterPath(pathname) || !urlCity) return;
    const matched = matchDestination(destinations, urlCity);
    if (matched) persistSelectedCity(matched.name);
  }, [destinations, pathname, urlCity]);

  // Persist city from multi-city landing path into header storage.
  useLayoutEffect(() => {
    const landingRoute = resolveLandingRouteFromLocation(pathname);
    if (!landingRoute?.citySlug) return;
    if (!MULTI_CITY_LANDING_SLUGS.has(canonicalLandingSlug(landingRoute.landingSlug))) return;
    const matched =
      matchDestination(destinations, landingRoute.citySlug) ||
      matchDestination(destinations, resolveLandingCityName(landingRoute.citySlug));
    if (matched?.name) persistSelectedCity(matched.name);
  }, [destinations, pathname]);

  const cityValue = cityLabel === 'Все города' ? 'all' : cityLabel;
  const selectedDestination = useMemo(
    () => (cityValue === 'all' ? null : matchDestination(destinations, cityValue)),
    [cityValue, destinations],
  );

  const setCity = useCallback(
    (name: string, options?: SetCityOptions): boolean => {
      const path = pathname.replace(/\/$/, '') || '/';
      // /my-day: header + on-page CityPicker share setCity - confirm before leaving a filled route.
      if (path === '/my-day' && !options?.skipRouteConfirm) {
        const current = cityLabel === 'Все города' ? 'all' : cityLabel;
        if (!confirmClearDayRouteForCityChange(name, current)) return false;
      }

      persistSelectedCity(name);
      setCityLabel(name === 'all' ? 'Все города' : name);
      setCityReady(true);

      if (pathname === '/') {
        return true;
      }

      // /my-day owns its city control - persist only, never navigate to catalog.
      if (path === '/my-day') {
        return true;
      }
      if (path === '/events' || path === '/venues' || path === '/locations' || path === '/podborki') {
        const params = searchParamsKey
          ? new URLSearchParams(searchParamsKey)
          : readClientSearchParams();
        if (name === 'all') params.delete('city');
        else params.set('city', name);
        params.delete('page');
        const query = params.toString();
        router.replace(query ? `${path}?${query}` : path, { scroll: false });
        return true;
      }

      const landingRoute = resolveLandingRouteFromLocation(pathname);
      if (
        landingRoute &&
        MULTI_CITY_LANDING_SLUGS.has(canonicalLandingSlug(landingRoute.landingSlug))
      ) {
        if (name === 'all') {
          router.push(landingCategoryHref(landingRoute.landingSlug));
          return true;
        }
        const matched = matchDestination(destinations, name);
        const citySlug =
          normalizeKnownCitySlug(matched?.slug) ||
          normalizeKnownCitySlug(matched?.sourceSlug) ||
          normalizeKnownCitySlug(name);
        if (citySlug) {
          router.push(landingCategoryHref(landingRoute.landingSlug, citySlug));
          return true;
        }
      }

      router.push(
        buildCatalogHref({
          city: name !== 'all' ? name : undefined,
          sort: 'popular',
        }),
      );
      return true;
    },
    [cityLabel, destinations, pathname, router, searchParamsKey],
  );

  const value = useMemo(
    () => ({ cityValue, cityLabel, cityReady, selectedDestination, destinations, setCity }),
    [cityValue, cityLabel, cityReady, selectedDestination, destinations, setCity],
  );

  return (
    <SelectedCityContext.Provider value={value}>
      <Suspense fallback={null}>
        <CitySearchParamsBridge onParams={onParams} />
      </Suspense>
      {children}
    </SelectedCityContext.Provider>
  );
}

export function useSelectedCity(): SelectedCityContextValue {
  const context = useContext(SelectedCityContext);
  if (!context) {
    throw new Error('useSelectedCity must be used within SelectedCityProvider');
  }
  return context;
}

export function useSelectedCityOptional(): SelectedCityContextValue | null {
  return useContext(SelectedCityContext);
}
