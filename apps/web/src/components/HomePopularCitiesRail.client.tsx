'use client';

import { useMemo, useState } from 'react';

import { CityCard } from '@/components/CityCard';
import type { PublicDestinationDto } from '@daibilet/contracts/public';

const INITIAL_VISIBLE = 8;

type HomePopularCitiesRailProps = {
  cities: PublicDestinationDto[];
  className?: string;
};

/**
 * Finite popular-cities grid (no infinite loop). First N cards, then «Показать ещё».
 */
export function HomePopularCitiesRail({ cities, className = '' }: HomePopularCitiesRailProps) {
  const [expanded, setExpanded] = useState(false);

  const visible = useMemo(() => {
    if (expanded || cities.length <= INITIAL_VISIBLE) return cities;
    return cities.slice(0, INITIAL_VISIBLE);
  }, [cities, expanded]);

  const canExpand = cities.length > INITIAL_VISIBLE && !expanded;

  if (!cities.length) return null;

  return (
    <div className={`container-page ${className}`.trim()}>
      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5 md:grid-cols-4 lg:grid-cols-4"
        aria-label="Популярные города"
        role="list"
      >
        {visible.map((city, index) => (
          <div key={`${city.slug || city.name}:${index}`} role="listitem">
            <CityCard city={city} compact />
          </div>
        ))}
      </div>

      {canExpand ? (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            Показать ещё
          </button>
        </div>
      ) : null}
    </div>
  );
}
