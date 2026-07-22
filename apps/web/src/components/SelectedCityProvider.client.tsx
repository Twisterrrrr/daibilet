'use client';

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { buildCatalogHref } from '@/lib/catalog-url';
import { resolveLandingCityName } from '@/lib/landing-city';
import { canonicalLandingSlug } from '@/lib/landing-constants';
import {
  landingCategoryHref,
  MULTI_CITY_LANDING_SLUGS,
  normalizeKnownCitySlug,
  resolveLandingRouteFromLocation,
} from '@/lib/landing-routes';
import {
  isCityFilterPath,
  matchDestination,
  mergeStoredCityIntoSearchParams,
  persistSelectedCity,
  resolveCityLabel,
} from '@/lib/selected-city';

type SelectedCityContextValue = {
  cityValue: string;
  cityLabel: string;
  /** False until client has read storage / URL — avoid flashing «Все города». */
  cityReady: boolean;
  selectedDestination: PublicDestinationDto | null;
  setCity: (name: string) => void;
};

const SelectedCityContext = createContext<SelectedCityContextValue | null>(null);

function catalogPathBase(pathname: string): string {
  const path = pathname.replace(/\/$/, '') || '/';
  if (path.startsWith('/venues')) return '/venues';
  if (path.startsWith('/locations')) return '/locations';
  return '/events';
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
  const searchParams = useSearchParams();
  const urlCity = searchParams.get('city');
  const [cityLabel, setCityLabel] = useState('Все города');
  const [cityReady, setCityReady] = useState(false);

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

    const merged = mergeStoredCityIntoSearchParams(destinations, new URLSearchParams(searchParams.toString()));
    if (!merged) return;
    const query = merged.toString();
    router.replace(query ? `${base}?${query}` : base, { scroll: false });
  }, [destinations, pathname, router, searchParams]);

  // Keep storage aligned with an explicit catalog city (including deep-links).
  useLayoutEffect(() => {
    if (!isCityFilterPath(pathname) || !urlCity) return;
    const matched = matchDestination(destinations, urlCity);
    if (matched) persistSelectedCity(matched.name);
  }, [destinations, pathname, urlCity]);

  const cityValue = cityLabel === 'Все города' ? 'all' : cityLabel;
  const selectedDestination = useMemo(
    () => (cityValue === 'all' ? null : matchDestination(destinations, cityValue)),
    [cityValue, destinations],
  );

  const setCity = useCallback(
    (name: string) => {
      persistSelectedCity(name);
      setCityLabel(name === 'all' ? 'Все города' : name);
      setCityReady(true);

      if (pathname === '/') {
        return;
      }

      const path = pathname.replace(/\/$/, '') || '/';
      if (path === '/events' || path === '/venues' || path === '/locations') {
        const params = new URLSearchParams(searchParams.toString());
        if (name === 'all') params.delete('city');
        else params.set('city', name);
        params.delete('page');
        const query = params.toString();
        router.push(query ? `${path}?${query}` : path);
        return;
      }

      const landingRoute = resolveLandingRouteFromLocation(pathname);
      if (
        landingRoute &&
        MULTI_CITY_LANDING_SLUGS.has(canonicalLandingSlug(landingRoute.landingSlug))
      ) {
        if (name === 'all') {
          router.push(landingCategoryHref(landingRoute.landingSlug));
          return;
        }
        const matched = matchDestination(destinations, name);
        const citySlug =
          normalizeKnownCitySlug(matched?.slug) ||
          normalizeKnownCitySlug(matched?.sourceSlug) ||
          normalizeKnownCitySlug(name);
        if (citySlug) {
          router.push(landingCategoryHref(landingRoute.landingSlug, citySlug));
          return;
        }
      }

      router.push(
        buildCatalogHref({
          city: name !== 'all' ? name : undefined,
          sort: 'popular',
        }),
      );
    },
    [destinations, pathname, router, searchParams],
  );

  const value = useMemo(
    () => ({ cityValue, cityLabel, cityReady, selectedDestination, setCity }),
    [cityValue, cityLabel, cityReady, selectedDestination, setCity],
  );

  return <SelectedCityContext.Provider value={value}>{children}</SelectedCityContext.Provider>;
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
