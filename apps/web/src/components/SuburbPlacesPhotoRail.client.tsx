'use client';

import Link from 'next/link';

import { IMAGE_SIZES, CardSafeImage } from '@/components/SafeImage.client';
import { ScrollRail } from '@/components/ScrollRail.client';
import { resolveVenueHeroImage } from '@/lib/city-place-images';
import { formatVisitDuration } from '@/lib/visit-duration';

export type SuburbPlaceRailItem = {
  name: string;
  desc?: string;
  href?: string | null;
  /** venueSlug / locationSlug for editorial cover */
  imageSlug?: string | null;
  /** Direct cover when slug is missing (suburb hero fallback). */
  imageUrl?: string | null;
  visitMinutes?: number | string;
  transitTip?: string;
  dayLabel?: string;
};

function formatTransitTip(raw: string): string {
  const tip = raw.trim();
  if (!tip) return '';
  if (/^[↓▾▼]/.test(tip)) return tip;
  return `↓ ${tip}`;
}

function resolveRailCover(
  place: SuburbPlaceRailItem,
  fallbackImageUrl?: string | null,
): string | null {
  const fromSlug = resolveVenueHeroImage(place.imageSlug);
  if (fromSlug) return fromSlug;
  const direct = String(place.imageUrl || '').trim();
  if (direct) return direct;
  const fallback = String(fallbackImageUrl || '').trim();
  return fallback || null;
}

/**
 * Photo cards for suburb nested places - same language as city hub «Главные места».
 * Used by DestinationRegionGuide (region child) and DayTripCanonCard (hub / my-day).
 * Most nested POIs still lack locationSlug - fall back to suburb hero so the rail
 * is not a row of gray boxes.
 */
export function SuburbPlacesPhotoRail({
  places,
  fallbackImageUrl = null,
  ariaLabel = 'Что посмотреть',
  className = '',
}: {
  places: SuburbPlaceRailItem[];
  /** Suburb / destination cover when a POI has no own editorial image. */
  fallbackImageUrl?: string | null;
  ariaLabel?: string;
  className?: string;
}) {
  if (!places.length) return null;

  return (
    <ScrollRail
      className={className}
      hideScrollbar
      viewportClassName="flex flex-nowrap gap-2.5 snap-x snap-mandatory pb-0.5"
      aria-label={ariaLabel}
    >
      {places.map((place, index) => {
        const coverSrc = resolveRailCover(place, fallbackImageUrl);
        const visitLabel = formatVisitDuration(place.visitMinutes);
        const tip = formatTransitTip(String(place.transitTip || ''));
        const dayLabel = String(place.dayLabel || '').trim();
        const title = (
          <span className="text-base font-bold leading-snug text-slate-950 break-words">
            {place.name}
          </span>
        );

        return (
          <div
            key={`${place.name}:${index}`}
            data-rail-item
            className="flex w-[min(80%,18.5rem)] shrink-0 snap-start flex-col sm:w-[20rem]"
          >
            {dayLabel ? (
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {dayLabel}
              </p>
            ) : null}
            {tip ? (
              <p className="mb-1.5 text-[11px] leading-snug text-slate-500 sm:text-xs">{tip}</p>
            ) : null}
            <article
              data-day-trip-place
              className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_28px_-10px_hsl(221_83%_53%_/_0.28)]"
            >
              <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-slate-100">
                <CardSafeImage
                  src={coverSrc}
                  alt=""
                  fill
                  sizes={IMAGE_SIZES.placeCard}
                  className="object-cover"
                  fallback={
                    <div className="h-full w-full bg-gradient-to-br from-slate-300 to-slate-600" />
                  }
                />
                <span className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-xs font-semibold text-slate-700 shadow-sm">
                  {index + 1}
                </span>
              </div>
              <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-5">
                {place.href ? (
                  <Link href={place.href} className="hover:text-primary-700">
                    {title}
                  </Link>
                ) : (
                  title
                )}
                {place.desc ? (
                  <p className="mt-1.5 line-clamp-3 text-sm leading-6 text-slate-600">{place.desc}</p>
                ) : null}
                {visitLabel ? (
                  <p className="mt-3 text-xs font-medium text-slate-500">{visitLabel}</p>
                ) : null}
              </div>
            </article>
          </div>
        );
      })}
    </ScrollRail>
  );
}
