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
import { resolveCityChangeNav } from '@/lib/city-change-nav';
import { confirmClearDayRouteForCityChange } from '@/lib/day-route-city-change';
import { resolveLandingCityName } from '@/lib/landing-city';
import { canonicalLandingSlug } from '@/lib/landing-constants';
import {
  isCityFilterPath,
  matchDestination,
  mergeStoredCityIntoSearchParams,
  persistSelectedCity,
  resolveCityHubDestination,
  resolveCityLabel,
} from '@/lib/selected-city';
import {
  landingCategoryHref,
  MULTI_CITY_LANDING_SLUGS,
  normalizeKnownCitySlug,
  resolveLandingRouteFromLocation,
} from '@/lib/landing-routes';

export type SetCityOptions = {
  /** Share hydrate already replaced the route - do not confirm/clear again. */
  skipRouteConfirm?: boolean;
  /**
   * Sync header/storage city without leaving the current URL.
   * Use on venue/event PDPs - otherwise resolveCityChangeNav dumps PDP → catalog index.
   */
  persistOnly?: boolean;
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
    const fromCityHub = resolveCityHubDestination(destinations, pathname);
    if (fromCityHub) {
      setCityLabel(fromCityHub.name);
      setCityReady(true);
      return;
    }
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

  // Do NOT inject stored header city into multi-landing national URLs.
  // `/{intent}/` without city is the canonical «Все города» aggregation; forcing
  // `/{intent}/{city}/` from localStorage made the all-cities chip unreachable.

  // Keep storage aligned with an explicit catalog city (including deep-links).
  // `city=all` clears storage so mergeStoredCityIntoSearchParams cannot bounce back.
  useLayoutEffect(() => {
    if (isCityFilterPath(pathname) && String(urlCity || '').trim().toLowerCase() === 'all') {
      persistSelectedCity('all');
      return;
    }
    const matched = isCityFilterPath(pathname) && urlCity
      ? matchDestination(destinations, urlCity)
      : resolveCityHubDestination(destinations, pathname);
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

      // PDP hydrate (venue/location): only align chrome city - never navigate away.
      if (options?.persistOnly) return true;

      const searchParams = searchParamsKey
        ? new URLSearchParams(searchParamsKey)
        : readClientSearchParams();
      const nav = resolveCityChangeNav({
        pathname,
        cityName: name,
        destinations,
        searchParams,
      });

      if (nav.action === 'persist') {
        return true;
      }

      let href: string | null = nav.action === 'navigate' ? nav.href : null;

      if (nav.action === 'fallback') {
        const landingRoute = resolveLandingRouteFromLocation(pathname);
        if (
          landingRoute &&
          MULTI_CITY_LANDING_SLUGS.has(canonicalLandingSlug(landingRoute.landingSlug))
        ) {
          if (name === 'all') {
            href = landingCategoryHref(landingRoute.landingSlug);
          } else {
            const matched = matchDestination(destinations, name);
            const citySlug =
              normalizeKnownCitySlug(matched?.slug) ||
              normalizeKnownCitySlug(matched?.sourceSlug) ||
              normalizeKnownCitySlug(name);
            if (citySlug) {
              href = landingCategoryHref(landingRoute.landingSlug, citySlug);
            }
          }
        }
      }

      // Unknown / static surfaces: persist only - never dump into events catalog.
      if (!href) return true;

      const sameIndexQuery =
        path === href.split('?')[0] &&
        (path === '/events' || path === '/venues' || path === '/locations' || path === '/podborki');
      if (sameIndexQuery) {
        router.replace(href, { scroll: false });
      } else {
        router.push(href);
      }
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
