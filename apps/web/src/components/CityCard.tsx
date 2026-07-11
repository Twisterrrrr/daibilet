'use client';

import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { useState } from 'react';

import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { cityHref } from '@/lib/routes';
import { resolveCityCardImage } from '@/lib/city-images';
import { pluralEvents } from '@/lib/format';

export function CityCard({ city }: { city: PublicDestinationDto }) {
  const imageUrl = resolveCityCardImage(city);
  const href = cityHref(city);
  const [hasImageError, setHasImageError] = useState(false);
  const showImage = Boolean(imageUrl && !hasImageError);

  return (
    <Link href={href} className="group relative block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
      <div className="relative aspect-[5/3] overflow-hidden">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl || ''}
            alt=""
            loading="lazy"
            onError={() => setHasImageError(true)}
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary-700 to-primary-900" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-white sm:text-base">{city.name}</h3>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-white/85 sm:text-sm">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{city.events > 0 ? pluralEvents(city.events) : 'Скоро появятся события'}</span>
          </p>
        </div>
      </div>
    </Link>
  );
}
