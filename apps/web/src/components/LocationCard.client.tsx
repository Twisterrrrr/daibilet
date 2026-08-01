import Link from 'next/link';
import { Clock, MapPin, Train } from 'lucide-react';

import { AddToDayRouteButton } from '@/components/AddToDayRouteButton.client';
import { formatStreetAddress } from '@/lib/address';
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

const CONTENT_KINDS = new Set(['park', 'monument', 'outdoor_location', 'attraction']);

function contentActivityLabel(count: number): string {
  if (count <= 0) return 'Скоро появятся экскурсии';
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} экскурсия проходит здесь`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} экскурсии проходят здесь`;
  return `${count} экскурсий проходят здесь`;
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
  const isContentPlace = CONTENT_KINDS.has(kind);
  const TypeIcon = venueTypeIcon(venue.type);
  const typeLabel = venueTypeLabel(venue.type);
  const gradient = TYPE_GRADIENT[venue.type] || 'from-sky-500 via-primary-600 to-indigo-600';
  const street = formatStreetAddress(venue.address, { city: venue.city }) || venue.city;
  const metro = nonEmptyLogisticsText(venue.metroStation);
  const stopCount = Number(venue.stopEventCount ?? 0);
  const activityCount = stopCount > 0 ? stopCount : Number(venue.events || 0);
  const hook = String(venue.hookFact || venue.shortDescription || '').trim();

  return (
    <div className="group relative flex items-stretch overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
      <Link href={href} className="flex min-w-0 flex-1 items-stretch no-underline">
        <div
          className={`relative flex w-24 shrink-0 flex-col items-center justify-center overflow-hidden p-3 text-white sm:w-28 ${
            isContentPlace && venue.heroImageUrl ? 'bg-slate-900' : `bg-gradient-to-br ${gradient}`
          }`}
        >
          {isContentPlace && venue.heroImageUrl ? (
            <SafeImage
              src={venue.heroImageUrl}
              alt=""
              fill
              sizes={IMAGE_SIZES.searchThumb}
              className="object-cover opacity-90 transition group-hover:scale-105"
            />
          ) : (
            <>
              <TypeIcon className="h-8 w-8" />
              <div className="mt-2 text-center text-[10px] font-semibold uppercase tracking-wider opacity-90">
                {typeLabel}
              </div>
            </>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col p-4 pr-28 sm:pr-32">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-base font-semibold text-slate-900 group-hover:text-primary-600">
              {venue.name}
            </h3>
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
              {isContentPlace
                ? activityCount > 0
                  ? contentActivityLabel(activityCount).split(' ').slice(0, 2).join(' ')
                  : 'Скоро'
                : venue.events > 0
                  ? pluralEvents(venue.events)
                  : 'Скоро'}
            </span>
          </div>

          {isContentPlace && hook ? (
            <p className="mt-2 line-clamp-2 text-sm text-slate-600">{hook}</p>
          ) : null}

          {isContentPlace ? (
            <p className="mt-2 text-xs font-semibold text-emerald-700">{contentActivityLabel(activityCount)}</p>
          ) : (
            <>
              <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{street}</span>
              </div>
              {metro ? (
                <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                  <Train className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{metro}</span>
                </div>
              ) : null}
            </>
          )}

          {!isContentPlace && nextSlot ? (
            <div className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <Clock className="h-3 w-3" />
              Ближайший старт: {nextSlot}
            </div>
          ) : null}

          {isContentPlace ? (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{street}</span>
            </div>
          ) : null}
        </div>
      </Link>

      <div
        className="absolute right-1.5 top-1.5 z-20"
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
          className="!min-h-9 !rounded-full !px-2.5 !py-1.5 !text-[11px] shadow-sm"
          venue={{
            id: venue.id,
            slug: venue.slug,
            title: venue.title || venue.name,
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
