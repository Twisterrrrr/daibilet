import Link from 'next/link';
import { Clock, MapPin, Train } from 'lucide-react';

import { AddToDayRouteButton } from '@/components/AddToDayRouteButton.client';
import { formatStreetAddress } from '@/lib/address';
import { dayRouteHookLine } from '@/lib/day-route-from-place';
import { pluralEvents } from '@/lib/format';
import { venueTypeIcon, venueTypeLabel, normalizeVenueKind } from '@/lib/venue-meta';
import type { PublicVenueDto } from '@daibilet/contracts/public';
import { nonEmptyLogisticsText } from '@/components/VenueLogisticsBlock';
import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';

const TYPE_GRADIENT: Record<string, string> = {
  pier: 'from-sky-500 via-cyan-600 to-indigo-700',
  pier_water: 'from-sky-500 via-cyan-600 to-indigo-700',
  bus: 'from-amber-600 via-orange-600 to-rose-700',
  park: 'from-emerald-600 via-green-700 to-emerald-950',
  monument: 'from-stone-600 via-slate-700 to-stone-900',
  outdoor_location: 'from-emerald-600 via-green-700 to-emerald-950',
  attraction: 'from-violet-600 via-purple-700 to-indigo-800',
  sport_activity_space: 'from-orange-600 via-red-600 to-rose-800',
  venue: 'from-indigo-600 via-primary-600 to-indigo-800',
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
      return 'Точка сбора для автобусных туров и трансферов';
    case 'pier':
    case 'pier_water':
      return 'Причал - место посадки на водные прогулки';
    case 'park':
      return 'Парк и открытое пространство для прогулок';
    case 'monument':
    case 'attraction':
      return 'Точка на маршруте и ориентир в городе';
    case 'outdoor_location':
      return 'Открытая локация для прогулок и событий';
    case 'sport_activity_space':
      return 'Площадка для активного отдыха и событий';
    default:
      return `${typeLabel} на карте города`;
  }
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
  const gradient = TYPE_GRADIENT[venue.type] || 'from-sky-500 via-primary-600 to-indigo-600';
  const street = formatStreetAddress(venue.address, { city: venue.city });
  const cityLabel = String(venue.city || '').trim() || null;
  const metro = nonEmptyLogisticsText(venue.metroStation);
  const stopCount = Number(venue.stopEventCount ?? 0);
  const activityCount = stopCount > 0 ? stopCount : Number(venue.events || 0);
  const editorialHook = dayRouteHookLine({
    hookFact: venue.hookFact,
    shortDescription: venue.shortDescription,
  });
  const blurb = editorialHook || technicalLocationBlurb(kind, typeLabel);
  const displayName = stripBoardingPlacePrefix(venue.name);
  const routeTitle = stripBoardingPlacePrefix(venue.title || venue.name);
  const showStreet = Boolean(street) && !sameAddressLabel(street, displayName);
  const eventsChip =
    activityCount > 0 ? (
      <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
        {pluralEvents(activityCount)}
      </span>
    ) : null;

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
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
      <Link href={href} className="flex min-h-[8.5rem] min-w-0 items-stretch no-underline sm:min-h-[9.5rem]">
        {/* Fixed width, full card height; overflow on parent clips bottom-left radius. */}
        <div
          className={`relative w-32 shrink-0 self-stretch overflow-hidden text-white sm:w-36 ${
            showPhoto
              ? 'bg-slate-900'
              : `flex flex-col items-center justify-center bg-gradient-to-br p-2.5 ${gradient}`
          }`}
        >
          {showPhoto ? (
            <SafeImage
              src={heroUrl}
              alt=""
              fill
              sizes={IMAGE_SIZES.searchThumb}
              className="object-cover object-center opacity-90 transition group-hover:scale-105"
            />
          ) : (
            <>
              <TypeIcon className="h-8 w-8 sm:h-9 sm:w-9" strokeWidth={1.75} />
              <div className="mt-1.5 line-clamp-2 px-1 text-center text-[9px] font-semibold uppercase tracking-wider opacity-90 sm:text-[10px]">
                {typeLabel}
              </div>
            </>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col p-3.5 sm:p-4">
          {/* Type badge left + «В маршрут» top-right (owner: not under the card body). */}
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                {typeLabel}
              </span>
              {eventsChip}
            </div>
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
                className="!min-h-8 !gap-1 !rounded-full !px-2.5 !py-1 !text-[11px] shadow-sm sm:!min-h-9 sm:!px-3 sm:!py-1.5"
                venue={dayRouteVenue}
              />
            </div>
          </div>
          <h3 className="mt-1 line-clamp-2 text-base font-semibold text-slate-900 group-hover:text-primary-600">
            {displayName}
          </h3>

          {blurb ? <p className="mt-1.5 line-clamp-2 text-sm text-slate-600">{blurb}</p> : null}

          {showStreet ? (
            <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{street}</span>
            </div>
          ) : null}
          {metro ? (
            <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
              <Train className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{metro}</span>
            </div>
          ) : null}

          {nextSlot ? (
            <div className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <Clock className="h-3 w-3" />
              Ближайший старт: {nextSlot}
            </div>
          ) : null}

          {cityLabel ? <div className="mt-auto pt-2 text-xs text-graphite-muted">{cityLabel}</div> : null}
        </div>
      </Link>
    </div>
  );
}
