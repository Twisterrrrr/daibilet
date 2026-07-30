'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useMemo } from 'react';

import { InstitutionCard } from '@/components/InstitutionCard.client';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import type { PublicVenueDto } from '@daibilet/contracts/public';
import { balancedTileGridClass } from '@/lib/balanced-tile-grid';
import { filterVenuesByCity } from '@/lib/landing-city';
import { venueHref } from '@/lib/routes';
import { venuePageTemplate } from '@/lib/venue-meta';
import { venueCatalogHrefWithSelectedCity } from '@/lib/catalog-url';

export function HomeVenuesSection({ venues }: { venues: PublicVenueDto[] }) {
  const selectedCity = useSelectedCityOptional();
  const cityReady = selectedCity?.cityReady ?? true;
  const cityValue = selectedCity?.cityValue ?? 'all';
  const cityName =
    cityValue === 'all'
      ? null
      : selectedCity?.selectedDestination?.name ||
        (selectedCity?.cityLabel !== 'Все города' ? selectedCity?.cityLabel : null) ||
        null;
  const citySlug = selectedCity?.selectedDestination?.slug || null;

  const homeVenues = useMemo(() => {
    const base = venues
      .filter((venue) => venuePageTemplate(venue.type) === 'institution' && venue.events >= 3 && venue.address)
      .sort((a, b) => b.events - a.events);

    if (!cityReady || !cityName || cityValue === 'all') return base.slice(0, 8);
    return filterVenuesByCity(base, cityName, citySlug).slice(0, 8);
  }, [venues, cityReady, cityName, citySlug, cityValue]);

  if (!homeVenues.length) return null;

  const venuesHref = venueCatalogHrefWithSelectedCity('/venues', cityReady ? cityValue : 'all');
  const cityHint = cityReady && cityName ? ` · ${cityName}` : '';

  return (
    <section id="venues" className="section-y border-t border-slate-100">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Популярные места и площадки
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Музеи, театры, концертные залы и культурные пространства{cityHint}
            </p>
          </div>
          <Link
            href={venuesHref}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            Все площадки <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className={`mt-6 grid gap-4 sm:grid-cols-2 ${balancedTileGridClass(homeVenues.length, { lg: 4 })}`}>
          {homeVenues.map((venue) => (
            <InstitutionCard key={venue.id} venue={venue} href={venueHref(venue)} />
          ))}
        </div>
      </div>
    </section>
  );
}
