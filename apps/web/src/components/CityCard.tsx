'use client';

import Link from 'next/link';
import { Landmark, MapPin } from 'lucide-react';

import { RegionDestinationLink } from '@/components/RegionDestinationLink';
import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { CITY_CARD_ASPECT_CLASS, cityCardTitleClass } from '@/lib/city-card-styles';
import { resolveCityImageObjectPosition } from '@/lib/city-image-focus';
import { resolveCityCardImage } from '@/lib/city-images';
import type { CityCardRegion } from '@/lib/cityRegionHub';
import { landingCategoryHref } from '@/lib/landing-routes';
import { cityHref } from '@/lib/routes';
import { pluralEvents, pluralVenues } from '@/lib/format';

type CityCardProps = {
  city: PublicDestinationDto;
  large?: boolean;
  description?: string;
  region?: CityCardRegion | null;
};

function CityHubTags({ city }: { city: PublicDestinationDto }) {
  const tags = (city.hubTags || []).slice(0, 3);
  if (!tags.length) return null;
  const citySlug = city.slug || city.sourceSlug || undefined;

  return (
    <ul
      className="mt-2 flex min-w-0 flex-nowrap gap-1"
      aria-label={`Популярные направления: ${city.name}`}
    >
      {tags.map((tag) => {
        const href =
          tag.kind === 'landing' && tag.slug
            ? landingCategoryHref(tag.slug, citySlug)
            : tag.kind === 'category' && tag.label
              ? `/events?city=${encodeURIComponent(city.name)}&category=${encodeURIComponent(tag.label)}`
              : cityHref(city);
        return (
          <li key={`${tag.kind}:${tag.slug || tag.label}`} className="min-w-0 shrink">
            <Link
              href={href}
              className="inline-flex max-w-full whitespace-nowrap truncate rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold leading-4 text-slate-700 shadow-sm transition hover:border-primary/40 hover:text-primary-700"
            >
              {tag.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function CityCard({ city, large = false, description, region }: CityCardProps) {
  const slug = city.slug || city.name;
  const imageUrl = resolveCityCardImage(city);
  const href = cityHref(city);
  const imageFocus = resolveCityImageObjectPosition({ slug, sourceSlug: city.sourceSlug, name: city.name });
  const brief = description || '';

  return (
    <div className="flex flex-col">
      <Link href={href} className="card group relative block overflow-hidden">
        <div className={`relative ${CITY_CARD_ASPECT_CLASS} overflow-hidden`}>
          <SafeImage
            src={imageUrl}
            alt=""
            fill
            sizes={IMAGE_SIZES.cityCard}
            style={{ objectPosition: imageFocus }}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            fallback={<div className="absolute inset-0 bg-gradient-to-br from-primary-700 to-primary-900" />}
          />
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

      <CityHubTags city={city} />

      {region && region.eventCount > 0 ? (
        <RegionDestinationLink
          region={{ slug: region.slug, name: region.name, events: region.eventCount }}
          className="mt-2"
        />
      ) : null}
    </div>
  );
}
