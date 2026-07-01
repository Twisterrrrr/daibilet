import { ArrowRight, Landmark, MapPin } from 'lucide-react';
import * as React from 'react';

import { CITY_CARD_ASPECT_CLASS, cityCardTitleClass } from '@/lib/city-card-styles';
import type { CityCardRegion } from '@/lib/cityRegionHub';

function pluralEvents(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${n} событий`;
  if (mod10 === 1) return `${n} событие`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} события`;
  return `${n} событий`;
}

function pluralVenues(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${n} площадок`;
  if (mod10 === 1) return `${n} площадка`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} площадки`;
  return `${n} площадок`;
}

export function CityCard({
  slug,
  name,
  eventCount,
  venueCount,
  description,
  large = false,
  href,
  region,
  imageUrl,
}: {
  slug: string;
  name: string;
  eventCount: number;
  venueCount?: number;
  description: string;
  large?: boolean;
  href: string;
  region?: CityCardRegion | null;
  imageUrl?: string | null;
}) {
  const [hasImageError, setHasImageError] = React.useState(false);
  const showImage = Boolean(imageUrl && !hasImageError);

  return (
    <div className="flex flex-col">
      <a href={href} className="card group relative block overflow-hidden">
        <div className={`relative flex ${CITY_CARD_ASPECT_CLASS} flex-col justify-end overflow-hidden`}>
          {showImage ? (
            <img
              src={imageUrl || ''}
              alt=""
              loading="lazy"
              onError={() => setHasImageError(true)}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary-700 to-primary-900" />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="relative p-4 sm:p-5">
            <h3 className={cityCardTitleClass(large ? 'large' : 'compact')}>{name}</h3>
            {description ? <p className="mt-1 line-clamp-2 text-sm text-white/70">{description}</p> : null}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/80">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {eventCount > 0 ? pluralEvents(eventCount) : 'Скоро появятся события'}
            </span>
            {venueCount != null && venueCount > 0 ? (
              <span className="flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5" />
                {pluralVenues(venueCount)}
              </span>
            ) : null}
            </div>
          </div>
        </div>
      </a>

      {region && region.eventCount > 0 ? (
        <a
          href={`/cities/${region.slug}`}
          className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all hover:border-primary-300 hover:shadow-md"
        >
          <span className="truncate font-medium text-slate-700">+ {region.name}</span>
          <span className="shrink-0 text-slate-400">{pluralEvents(region.eventCount)}</span>
          <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-400" />
        </a>
      ) : null}
    </div>
  );
}
