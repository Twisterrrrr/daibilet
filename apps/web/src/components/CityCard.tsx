'use client';

import Link from 'next/link';
import { Landmark, MapPin } from 'lucide-react';

import { CountUp } from '@/components/CountUp.client';
import { RegionDestinationLink } from '@/components/RegionDestinationLink';
import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { CITY_CARD_ASPECT_CLASS, cityCardTitleClass } from '@/lib/city-card-styles';
import { resolveCityImageObjectPosition } from '@/lib/city-image-focus';
import { resolveCityCardImage } from '@/lib/city-images';
import type { CityCardRegion } from '@/lib/cityRegionHub';
import { resolveCityVibeTags } from '@/lib/city-vibe-tags';
import { landingCategoryHref } from '@/lib/landing-routes';
import { cityHref } from '@/lib/routes';
import { pluralEvents, pluralVenues } from '@/lib/format';

type CityCardProps = {
  city: PublicDestinationDto;
  large?: boolean;
  /** Long briefs stay on city hub; listing uses line-clamp-1 or omits. */
  description?: string;
  region?: CityCardRegion | null;
  /** `top` - daytime landmark previews (`/images/cities/top/*.jpg`) for home + `/cities` hero tiles. */
  imageVariant?: 'default' | 'top';
  /** Compact listing: bigger title, vibe tags, no text-heavy body. */
  compact?: boolean;
};

function CityHubTags({ city }: { city: PublicDestinationDto }) {
  const tags = (city.hubTags || []).slice(0, 3);
  if (!tags.length) return null;
  const citySlug = city.slug || city.sourceSlug || undefined;

  return (
    <ul
      className="mt-2 flex min-w-0 flex-wrap gap-1"
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
          <li key={`${tag.kind}:${tag.slug || tag.label}`} className="min-w-0 max-w-full">
            <Link
              href={href}
              className="inline-flex max-w-full truncate rounded-md bg-primary-50 px-2 py-0.5 text-[10px] font-semibold leading-4 text-primary-800 transition hover:bg-primary-100"
            >
              {tag.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function CityVibeRow({ city }: { city: PublicDestinationDto }) {
  const vibes = resolveCityVibeTags(city.slug, city.sourceSlug, 4);
  if (!vibes.length) return null;

  return (
    <ul className="mt-2 flex min-w-0 flex-wrap gap-1" aria-label={`Вайб: ${city.name}`}>
      {vibes.map((tag) => (
        <li key={tag.label}>
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100/90 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
            <span aria-hidden>{tag.emoji}</span>
            {tag.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function CityCard({
  city,
  large = false,
  description,
  region,
  imageVariant = 'default',
  compact = false,
}: CityCardProps) {
  const imageUrl = resolveCityCardImage(city, { variant: imageVariant });
  const href = cityHref(city);
  const imageFocus =
    imageVariant === 'top'
      ? 'center 40%'
      : resolveCityImageObjectPosition({ slug: city.slug, sourceSlug: city.sourceSlug, name: city.name });
  const brief = description?.trim() || '';
  const showBrief = Boolean(brief) && !compact;
  const titleVariant = compact || large ? 'large' : 'compact';

  return (
    <div className="flex flex-col">
      <Link
        href={href}
        className="card group relative block overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_28px_-8px_hsl(221_83%_53%_/_0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
      >
        <div className={`relative ${CITY_CARD_ASPECT_CLASS} overflow-hidden`}>
          <SafeImage
            src={imageUrl}
            alt=""
            fill
            sizes={IMAGE_SIZES.cityCard}
            style={{ objectPosition: imageFocus }}
            className="object-cover brightness-[1.08] contrast-[0.98] transition-transform duration-500 group-hover:scale-105"
            fallback={<div className="absolute inset-0 bg-gradient-to-br from-primary-700 to-primary-900" />}
          />
          {/* Lighter scrim so daytime landmarks stay bright; text still readable. */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-2.5 text-left sm:p-3">
            <h3 className={`${cityCardTitleClass(titleVariant)} line-clamp-2 break-words`}>{city.name}</h3>
            {showBrief ? (
              <p className="mt-1 line-clamp-1 text-[11px] text-white/70 opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:text-xs">
                {brief}
              </p>
            ) : null}
            <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-white/90 sm:text-xs">
              <span className="flex min-w-0 items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                {city.events > 0 ? (
                  <CountUp
                    value={city.events}
                    format={(n) => pluralEvents(n)}
                    className="truncate font-semibold tabular-nums"
                  />
                ) : (
                  <span className="truncate">Скоро появятся события</span>
                )}
              </span>
              {city.venues != null && city.venues > 0 ? (
                <span className="flex min-w-0 items-center gap-1 text-white/80">
                  <Landmark className="h-3 w-3 shrink-0" />
                  <span className="truncate">{pluralVenues(city.venues)}</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </Link>

      <CityVibeRow city={city} />
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
