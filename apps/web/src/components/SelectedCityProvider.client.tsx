'use client';

import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { CityConfirmModal } from '@/components/CityConfirmModal.client';
import { resolveCityChangeNav } from '@/lib/city-change-nav';
import {
  confirmClearDayRouteForCityChange,
} from '@/lib/day-route-city-change';
import { resolveLandingCityName } from '@/lib/landing-city';
import { canonicalLandingSlug } from '@/lib/landing-constants';
import {
  dispatchOpenHeaderCityPicker,
  hasExplicitCityChoice,
  isHomePath,
  isMobileViewport,
  markCityPromptCompleted,
  readBrowserPosition,
  readGrantedBrowserPosition,
  shouldOfferFirstVisitCityPrompt,
  suggestNearestCity,
} from '@/lib/first-visit-city';
import {
  isCityFilterPath,
  isMyDayPath,
  matchDestination,
  mergeStoredCityIntoSearchParams,
  persistSelectedCity,
  readsCityQueryParam,
  resolveCityHubDestination,
  resolveCityLabel,
} from '@/lib/selected-city';
import { resolveRegionChildCityScope } from '@/lib/region-child-city-scope';
import { getRegionCenterCityName } from '@/lib/cityRegionHub';
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
  /** False when user cancels route-reset confirm (city value unchanged). */
  setCity: (name: string, options?: SetCityOptions) => Promise<boolean>;
};

const SelectedCityContext = createContext<SelectedCityContextValue | null>(null);

function catalogPathBase(pathname: string): string {
  const path = pathname.replace(/\/$/, '') || '/';
  if (path.startsWith('/venues')) return '/venues';
  if (path.startsWith('/locations')) return '/locations';
  if (path.startsWith('/places')) return '/places';
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

type PendingConfirm = {
  message: string;
  resolve: (ok: boolean) => void;
};

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
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const pendingConfirmRef = useRef<PendingConfirm | null>(null);
  /** First-visit CityConfirmModal: suggested catalog city or null = pick yourself. */
  const [firstVisitPrompt, setFirstVisitPrompt] = useState<{ suggestedName: string | null } | null>(
    null,
  );
  /** Picker choice that must not be overwritten by a stale `?city=` / hub slug. */
  const pendingCityRef = useRef<string | null>(null);
  const cityLabelRef = useRef(cityLabel);
  cityLabelRef.current = cityLabel;
  const mobileHomeGeoAttemptedRef = useRef(false);

  const onParams = useCallback((params: URLSearchParams) => {
    setUrlCity(params.get('city'));
    setSearchParamsKey(params.toString());
  }, []);

  const requestCityChangeConfirm = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      const next = { message, resolve };
      pendingConfirmRef.current = next;
      setPendingConfirm(next);
    });
  }, []);

  const closeConfirm = useCallback((ok: boolean) => {
    const pending = pendingConfirmRef.current;
    pendingConfirmRef.current = null;
    setPendingConfirm(null);
    pending?.resolve(ok);
  }, []);

  // Sync before paint so the first meaningful filter render already has the stored city.
  useLayoutEffect(() => {
    const fromCityHub = resolveCityHubDestination(destinations, pathname);
    let nextLabel: string;
    if (fromCityHub) {
      if (fromCityHub.type === 'region') {
        const child = resolveRegionChildCityScope({
          search: searchParamsKey,
          regionName: fromCityHub.name,
          regionSlug: fromCityHub.slug || '',
          centerSlug: getRegionCenterCityName(fromCityHub),
          childCities: [],
        });
        nextLabel = child?.name || fromCityHub.name;
      } else {
        nextLabel = fromCityHub.name;
      }
    } else {
      const landingRoute = resolveLandingRouteFromLocation(pathname);
      // Any landing path that already carries a city (MULTI + city-scoped) write-through to header.
      if (landingRoute?.citySlug) {
        const fromLanding =
          matchDestination(destinations, landingRoute.citySlug) ||
          matchDestination(destinations, resolveLandingCityName(landingRoute.citySlug));
        nextLabel =
          fromLanding?.name ||
          resolveLandingCityName(landingRoute.citySlug) ||
          resolveCityLabel(destinations, readsCityQueryParam(pathname) ? urlCity : null);
      } else {
        const fromUrl = readsCityQueryParam(pathname) ? urlCity : null;
        nextLabel = resolveCityLabel(destinations, fromUrl);
      }
    }

    const pending = pendingCityRef.current;
    if (pending) {
      const pendingLabel = pending === 'all' ? 'Все города' : pending;
      const pendingMatch = pending === 'all' ? null : matchDestination(destinations, pending);
      const nextMatch = nextLabel === 'Все города' ? null : matchDestination(destinations, nextLabel);
      const caughtUp =
        nextLabel === pendingLabel ||
        (pending === 'all' && nextLabel === 'Все города') ||
        Boolean(pendingMatch && nextMatch && pendingMatch.name === nextMatch.name);
      if (!caughtUp) {
        setCityLabel(pendingLabel);
        setCityReady(true);
        return;
      }
      pendingCityRef.current = null;
    }

    setCityLabel(nextLabel);
    setCityReady(true);
  }, [destinations, pathname, urlCity, searchParamsKey]);

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
  // Region hub `/cities/{oblast}?city=vyborg` must persist the child city, not the oblast
  // (My Day cannot use type=region as a day-route city).
  useLayoutEffect(() => {
    const pending = pendingCityRef.current;
    if (pending && pending !== 'all') {
      const urlMatch = urlCity ? matchDestination(destinations, urlCity) : null;
      const pendingMatch = matchDestination(destinations, pending);
      if (urlMatch && pendingMatch && urlMatch.name !== pendingMatch.name) {
        return;
      }
    }
    if (readsCityQueryParam(pathname) && String(urlCity || '').trim().toLowerCase() === 'all') {
      persistSelectedCity('all');
      return;
    }
    if (readsCityQueryParam(pathname) && urlCity) {
      const matched = matchDestination(destinations, urlCity);
      if (matched) {
        // My Day URL with a region token → do not lock storage on the oblast.
        if (isMyDayPath(pathname) && matched.type === 'region') return;
        persistSelectedCity(matched.name);
      }
      return;
    }

    const hub = resolveCityHubDestination(destinations, pathname);
    if (!hub) return;
    if (hub.type === 'region') {
      const child = resolveRegionChildCityScope({
        search: searchParamsKey,
        regionName: hub.name,
        regionSlug: hub.slug || '',
        centerSlug: getRegionCenterCityName(hub),
        childCities: [],
      });
      if (child?.name) {
        persistSelectedCity(child.name);
        return;
      }
      // Bare region hub: keep region in chrome for catalog, My Day will redirect UI.
    }
    persistSelectedCity(hub.name);
  }, [destinations, pathname, urlCity, searchParamsKey]);

  // Persist city from any landing path that already carries a city segment.
  useLayoutEffect(() => {
    const landingRoute = resolveLandingRouteFromLocation(pathname);
    if (!landingRoute?.citySlug) return;
    const matched =
      matchDestination(destinations, landingRoute.citySlug) ||
      matchDestination(destinations, resolveLandingCityName(landingRoute.citySlug));
    if (matched?.name) persistSelectedCity(matched.name);
  }, [destinations, pathname]);

  const closeFirstVisit = useCallback((openPicker: boolean) => {
    markCityPromptCompleted();
    setFirstVisitPrompt(null);
    if (openPicker) dispatchOpenHeaderCityPicker();
  }, []);

  // Mobile home: request geolocation once and apply nearest catalog city silently.
  useEffect(() => {
    if (!cityReady || pendingConfirm) return;
    if (cityLabel !== 'Все города') return;
    if (!isHomePath(pathname)) return;
    if (!isMobileViewport()) return;
    if (hasExplicitCityChoice(destinations)) return;
    if (mobileHomeGeoAttemptedRef.current) return;
    mobileHomeGeoAttemptedRef.current = true;

    const cities = destinations.filter((item) => item.type === 'city');
    if (cities.length === 0) return;

    let cancelled = false;
    void (async () => {
      const position = await readBrowserPosition();
      if (cancelled) return;
      if (cityLabelRef.current !== 'Все города') return;
      if (hasExplicitCityChoice(destinations)) return;
      const suggested = position
        ? suggestNearestCity(cities, position.latitude, position.longitude)
        : null;
      markCityPromptCompleted();
      if (suggested?.name) {
        persistSelectedCity(suggested.name);
        setCityLabel(suggested.name);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cityLabel, cityReady, destinations, pathname, pendingConfirm]);

  // Soft first-visit confirm. Never overwrite a stored / URL / hub city.
  // Desktop + non-home: GPS only if permission is already granted.
  useEffect(() => {
    if (!cityReady || firstVisitPrompt || pendingConfirm) return;
    if (cityLabel !== 'Все города') return;
    if (!shouldOfferFirstVisitCityPrompt(pathname)) return;
    if (hasExplicitCityChoice(destinations)) return;
    if (isHomePath(pathname) && isMobileViewport()) return;
    const cities = destinations.filter((item) => item.type === 'city');
    if (cities.length === 0) return;

    let cancelled = false;
    void (async () => {
      const position = await readGrantedBrowserPosition();
      if (cancelled) return;
      if (cityLabelRef.current !== 'Все города') return;
      if (hasExplicitCityChoice(destinations)) return;
      const suggested = position
        ? suggestNearestCity(cities, position.latitude, position.longitude)
        : null;
      setFirstVisitPrompt({ suggestedName: suggested?.name ?? null });
    })();
    return () => {
      cancelled = true;
    };
  }, [cityLabel, cityReady, destinations, firstVisitPrompt, pathname, pendingConfirm]);

  useEffect(() => {
    if (!firstVisitPrompt) return;
    if (cityLabel === 'Все города') return;
    markCityPromptCompleted();
    setFirstVisitPrompt(null);
  }, [cityLabel, firstVisitPrompt]);

  const cityValue = cityLabel === 'Все города' ? 'all' : cityLabel;
  const selectedDestination = useMemo(
    () => (cityValue === 'all' ? null : matchDestination(destinations, cityValue)),
    [cityValue, destinations],
  );

  const setCity = useCallback(
    async (name: string, options?: SetCityOptions): Promise<boolean> => {
      // Any explicit picker change with a filled day-route → custom confirm (not only /my-day).
      if (!options?.skipRouteConfirm) {
        const current = cityLabel === 'Все города' ? 'all' : cityLabel;
        const ok = await confirmClearDayRouteForCityChange(name, current, (message) =>
          requestCityChangeConfirm(message),
        );
        if (!ok) return false;
      }

      persistSelectedCity(name);
      pendingCityRef.current = name;
      setCityLabel(name === 'all' ? 'Все города' : name);
      setCityReady(true);

      // PDP hydrate (venue/location/event): only align chrome city - never navigate away.
      if (options?.persistOnly) {
        pendingCityRef.current = null;
        return true;
      }

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
        pendingCityRef.current = null;
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
      if (!href) {
        pendingCityRef.current = null;
        return true;
      }

      const path = pathname.replace(/\/$/, '') || '/';
      const sameIndexQuery =
        path === href.split('?')[0] &&
        (path === '/events' ||
          path === '/venues' ||
          path === '/locations' ||
          path === '/places' ||
          path === '/podborki' ||
          isMyDayPath(path));
      if (sameIndexQuery) {
        router.replace(href, { scroll: false });
      } else {
        router.push(href);
      }
      return true;
    },
    [cityLabel, destinations, pathname, requestCityChangeConfirm, router, searchParamsKey],
  );

  const value = useMemo(
    () => ({ cityValue, cityLabel, cityReady, selectedDestination, destinations, setCity }),
    [cityValue, cityLabel, cityReady, selectedDestination, destinations, setCity],
  );

  const confirmMessage = pendingConfirm?.message || '';
  const routeConfirmOpen = Boolean(pendingConfirm);
  const firstVisitOpen = Boolean(firstVisitPrompt) && !routeConfirmOpen;
  const suggestedName = firstVisitPrompt?.suggestedName || '';
  const firstVisitTitle = suggestedName ? 'Ваш город?' : 'Выберите город';
  const firstVisitMessage = suggestedName
    ? `Похоже, вы в ${suggestedName}. Показать афишу этого города?`
    : 'Укажите город, чтобы видеть события и места рядом. Его всегда можно сменить в шапке.';
  const firstVisitConfirmLabel = suggestedName ? 'Да, это мой город' : 'Выбрать город';
  const firstVisitCancelLabel = suggestedName ? 'Другой город' : 'Позже';

  return (
    <SelectedCityContext.Provider value={value}>
      <Suspense fallback={null}>
        <CitySearchParamsBridge onParams={onParams} />
      </Suspense>
      {children}
      <CityConfirmModal
        open={routeConfirmOpen || firstVisitOpen}
        title={routeConfirmOpen ? 'Переключить город?' : firstVisitTitle}
        message={routeConfirmOpen ? confirmMessage : firstVisitMessage}
        confirmLabel={routeConfirmOpen ? 'Очистить и перейти' : firstVisitConfirmLabel}
        cancelLabel={routeConfirmOpen ? 'Отмена' : firstVisitCancelLabel}
        onConfirm={() => {
          if (routeConfirmOpen) {
            closeConfirm(true);
            return;
          }
          if (suggestedName) {
            markCityPromptCompleted();
            setFirstVisitPrompt(null);
            void setCity(suggestedName, { skipRouteConfirm: true });
            return;
          }
          closeFirstVisit(true);
        }}
        onCancel={() => {
          if (routeConfirmOpen) {
            closeConfirm(false);
            return;
          }
          closeFirstVisit(Boolean(suggestedName));
        }}
      />
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
