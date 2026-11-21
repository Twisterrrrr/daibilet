'use client';

import { CityCard } from '@/components/CityCard';
import type { PublicDestinationDto } from '@daibilet/contracts/public';

type HomePopularCitiesRailProps = {
  cities: PublicDestinationDto[];
  className?: string;
};

/**
 * Keep every featured city link in the initial HTML and usable without JavaScript.
 */
export function HomePopularCitiesRail({ cities, className = '' }: HomePopularCitiesRailProps) {
  if (!cities.length) return null;

  return (
    <div className={`container-page ${className}`.trim()}>
      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5 md:grid-cols-4 lg:grid-cols-4"
        aria-label="Популярные города"
        role="list"
      >
        {cities.map((city, index) => (
          <div key={`${city.slug || city.name}:${index}`} role="listitem">
            <CityCard city={city} compact />
          </div>
        ))}
      </div>

    </div>
  );
}
