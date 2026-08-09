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

type InstitutionCardVenue = VenueCatalogCard;

function realRating(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 10) / 10;
}

export function InstitutionCard({
  venue,
  href,
  hideCity = false,
}: {
  venue: InstitutionCardVenue;
  href: string;
  /** When catalog is already city-scoped, omit city from the meta line. */
  hideCity?: boolean;
}) {
  const publicType = resolvePublicVenueType(venue.type, venue.name);
  const typeLabel = venueTypeLabel(publicType, venue.name);
  const gradient = TYPE_GRADIENT[publicType] || 'from-slate-700 via-slate-800 to-slate-950';
  const street = formatStreetAddress(venue.address, { city: venue.city });
  const blurb = dayRouteHookLine({ shortDescription: venue.shortDescription });
  const rating = realRating(venue.rating);
  const upcoming = venue.upcomingTitles?.filter(Boolean).slice(0, 3) || [];
  const showMiniAfisha = upcoming.length > 0;
  const stopCount = Number(venue.stopEventCount ?? 0);
  const ownEvents = Number(venue.events || 0);
  // Prefer STOP tours when they dominate (must-see museums with sparse own afisha).
  const stopOrEventsLabel =
    stopCount > 0 && stopCount >= ownEvents
      ? `${stopCount} в маршрутах`
      : ownEvents > 0
        ? pluralEvents(ownEvents)
        : null;
  const cityLabel = String(venue.city || '').trim();
  const metaLine = [typeLabel, hideCity ? null : cityLabel || null]
    .filter(Boolean)
    .join(' · ')
    .toUpperCase();
  const dayRouteVenue = {
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
  };

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-card bg-white shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="relative aspect-video shrink-0 overflow-hidden bg-surface-muted">
        <Link href={href} className="absolute inset-0 no-underline" aria-label={venue.name}>
          <SafeImage
            src={venue.heroImageUrl}
            alt=""
            fill
            sizes={IMAGE_SIZES.institutionCard}
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
            fallback={<div className={`h-full w-full bg-gradient-to-br ${gradient}`} />}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
        </Link>

        <div
          className="absolute right-2 top-2 z-[2]"
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
            iconOnly
            variant="overlay"
            className="!min-h-8 !w-8 !rounded-full !p-0 !text-slate-700"
            venue={dayRouteVenue}
          />
        </div>
      </div>

      <Link href={href} className="flex min-h-0 flex-1 flex-col no-underline">
        <div className="flex flex-1 flex-col gap-2.5 p-4 sm:p-5">
          {metaLine ? (
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-graphite-muted sm:text-[11px]">
              {metaLine}
            </p>
          ) : null}

          <h3 className="line-clamp-2 font-display text-base font-semibold leading-snug text-graphite group-hover:text-primary-600">
            {venue.name}
          </h3>

          <div className="flex min-w-0 items-center gap-1.5 text-sm text-graphite-muted">
            <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            <span className="truncate">{street || (hideCity ? null : venue.city) || 'Адрес уточняется'}</span>
            {rating != null ? (
              <span className="ml-auto inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-graphite-muted">
                <Star className="h-3 w-3" strokeWidth={1.75} />
                {rating}
              </span>
            ) : null}
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
              {venue.eventsPending ? (
                <div className="mt-0.5 h-4 w-20 animate-pulse rounded bg-slate-100" aria-hidden />
              ) : stopOrEventsLabel ? (
                <div className="text-sm font-semibold text-graphite">{stopOrEventsLabel}</div>
              ) : null}
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white transition group-hover:bg-primary-700">
              <Ticket className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              Афиша
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
