import { Clock, MapPin, Train } from 'lucide-react';

import { formatStreetAddress } from '@/lib/address';
import { pluralEvents, venueTypeIcon, venueTypeLabel } from '@/lib/venue-meta';
import type { PublicVenue } from '@/types';

export function LocationCard({
  venue,
  href,
  nextSlot,
}: {
  venue: Pick<PublicVenue, 'name' | 'city' | 'events' | 'type' | 'address'>;
  href: string;
  nextSlot?: string | null;
}) {
  const TypeIcon = venueTypeIcon(venue.type);
  const typeLabel = venueTypeLabel(venue.type);
  const street = formatStreetAddress(venue.address, { city: venue.city }) || venue.city;

  return (
    <a
      href={href}
      className="group flex items-stretch overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
    >
      <div className="relative flex w-24 shrink-0 flex-col items-center justify-center bg-gradient-to-br from-sky-500 via-primary-600 to-indigo-600 p-3 text-white sm:w-28">
        <TypeIcon className="h-8 w-8" />
        <div className="mt-2 text-center text-[10px] font-semibold uppercase tracking-wider opacity-90">{typeLabel}</div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-base font-semibold text-slate-900 group-hover:text-primary-600">{venue.name}</h3>
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
            {venue.events > 0 ? pluralEvents(venue.events) : 'Скоро'}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{street}</span>
        </div>

        <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
          <Train className="h-3.5 w-3.5 shrink-0 opacity-40" />
          <span className="truncate text-slate-400">{venue.city}</span>
        </div>

        {nextSlot ? (
          <div className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <Clock className="h-3 w-3" />
            Ближайший старт: {nextSlot}
          </div>
        ) : null}
      </div>
    </a>
  );
}
