'use client';

import Link from 'next/link';
import { Landmark, MapPin } from 'lucide-react';
import { useState } from 'react';

import { RegionDestinationLink } from '@/components/RegionDestinationLink';
import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { CITY_CARD_ASPECT_CLASS, cityCardTitleClass } from '@/lib/city-card-styles';
import { resolveCityImageObjectPosition } from '@/lib/city-image-focus';
import { resolveCityCardImage } from '@/lib/city-images';
import type { CityCardRegion } from '@/lib/cityRegionHub';
import { cityHref } from '@/lib/routes';
import { pluralEvents, pluralVenues } from '@/lib/format';

type CityCardProps = {
  city: PublicDestinationDto;
  large?: boolean;
  description?: string;
  region?: CityCardRegion | null;
};

export function CityCard({ city, large = false, description, region }: CityCardProps) {
  const slug = city.slug || city.name;
  const imageUrl = resolveCityCardImage(city);
  const href = cityHref(city);
  const [hasImageError, setHasImageError] = useState(false);
  const showImage = Boolean(imageUrl && !hasImageError);
  const imageFocus = resolveCityImageObjectPosition({ slug, sourceSlug: city.sourceSlug, name: city.name });
  const brief = description || '';

  return (
    <div className="flex flex-col">
      <Link href={href} className="card group relative block overflow-hidden">
        <div className={`relative ${CITY_CARD_ASPECT_CLASS} overflow-hidden`}>
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
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
            <h3 className={`${cityCardTitleClass(large ? 'large' : 'compact')} line-clamp-2`}>{city.name}</h3>
            {brief ? <p className="mt-1 line-clamp-2 text-sm text-white/70">{brief}</p> : null}
            <div className="mt-1.5 flex flex-col gap-0.5 text-xs text-white/85 sm:text-sm">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {city.events > 0 ? pluralEvents(city.events) : 'Скоро появятся события'}
                </span>
              </span>
              {city.venues != null && city.venues > 0 ? (
                <span className="flex items-center gap-1.5">
                  <Landmark className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{pluralVenues(city.venues)}</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </Link>

      {region && region.eventCount > 0 ? (
        <RegionDestinationLink
          region={{ slug: region.slug, name: region.name, events: region.eventCount }}
          className="mt-2"
        />
      ) : null}
    </div>
  );
}
