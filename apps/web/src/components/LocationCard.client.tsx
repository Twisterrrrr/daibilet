'use client';

import Link from 'next/link';
import { MapPin, Star } from 'lucide-react';

import { AddToDayRouteButton } from '@/components/AddToDayRouteButton.client';
import { PlaceFavoriteButton } from '@/components/PlaceFavoriteButton.client';
import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { formatStreetAddress } from '@/lib/address';
import { dayRouteHookLine } from '@/lib/day-route-from-place';
import { pluralEvents } from '@/lib/format';
import type { VenueCatalogCard } from '@/lib/venue-map-types';
import { resolvePublicVenueType, venueTypeLabel, normalizeVenueKind } from '@/lib/venue-meta';
import { isRegionLikeCityTitle, resolveVenuePlaceCity } from '@/lib/venue-place-city';

const TYPE_GRADIENT: Record<string, string> = {
  pier: 'from-sky-500 via-cyan-600 to-sky-800',
  pier_water: 'from-sky-500 via-cyan-600 to-sky-800',
  bus: 'from-amber-600 via-orange-600 to-rose-700',
  park: 'from-emerald-600 via-green-700 to-emerald-950',
  monument: 'from-stone-600 via-slate-700 to-stone-900',
  outdoor_location: 'from-emerald-600 via-green-700 to-emerald-950',
  attraction: 'from-slate-600 via-slate-700 to-slate-900',
  sport_activity_space: 'from-orange-600 via-red-600 to-rose-800',
  gastro: 'from-amber-700 via-orange-800 to-slate-950',
  venue: 'from-primary-600 via-primary-700 to-slate-900',
};

/**
 * Strip legacy decorative prefixes from boarding/pier titles.
 * «Место посадки — …» (bus) and «Причал — …» (pier address rename).
 * Keeps descriptive «Причал на …» titles intact.
 */
function stripBoardingPlacePrefix(name: string): string {
  const trimmed = String(name || '').trim();
  const stripped = trimmed
    .replace(/^Место посадки\s*[—–-]\s*/u, '')
    .replace(/^Причал\s*[—–-]\s*/u, '')
    .trim();
  return stripped || trimmed;
}

function sameAddressLabel(a: string, b: string): boolean {
  const norm = (value: string) =>
    value
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[—–]/g, '-')
      .trim();
  return Boolean(a && b && norm(a) === norm(b));
}

function realRating(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 10) / 10;
}

/** Minimal technical line when editorial hook/shortDescription is empty. */
function technicalLocationBlurb(kind: string, typeLabel: string): string {
  switch (kind) {
    case 'bus':
      return 'Точка сбора для автобусных туров и трансферов.';
    case 'pier':
    case 'pier_water':
      return 'Причал - место посадки на водные прогулки.';
    case 'park':
      return 'Парк и открытое пространство для прогулок.';
    case 'monument':
    case 'attraction':
      return 'Точка на маршруте и ориентир в городе.';
    case 'outdoor_location':
      return 'Открытая локация для прогулок и событий.';
    case 'sport_activity_space':
      return 'Площадка для активного отдыха и событий.';
    default:
      return `${typeLabel} на карте города.`;
  }
}

export function LocationCard({
  venue,
  href,
  hideCity = false,
  showFamilyTag = false,
}: {
  venue: VenueCatalogCard;
  href: string;
  /** When catalog is already city-scoped, omit city from the meta line. */
  hideCity?: boolean;
  /** Mixed /places grid: show «Локация» on the photo. */
  showFamilyTag?: boolean;
}) {
  const kind = normalizeVenueKind(venue.type);
  const publicType = resolvePublicVenueType(venue.type, venue.name);
  const typeLabel = venueTypeLabel(publicType, venue.name);
  const gradient = TYPE_GRADIENT[kind] || TYPE_GRADIENT[venue.type] || 'from-slate-700 via-slate-800 to-slate-950';
  const street = formatStreetAddress(venue.address, { city: venue.city });
  const displayName = stripBoardingPlacePrefix(venue.name);
  const routeTitle = displayName;
  const editorialHook = dayRouteHookLine({
    hookFact: venue.hookFact,
    shortDescription: venue.shortDescription,
  });
  const blurb = editorialHook || technicalLocationBlurb(kind, typeLabel);
  const rating = realRating(venue.rating);
  const upcoming = venue.upcomingTitles?.filter(Boolean).slice(0, 3) || [];
  const showMiniAfisha = upcoming.length > 0;
  const ownEvents = Number(venue.events || 0);
  const eventsLabel = ownEvents > 0 ? pluralEvents(ownEvents) : null;
  const placeCity = resolveVenuePlaceCity(venue.city, venue.citySlug);
  const showPlaceCity = Boolean(placeCity) && (isRegionLikeCityTitle(venue.city) || !hideCity);
  const metaLine = [typeLabel, showPlaceCity ? placeCity : null]
    .filter(Boolean)
    .join(' · ')
    .toUpperCase();
  const showStreet = Boolean(street) && !sameAddressLabel(street, displayName);
  const addressLine = showStreet ? street : showPlaceCity ? placeCity : null;

  const dayRouteVenue = {
    id: venue.id,
    slug: venue.slug,
    title: routeTitle,
    city: placeCity || venue.city,
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
        <Link href={href} className="absolute inset-0 no-underline" aria-label={displayName}>
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

        {showFamilyTag ? (
          <span className="pointer-events-none absolute left-2.5 top-2.5 z-[1] rounded-md border border-white/20 bg-black/35 px-2 py-0.5 text-[11px] font-medium tracking-wide text-white/95 backdrop-blur-md">
            Локация
          </span>
        ) : null}

        <PlaceFavoriteButton
          className="right-2 top-2 sm:right-3 sm:top-3"
          place={{
            id: venue.id,
            slug: venue.slug,
            name: displayName,
            href,
            imageUrl: venue.heroImageUrl,
            city: venue.city,
          }}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <Link href={href} className="flex min-h-0 flex-1 flex-col no-underline">
          <div className="flex flex-1 flex-col gap-2.5 p-4 pb-2 sm:p-5 sm:pb-2">
            {metaLine ? (
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-graphite-muted sm:text-[11px]">
                {metaLine}
              </p>
            ) : null}

            <h3 className="line-clamp-2 font-display text-base font-semibold leading-snug text-graphite group-hover:text-primary-600">
              {displayName}
            </h3>

            <div className="flex min-w-0 items-center gap-1.5 text-sm text-graphite-muted">
              <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              <span className="truncate">{addressLine || 'Адрес уточняется'}</span>
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
          </div>
        </Link>

        <div className="mt-auto flex items-end justify-between gap-3 px-4 pb-4 pt-1 sm:px-5 sm:pb-5">
          <div>
            {venue.eventsPending ? (
              <div className="mt-0.5 h-4 w-20 animate-pulse rounded bg-slate-100" aria-hidden />
            ) : eventsLabel ? (
              <div className="text-sm font-semibold text-graphite">{eventsLabel}</div>
            ) : null}
          </div>
          <AddToDayRouteButton
            key={venue.id}
            compact
            className="!min-h-8 !rounded-lg !px-3 !py-1.5"
            venue={dayRouteVenue}
          />
        </div>
      </div>
    </div>
  );
}
