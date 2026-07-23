'use client';

import Link from 'next/link';
import { ChevronRight, MapPin } from 'lucide-react';

import { formatStreetAddress } from '@/lib/address';
import { pluralEvents } from '@/lib/format';
import type { VenueCatalogCard } from '@/lib/venue-map-types';
import { venueTypeLabel } from '@/lib/venue-meta';

export function InstitutionListRow({
  venue,
  href,
}: {
  venue: Pick<VenueCatalogCard, 'name' | 'city' | 'events' | 'type' | 'address'>;
  href: string;
}) {
  const street = formatStreetAddress(venue.address, { city: venue.city });
  const typeLabel = venueTypeLabel(venue.type);

  return (
    <Link href={href} className="group flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50 sm:gap-4 sm:px-5 sm:py-3.5">
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-slate-900 group-hover:text-primary-600">{venue.name}</div>
        {venue.city || street ? (
          <div className="mt-0.5 flex items-start gap-1.5 text-sm text-slate-500">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="line-clamp-2">
              {venue.city ? <span className="font-medium text-slate-600">{venue.city}</span> : null}
              {venue.city && street ? <span className="text-slate-400"> · </span> : null}
              {street ? <span>{street}</span> : null}
            </span>
          </div>
        ) : null}
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        <div className="text-xs text-slate-400">{typeLabel}</div>
        <div className="text-sm font-semibold text-slate-700">{venue.events > 0 ? pluralEvents(venue.events) : 'Скоро'}</div>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-primary-500" aria-hidden />
    </Link>
  );
}

export function InstitutionList({
  venues,
  hrefFor,
  className = '',
}: {
  venues: Array<Pick<VenueCatalogCard, 'id' | 'name' | 'city' | 'events' | 'type' | 'address' | 'slug'>>;
  hrefFor: (venue: Pick<VenueCatalogCard, 'id' | 'name' | 'city' | 'events' | 'type' | 'address' | 'slug'>) => string;
  className?: string;
}) {
  if (!venues.length) return null;

  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 ${className}`}>
      {venues.map((venue) => (
        <InstitutionListRow key={venue.id} venue={venue} href={hrefFor(venue)} />
      ))}
    </div>
  );
}
