'use client';

import Link from 'next/link';
import { MapPin, Ticket } from 'lucide-react';

import { AddToDayRouteButton } from '@/components/AddToDayRouteButton.client';
import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { formatStreetAddress } from '@/lib/address';
import { pluralEvents } from '@/lib/format';
import type { VenueCatalogCard } from '@/lib/venue-map-types';
import { resolvePublicVenueType, venueTypeLabel } from '@/lib/venue-meta';

const TYPE_GRADIENT: Record<string, string> = {
  museum: 'from-stone-600 via-amber-800 to-slate-900',
  art_space: 'from-violet-700 via-fuchsia-900 to-slate-950',
  museum_art_space: 'from-stone-600 via-amber-800 to-slate-900',
  theater: 'from-rose-700 via-red-900 to-slate-950',
  concert_hall: 'from-slate-600 via-slate-800 to-slate-950',
  bar: 'from-amber-800 via-orange-950 to-slate-950',
  club_bar_restaurant: 'from-teal-700 via-slate-800 to-slate-950',
};

type InstitutionCardVenue = VenueCatalogCard;

function topCategory(venue: InstitutionCardVenue): string | null {
  const entries = Object.entries(venue.categories || {});
  if (!entries.length) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

export function InstitutionCard({ venue, href }: { venue: InstitutionCardVenue; href: string }) {
  const publicType = resolvePublicVenueType(venue.type, venue.name);
  const typeLabel = venueTypeLabel(publicType, venue.name);
  const gradient = TYPE_GRADIENT[publicType] || 'from-slate-700 via-slate-800 to-slate-950';
  const street = formatStreetAddress(venue.address, { city: venue.city });
  const category = topCategory(venue);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-card bg-white shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-card-hover">
      <Link href={href} className="flex flex-1 flex-col no-underline">
        <div className="relative aspect-[4/3] overflow-hidden bg-surface-muted">
          <SafeImage
            src={venue.heroImageUrl}
            alt=""
            fill
            sizes={IMAGE_SIZES.institutionCard}
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
            fallback={<div className={`h-full w-full bg-gradient-to-br ${gradient}`} />}
          />

          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <span className="rounded-lg bg-white/95 px-2.5 py-1 text-xs font-semibold text-graphite backdrop-blur">
              {typeLabel}
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
          <h3 className="line-clamp-2 font-display text-base font-semibold text-graphite group-hover:text-primary-600">
            {venue.name}
          </h3>

          <div className="space-y-1 text-sm text-graphite-muted">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              <span className="truncate">{street || venue.city}</span>
            </div>
          </div>

          {venue.shortDescription ? (
            <p className="line-clamp-2 text-xs leading-relaxed text-graphite-muted">{venue.shortDescription}</p>
          ) : null}
          {category ? <p className="text-xs text-graphite-muted">В афише: {category}</p> : null}

          <div className="mt-auto flex items-end justify-between gap-3 pt-1">
            <div>
              <div className="text-xs text-graphite-muted">{venue.city}</div>
              {venue.events > 0 ? (
                <div className="text-sm font-semibold text-graphite">{pluralEvents(venue.events)}</div>
              ) : null}
            </div>
            <span className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white transition group-hover:bg-primary-700">
              <Ticket className="h-3.5 w-3.5" strokeWidth={1.75} />
              Афиша
            </span>
          </div>
        </div>
      </Link>

      <div
        className="absolute right-2 top-2 z-20"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
      >
        <AddToDayRouteButton
          key={venue.id}
          compact
          className="!min-h-9 !rounded-lg !px-2.5 !py-1.5 !text-[11px] shadow-sm"
          venue={{
            id: venue.id,
            slug: venue.slug,
            title: venue.name,
            city: venue.city,
            cityId: venue.cityId,
            citySlug: venue.citySlug,
            href,
            imageUrl: venue.heroImageUrl,
            address: venue.address,
            latitude: venue.latitude,
            longitude: venue.longitude,
          }}
        />
      </div>
    </div>
  );
}
