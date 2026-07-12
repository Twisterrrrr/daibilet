'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { buildCatalogHref } from '@/lib/catalog-url';
import { matchDestination, persistSelectedCity, resolveCityLabel } from '@/lib/selected-city';

type SelectedCityContextValue = {
  cityValue: string;
  cityLabel: string;
  selectedDestination: PublicDestinationDto | null;
  setCity: (name: string) => void;
};

const SelectedCityContext = createContext<SelectedCityContextValue | null>(null);

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

  useEffect(() => {
    const fromUrl = pathname.startsWith('/events') ? urlCity : null;
    setCityLabel(resolveCityLabel(destinations, fromUrl));
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

      if (pathname === '/') {
        return;
      }

      if (pathname.startsWith('/events')) {
        const params = new URLSearchParams(searchParams.toString());
        if (name === 'all') params.delete('city');
        else params.set('city', name);
        const query = params.toString();
        router.push(query ? `/events?${query}` : '/events');
        return;
      }

      router.push(
        buildCatalogHref({
          city: name !== 'all' ? name : undefined,
          sort: 'popular',
        }),
      );
    },
    [pathname, router, searchParams],
  );

  const value = useMemo(
    () => ({ cityValue, cityLabel, selectedDestination, setCity }),
    [cityValue, cityLabel, selectedDestination, setCity],
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
