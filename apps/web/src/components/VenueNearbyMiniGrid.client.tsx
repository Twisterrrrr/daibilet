'use client';

import { SafeImage } from '@/components/SafeImage.client';
import { resolveVenueHeroImage } from '@/lib/city-place-images';
import { venueCardImageUrl } from '@/lib/venue-card-image';
import { venueHref } from '@/lib/routes';
import type { PublicVenueDto } from '@daibilet/contracts/public';

/**
 * Sidebar «Рядом»: compact image tiles, 2 columns when width allows.
 */
export function VenueNearbyMiniGrid({
  venues,
  limit = 4,
}: {
  venues: PublicVenueDto[];
  limit?: number;
}) {
  const items = venues.slice(0, limit);
  if (!items.length) return null;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" data-venue-similar-mini>
      <div className="text-sm font-semibold text-zinc-950">Рядом</div>
      <ul className="mt-3 grid grid-cols-2 gap-2.5">
        {items.map((related) => {
          const name = related.name || related.title || 'Площадка';
          const cover =
            venueCardImageUrl(resolveVenueHeroImage(related.slug, related.heroImageUrl) || related.heroImageUrl) ||
            null;
          return (
            <li key={related.id}>
              <a href={venueHref(related)} className="group block">
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-zinc-100">
                  {cover ? (
                    <SafeImage
                      src={cover}
                      alt=""
                      fill
                      sizes="(max-width: 1023px) 42vw, 140px"
                      className="object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-zinc-200 to-zinc-300" aria-hidden />
                  )}
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs font-semibold leading-snug text-zinc-900 group-hover:text-primary-700">
                  {name}
                </p>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
