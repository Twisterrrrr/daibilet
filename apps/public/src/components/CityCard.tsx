import { Landmark, MapPin } from 'lucide-react';
import * as React from 'react';

import { RegionDestinationLink } from '@/components/RegionDestinationLink';
import { CITY_CARD_ASPECT_CLASS, cityCardTitleClass } from '@/lib/city-card-styles';
import { resolveCityImageObjectPosition } from '@/lib/city-image-focus';
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
  const imageFocus = resolveCityImageObjectPosition({ slug, name });

  return (
    <div className="flex flex-col">
      <a href={href} className="card group relative block overflow-hidden">
        <div className={`relative ${CITY_CARD_ASPECT_CLASS} overflow-hidden`}>
          {showImage ? (
            <img
              src={imageUrl || ''}
              alt=""
              loading="lazy"
              onError={() => setHasImageError(true)}
              style={{ objectPosition: imageFocus }}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary-700 to-primary-900" />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />
          <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
            <h3 className={`${cityCardTitleClass(large ? 'large' : 'compact')} line-clamp-2`}>{name}</h3>
            {description ? <p className="mt-1 line-clamp-2 text-sm text-white/70">{description}</p> : null}
            <div className="mt-1.5 flex flex-col gap-0.5 text-xs text-white/85 sm:text-sm">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {eventCount > 0 ? pluralEvents(eventCount) : 'Скоро появятся события'}
                </span>
              </span>
              {venueCount != null && venueCount > 0 ? (
                <span className="flex items-center gap-1.5">
                  <Landmark className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{pluralVenues(venueCount)}</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </a>

      {region && region.eventCount > 0 ? (
        <RegionDestinationLink
          region={{ slug: region.slug, name: region.name, events: region.eventCount }}
          className="mt-2"
        />
      ) : null}
    </div>
  );
}
