'use client';

import Link from 'next/link';
import { MapPin, Star, Ticket } from 'lucide-react';

import { AddToDayRouteButton } from '@/components/AddToDayRouteButton.client';
import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { formatStreetAddress } from '@/lib/address';
import { dayRouteHookLine } from '@/lib/day-route-from-place';
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

const TYPE_TAG_CLASS: Record<string, string> = {
  museum: 'bg-amber-500 text-white',
  art_space: 'bg-fuchsia-600 text-white',
  museum_art_space: 'bg-amber-500 text-white',
  theater: 'bg-rose-600 text-white',
  concert_hall: 'bg-indigo-600 text-white',
  bar: 'bg-amber-700 text-white',
  club_bar_restaurant: 'bg-teal-600 text-white',
};

type InstitutionCardVenue = VenueCatalogCard;

function realRating(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 10) / 10;
}

export function InstitutionCard({ venue, href }: { venue: InstitutionCardVenue; href: string }) {
  const publicType = resolvePublicVenueType(venue.type, venue.name);
  const typeLabel = venueTypeLabel(publicType, venue.name);
  const gradient = TYPE_GRADIENT[publicType] || 'from-slate-700 via-slate-800 to-slate-950';
  const tagClass = TYPE_TAG_CLASS[publicType] || 'bg-primary-600 text-white';
  const street = formatStreetAddress(venue.address, { city: venue.city });
  const blurb = dayRouteHookLine({ shortDescription: venue.shortDescription });
  const rating = realRating(venue.rating);
  const upcoming = venue.upcomingTitles?.filter(Boolean).slice(0, 3) || [];
  const showMiniAfisha = upcoming.length > 0;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-card bg-white shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-card-hover">
      <Link href={href} className="flex flex-1 flex-col no-underline">
        <div className="relative aspect-[3/4] overflow-hidden bg-surface-muted sm:aspect-[2/3]">
          <SafeImage
            src={venue.heroImageUrl}
            alt=""
            fill
            sizes={IMAGE_SIZES.institutionCard}
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
            fallback={<div className={`h-full w-full bg-gradient-to-br ${gradient}`} />}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent" />

          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <span className={`rounded-md px-2.5 py-1 text-xs font-bold tracking-wide shadow-sm ${tagClass}`}>
              {typeLabel}
            </span>
            {rating != null ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-xs font-semibold text-graphite shadow-sm backdrop-blur">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" strokeWidth={0} />
                {rating}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2.5 p-4 sm:p-5">
          <h3 className="line-clamp-2 font-display text-base font-semibold leading-snug text-graphite group-hover:text-primary-600">
            {venue.name}
          </h3>

          <div className="space-y-1 text-sm text-graphite-muted">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              <span className="truncate">{street || venue.city}</span>
            </div>
          </div>

          {blurb ? (
            <p className="line-clamp-2 text-xs leading-relaxed text-graphite-muted">{blurb}</p>
          ) : null}

          {showMiniAfisha ? (
            <ul className="mt-0.5 space-y-1 border-t border-slate-100 pt-2.5">
              {upcoming.map((title) => (
                <li key={title} className="line-clamp-1 text-xs text-slate-600">
                  <span className="mr-1.5 inline-block h-1 w-1 rounded-full bg-primary-500 align-middle" />
                  {title}
                </li>
              ))}
            </ul>
          ) : null}

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
