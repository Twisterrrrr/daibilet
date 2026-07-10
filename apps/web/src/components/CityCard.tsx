import Link from 'next/link';
import { MapPin } from 'lucide-react';

import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { cityHref } from '@/lib/routes';
import { resolveCityCardImage } from '@/lib/city-images';
import { pluralEvents } from '@/lib/format';

export function CityCard({ city }: { city: PublicDestinationDto }) {
  const imageUrl = resolveCityCardImage(city);
  const href = cityHref(city);

  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-slate-100 text-4xl">
            🏙️
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <h3 className="text-lg font-bold">{city.name}</h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-white/85">
            <MapPin className="h-3.5 w-3.5" />
            {pluralEvents(city.events)}
          </p>
        </div>
      </div>
    </Link>
  );
}
