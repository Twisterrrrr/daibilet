import * as React from 'react';
import { loadCityHubData, type CityHubData } from '@/lib/city-hub-lazy';

/**
 * React hook that lazy-loads city hub data on demand.
 * Returns null while loading, CityHubData when loaded.
 * Caches loaded hubs in memory for the session.
 */
export function useCityHubData(citySlug: string | null | undefined): CityHubData | null {
  const [data, setData] = React.useState<CityHubData | null>(null);

  React.useEffect(() => {
    if (!citySlug) { setData(null); return; }
    let cancelled = false;
    loadCityHubData(citySlug).then((result) => {
      if (!cancelled) setData(result);
    });
    return () => { cancelled = true; };
  }, [citySlug]);

  return data;
}
