'use client';

import * as React from 'react';

import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';

/**
 * Event PDP: page city beats global header filter.
 * persistOnly - stay on PDP; skipRouteConfirm - do not touch dayRoute.
 */
export function EventPageCitySync({ city }: { city?: string | null }) {
  const selectedCity = useSelectedCityOptional();

  React.useEffect(() => {
    const name = String(city || '').trim();
    if (!name || name === 'Не указан') return;
    if (!selectedCity || selectedCity.cityValue === name) return;
    void selectedCity.setCity(name, { skipRouteConfirm: true, persistOnly: true });
  }, [selectedCity, city]);

  return null;
}
