import Link from 'next/link';
import { ArrowRight, Clock, MapPin, Train } from 'lucide-react';

import { AddToDayRouteButton } from '@/components/AddToDayRouteButton.client';
import { formatStreetAddress } from '@/lib/address';
import { dayRouteHookLine } from '@/lib/day-route-from-place';
import { pluralEvents } from '@/lib/format';
import { venueTypeIcon, venueTypeLabel, normalizeVenueKind } from '@/lib/venue-meta';
import type { PublicVenueDto } from '@daibilet/contracts/public';
import { nonEmptyLogisticsText } from '@/components/VenueLogisticsBlock';
import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';

const TYPE_GRADIENT: Record<string, string> = {
  pier: 'from-sky-500 via-cyan-600 to-sky-800',
  pier_water: 'from-sky-500 via-cyan-600 to-sky-800',
  bus: 'from-amber-600 via-orange-600 to-rose-700',
  park: 'from-emerald-600 via-green-700 to-emerald-950',
  monument: 'from-stone-600 via-slate-700 to-stone-900',
  outdoor_location: 'from-emerald-600 via-green-700 to-emerald-950',
  attraction: 'from-slate-600 via-slate-700 to-slate-900',
  sport_activity_space: 'from-orange-600 via-red-600 to-rose-800',
  venue: 'from-primary-600 via-primary-700 to-slate-900',
};

/** Strip legacy «Место посадки - / — » prefix from bus boarding titles. */
function stripBoardingPlacePrefix(name: string): string {
  const trimmed = String(name || '').trim();
  const stripped = trimmed.replace(/^Место посадки\s*[—–-]\s*/u, '').trim();
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

/** Prefer full sentences; never cut mid-word with a bare ellipsis. */
function cardBlurbText(raw: string, maxChars = 140): string {
  const text = String(raw || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  if (text.length <= maxChars) return text;

  const window = text.slice(0, maxChars + 1);
  const sentenceEnd = Math.max(window.lastIndexOf('. '), window.lastIndexOf('! '), window.lastIndexOf('? '));
  if (sentenceEnd >= Math.floor(maxChars * 0.45)) {
    return text.slice(0, sentenceEnd + 1).trim();
  }
  const space = window.lastIndexOf(' ');
  const cut = space > 40 ? space : maxChars;
  const clipped = text.slice(0, cut).trim().replace(/[.,;:]+$/u, '');
  return `${clipped}.`;
}

export function LocationCard({
  venue,
  href,
  nextSlot,
}: {
  venue: Pick<
    PublicVenueDto,
    | 'id'
    | 'slug'
    | 'name'
    | 'title'
    | 'city'
    | 'citySlug'
    | 'events'
    | 'type'
    | 'address'
    | 'metroStation'
    | 'heroImageUrl'
    | 'hookFact'
    | 'shortDescription'
    | 'stopEventCount'
    | 'latitude'
    | 'longitude'
  > & {
    cityId?: string | null;
  };
  href: string;
  nextSlot?: string | null;
}) {
  const kind = normalizeVenueKind(venue.type);
  const heroUrl = String(venue.heroImageUrl || '').trim();
  const showPhoto = Boolean(heroUrl);
  const TypeIcon = venueTypeIcon(venue.type);
  const typeLabel = venueTypeLabel(venue.type);
  const gradient = TYPE_GRADIENT[venue.type] || 'from-sky-500 via-primary-600 to-slate-800';
  const street = formatStreetAddress(venue.address, { city: venue.city });
  const cityLabel = String(venue.city || '').trim() || null;
  const metro = nonEmptyLogisticsText(venue.metroStation);
  const stopCount = Number(venue.stopEventCount ?? 0);
  const activityCount = stopCount > 0 ? stopCount : Number(venue.events || 0);
  const editorialHook = dayRouteHookLine({
    hookFact: venue.hookFact,
    shortDescription: venue.shortDescription,
  });
  const blurb = cardBlurbText(editorialHook || technicalLocationBlurb(kind, typeLabel));
  const displayName = stripBoardingPlacePrefix(venue.name);
  const routeTitle = stripBoardingPlacePrefix(venue.title || venue.name);
  const showStreet = Boolean(street) && !sameAddressLabel(street, displayName);
  const placeLine = [showStreet ? street : null, cityLabel].filter(Boolean).join(' · ');

  const dayRouteVenue = {
    id: venue.id,
    slug: venue.slug,
    title: routeTitle,
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
    <article className="group relative flex min-h-[10.5rem] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md sm:min-h-[11rem]">
      <Link
        href={href}
        className={`relative w-36 shrink-0 self-stretch overflow-hidden text-white no-underline sm:w-44 ${
          showPhoto ? 'bg-slate-900' : `flex flex-col items-center justify-center bg-gradient-to-br p-3 ${gradient}`
        }`}
        aria-label={displayName}
      >
        {showPhoto ? (
          <SafeImage
            src={heroUrl}
            alt=""
            fill
            sizes={IMAGE_SIZES.searchThumb}
            className="object-cover object-center transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <TypeIcon className="h-9 w-9 opacity-95" strokeWidth={1.75} />
        )}
        <span className="absolute left-2.5 top-2.5 rounded-md bg-black/55 px-2 py-1 text-[11px] font-medium tracking-wide text-white backdrop-blur-sm">
          {typeLabel}
        </span>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 p-4 sm:p-5">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 flex-1 text-lg font-bold leading-snug tracking-tight text-slate-900">
              <Link href={href} className="no-underline transition-colors hover:text-primary-700">
                {displayName}
              </Link>
            </h3>
            <div
              className="shrink-0"
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
                className="!min-h-0 !gap-1.5 !rounded-lg !bg-primary-50 !px-2.5 !py-1.5 !text-xs !font-semibold !text-primary-700 !shadow-none hover:!bg-primary-100"
                venue={dayRouteVenue}
              />
            </div>
          </div>

          {blurb ? <p className="mt-2 text-sm leading-relaxed text-slate-600">{blurb}</p> : null}

          {metro ? (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <Train className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate">{metro}</span>
            </div>
          ) : null}

          {nextSlot ? (
            <div className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <Clock className="h-3 w-3" />
              Ближайший старт: {nextSlot}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          {placeLine ? (
            <div className="flex min-w-0 items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate">{placeLine}</span>
            </div>
          ) : (
            <span />
          )}
          {activityCount > 0 ? (
            <Link
              href={href}
              className="inline-flex shrink-0 items-center gap-0.5 font-medium text-primary-700 no-underline hover:text-primary-800 hover:underline"
            >
              {pluralEvents(activityCount)}
              <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
