'use client';

import * as React from 'react';
import { ArrowRight } from 'lucide-react';

import { LocationCard } from '@/components/LocationCard.client';
import { normalizeVenueKind } from '@/lib/venue-meta';
import { venueCatalogHref, venueHref } from '@/lib/routes';
import type { PublicVenueDto } from '@daibilet/contracts/public';

type LandingCityLocationsProps = {
  cityName: string;
  profile: 'river' | 'bus';
};

export function LandingCityLocations({ cityName, profile }: LandingCityLocationsProps) {
  const [venues, setVenues] = React.useState<PublicVenueDto[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      limit: '12',
      family: 'location',
      city: cityName,
    });

    fetch(`/api/public/venues?${params.toString()}`, {
      cache: 'default',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as { venues?: PublicVenueDto[] };
      })
      .then((payload) => {
        const allowedTypes = profile === 'bus' ? new Set(['bus']) : new Set(['pier', 'pier_water']);
        const next = (payload.venues || [])
          .filter((venue) => allowedTypes.has(normalizeVenueKind(venue.type)))
          .sort((left, right) => right.events - left.events)
          .slice(0, 6);
        setVenues(next);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [cityName, profile]);

  if (isLoading) {
    return (
      <section className="container-page py-8">
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      </section>
    );
  }

  if (!venues.length) return null;

  const title = profile === 'bus' ? 'Точки посадки автобусных экскурсий' : 'Причалы речных прогулок';
  const subtitle =
    profile === 'bus'
      ? `Где садиться на автобус в ${cityName}: адрес, карта и ближайшие рейсы.`
      : `Откуда отправляются теплоходы в ${cityName}: причал, карта и расписание рядом.`;

  return (
    <section className="container-page py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">{subtitle}</p>
        </div>
        <a href={venueCatalogHref('location')} className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:text-primary-800">
          Все локации
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {venues.map((venue, index) => (
          <LocationCard
            key={venue.id}
            venue={venue}
            href={venueHref(venue)}
            priority={index < 3}
          />
        ))}
      </div>
    </section>
  );
}
