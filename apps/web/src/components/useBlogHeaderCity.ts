'use client';

import { useMemo } from 'react';

import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { resolveBlogRankCitySlug } from '@/lib/blog-feed-rank';

export function useBlogHeaderCity() {
  const selectedCity = useSelectedCityOptional();

  return useMemo(() => {
    const cityReady = selectedCity?.cityReady ?? true;
    if (!cityReady || !selectedCity || selectedCity.cityValue === 'all') {
      return { citySlug: null, cityName: null, cityReady };
    }

    const citySlug = resolveBlogRankCitySlug(
      selectedCity.cityValue,
      selectedCity.selectedDestination?.slug,
      selectedCity.selectedDestination?.sourceSlug,
      selectedCity.selectedDestination?.name,
    );

    const cityName =
      selectedCity.selectedDestination?.name ||
      (selectedCity.cityLabel !== 'Все города' ? selectedCity.cityLabel : null);

    return { citySlug, cityName, cityReady };
  }, [selectedCity]);
}
