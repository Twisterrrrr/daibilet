'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Anchor,
  Building2,
  Cake,
  Church,
  Clapperboard,
  Droplets,
  Factory,
  Fish,
  Flame,
  Gem,
  GraduationCap,
  Landmark,
  MapPin,
  Microscope,
  Moon,
  Mountain,
  Music,
  Palette,
  Rocket,
  Shield,
  Ship,
  Snowflake,
  Sparkles,
  Sunrise,
  Sun,
  Swords,
  Train,
  Trees,
  Umbrella,
  Waves,
} from 'lucide-react';

import { CountUp } from '@/components/CountUp.client';
import { RegionDestinationLink } from '@/components/RegionDestinationLink';
import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { CITY_CARD_ASPECT_CLASS, cityCardTitleClass } from '@/lib/city-card-styles';
import { resolveCityImageObjectPosition } from '@/lib/city-image-focus';
import { resolveCityCardImage } from '@/lib/city-images';
import type { CityCardRegion } from '@/lib/cityRegionHub';
import { resolveCityVibeTags, type CityVibeIconName } from '@/lib/city-vibe-tags';
import { landingCategoryHref } from '@/lib/landing-routes';
import { cityHref } from '@/lib/routes';
import { pluralEvents, pluralVenues } from '@/lib/format';

type CityCardProps = {
  city: PublicDestinationDto;
  large?: boolean;
  /** Long briefs stay on city hub; listing uses line-clamp-1 or omits. */
  description?: string;
  region?: CityCardRegion | null;
  /** `top` - daytime landmark previews for `/cities` hero tiles only. */
  imageVariant?: 'default' | 'top';
  /** Compact listing: bigger title, vibe tags, no text-heavy body. */
  compact?: boolean;
  /** Default `dark` = white type on photo (top `/cities` cards). `light` kept for other surfaces. */
  tone?: 'dark' | 'light';
};

const VIBE_ICONS: Record<CityVibeIconName, LucideIcon> = {
  Building2,
  Clapperboard,
  Train,
  Moon,
  Bridge: Landmark,
  Landmark,
  Waves,
  Sun,
  Mountain,
  Trees,
  Factory,
  Palette,
  Ship,
  Sunrise,
  Umbrella,
  Rocket,
  Microscope,
  Gem,
  Church,
  Swords,
  Flame,
  Music,
  Snowflake,
  Cake,
  Fish,
  Anchor,
  Droplets,
  GraduationCap,
  Shield,
  Sparkles,
  MapPin,
};

function CityHubTags({
  city,
  region,
  compact = false,
}: {
  city: PublicDestinationDto;
  region?: CityCardRegion | null;
  compact?: boolean;
}) {
  const tags = (city.hubTags || []).slice(0, 3);
  const showRegion = Boolean(region && region.eventCount > 0);
  if (!tags.length && !showRegion) return null;
  const citySlug = city.slug || city.sourceSlug || undefined;

  return (
    <ul
      className={`mt-2.5 flex min-w-0 flex-wrap content-start items-center gap-x-2 gap-y-1.5 ${
        compact ? 'min-h-[1.75rem]' : ''
      }`}
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
          <li key={`${tag.kind}:${tag.slug || tag.label}`} className="min-w-0">
            <Link
              href={href}
              className="inline-flex max-w-full truncate rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium leading-none text-slate-700 transition hover:bg-slate-200/90 hover:text-slate-900 sm:text-xs"
            >
              {tag.label}
            </Link>
          </li>
        );
      })}
      {showRegion && region ? (
        <li className="min-w-0">
          <RegionDestinationLink
            region={{ slug: region.slug, name: region.name, events: region.eventCount }}
            variant="chip"
          />
        </li>
      ) : null}
    </ul>
  );
}

function CityVibeRow({ city }: { city: PublicDestinationDto }) {
  const vibes = resolveCityVibeTags(city.slug, city.sourceSlug, 4);
  if (!vibes.length) return null;

  return (
    <ul
      className="mt-2 hidden min-w-0 flex-wrap gap-1 opacity-0 transition-opacity duration-200 md:flex md:group-hover/city:opacity-100"
      aria-label={`Вайб: ${city.name}`}
    >
      {vibes.map((tag) => {
        const Icon = VIBE_ICONS[tag.icon] || MapPin;
        return (
          <li key={tag.label}>
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100/90 px-1.5 py-0.5 text-xs font-medium text-slate-600">
              <Icon className="h-3 w-3 shrink-0 text-slate-500" strokeWidth={1.75} aria-hidden />
              {tag.label}
            </span>
          </li>
        );
      })}
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
  tone = 'dark',
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
  const isLight = tone === 'light';

  return (
    <div className="group/city flex min-w-0 flex-col">
      <Link
        href={href}
        className={`card group relative block overflow-hidden transition-all duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 ${
          isLight
            ? 'border border-slate-200/90 bg-white shadow-sm hover:shadow-[0_10px_28px_-10px_hsl(221_83%_53%_/_0.28)]'
            : 'hover:shadow-[0_10px_28px_-8px_hsl(221_83%_53%_/_0.35)]'
        }`}
      >
        <div className={`relative ${CITY_CARD_ASPECT_CLASS} overflow-hidden`}>
          <SafeImage
            src={imageUrl}
            alt=""
            fill
            sizes={IMAGE_SIZES.cityCard}
            style={{ objectPosition: imageFocus }}
            className={`object-cover transition-transform duration-500 group-hover:scale-105 ${
              isLight
                ? 'brightness-[1.05] contrast-[1.02] saturate-[1.05]'
                : 'brightness-[0.96] contrast-[1.04] saturate-[1.02]'
            }`}
            fallback={
              <div
                className={`absolute inset-0 bg-gradient-to-br ${
                  isLight ? 'from-slate-100 to-slate-200' : 'from-primary-700 to-primary-900'
                }`}
              />
            }
          />
          {/* Dark: oval scrim protruding from the left edge (owner sketch), not a flat bottom band. */}
          <div
            className={`pointer-events-none absolute inset-0 ${
              isLight ? 'bg-gradient-to-t from-white/95 via-white/45 to-transparent' : ''
            }`}
            style={
              isLight
                ? undefined
                : {
                    backgroundImage:
                      'radial-gradient(ellipse 92% 105% at -8% 72%, hsl(222 55% 12% / 0.78) 0%, hsl(221 58% 18% / 0.52) 36%, hsl(221 60% 28% / 0.2) 58%, transparent 74%)',
                  }
            }
            aria-hidden
          />
          <div
            className={`absolute inset-x-0 bottom-0 ${compact ? 'p-2 sm:p-2.5' : 'p-2.5 sm:p-3'}`}
          >
            <div
              className={
                isLight
                  ? 'max-w-full'
                  : 'max-w-[min(100%,16rem)] rounded-xl bg-primary-900/30 px-2.5 py-1.5 ring-1 ring-white/25 backdrop-blur-[6px] sm:max-w-[min(100%,18rem)] sm:px-3 sm:py-2'
              }
            >
              <h3 className={cityCardTitleClass(titleVariant, tone)}>{city.name}</h3>
              {showBrief ? (
                <p
                  className={`mt-1 line-clamp-1 text-xs opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:text-sm ${
                    isLight ? 'text-slate-600' : 'text-white/90'
                  }`}
                >
                  {brief}
                </p>
              ) : null}
              <div
                className={`mt-1 flex flex-col gap-0.5 ${
                  isLight ? 'text-slate-700' : 'text-white'
                } ${compact ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm'}`}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={1.75} />
                  {city.events > 0 ? (
                    compact ? (
                      // Compact rails (home popular cities): CountUp stays at 0 until IO fires
                      // inside overflow-x, so cards wrongly read «0 событий» next to venue counts.
                      <span className="truncate font-semibold tabular-nums">{pluralEvents(city.events)}</span>
                    ) : (
                      <CountUp
                        value={city.events}
                        format={(n) => pluralEvents(n)}
                        className="truncate font-semibold tabular-nums"
                      />
                    )
                  ) : (
                    <span className="truncate">Скоро появятся события</span>
                  )}
                </span>
                {city.venues != null && city.venues > 0 ? (
                  <span
                    className={`flex min-w-0 items-center gap-1.5 ${
                      isLight ? 'text-slate-500' : 'text-white/90'
                    }`}
                  >
                    <Landmark className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={1.75} />
                    <span className="truncate">{pluralVenues(city.venues)}</span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </Link>

      <CityHubTags city={city} region={region} compact={compact} />
      <CityVibeRow city={city} />
    </div>
  );
}
