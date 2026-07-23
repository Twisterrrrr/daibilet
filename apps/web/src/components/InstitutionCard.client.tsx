'use client';

import Link from 'next/link';
import { MapPin, Ticket } from 'lucide-react';

import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { formatStreetAddress } from '@/lib/address';
import { pluralEvents } from '@/lib/format';
import type { VenueCatalogCard } from '@/lib/venue-map-types';
import { venueTypeLabel } from '@/lib/venue-meta';

const TYPE_GRADIENT: Record<string, string> = {
  museum_art_space: 'from-amber-600 via-orange-700 to-slate-900',
  theater: 'from-rose-600 via-red-800 to-slate-950',
  concert_hall: 'from-violet-600 via-indigo-800 to-slate-950',
  bar: 'from-amber-700 via-orange-900 to-slate-950',
  club_bar_restaurant: 'from-emerald-600 via-teal-800 to-slate-950',
};

type InstitutionCardVenue = VenueCatalogCard;

function topCategory(venue: InstitutionCardVenue): string | null {
  const entries = Object.entries(venue.categories || {});
  if (!entries.length) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

export function InstitutionCard({ venue, href }: { venue: InstitutionCardVenue; href: string }) {
  const typeLabel = venueTypeLabel(venue.type);
  const gradient = TYPE_GRADIENT[venue.type] || 'from-slate-700 via-slate-800 to-slate-950';
  const street = formatStreetAddress(venue.address, { city: venue.city });
  const category = topCategory(venue);

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-slate-200/50"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <SafeImage
          src={venue.heroImageUrl}
          alt=""
          fill
          sizes={IMAGE_SIZES.institutionCard}
          className="object-cover transition duration-500 group-hover:scale-105"
          fallback={<div className={`h-full w-full bg-gradient-to-br ${gradient}`} />}
        />

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-700 backdrop-blur">
            {typeLabel}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-base font-semibold text-slate-900 group-hover:text-primary-600">{venue.name}</h3>

        <div className="mt-2 space-y-1 text-sm text-slate-500">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{street || venue.city}</span>
          </div>
        </div>

        {venue.shortDescription ? (
          <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-500">{venue.shortDescription}</p>
        ) : null}
        {category ? <p className={`text-xs text-slate-500 ${venue.shortDescription ? 'mt-2' : 'mt-3'}`}>В афише: {category}</p> : null}

        <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-3">
          <div>
            <div className="text-xs text-slate-400">{venue.city}</div>
            <div className="text-sm font-semibold text-slate-900">
              {venue.events > 0 ? pluralEvents(venue.events) : 'Афиша скоро'}
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white group-hover:bg-primary-600">
            <Ticket className="h-3.5 w-3.5" />
            Афиша
          </span>
        </div>
      </div>
    </Link>
  );
}
