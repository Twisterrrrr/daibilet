'use client';

import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';

import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { formatPriceFrom, pluralEvents } from '@/lib/format';
import { resolveLandingCityName } from '@/lib/landing-city';
import { resolveLandingCardImage } from '@/lib/landing-images';
import {
  landingCategoryHref,
  normalizeKnownCitySlug,
  resolveLandingBoundCitySlug,
} from '@/lib/landing-routes';

export type LandingDirectionCardItem = {
  slug: string;
  title: string;
  subtitle?: string | null;
  events: number;
  priceFrom?: number | null;
};

/** Brand primary / sky / cyan - no purple-neon / orange-glow. */
function landingGradient(slug: string): string {
  if (slug.includes('river') || slug.includes('bridge') || slug.includes('boat')) {
    return 'from-sky-600 via-primary-700 to-cyan-950';
  }
  if (slug.includes('standup')) return 'from-cyan-700 via-sky-800 to-slate-950';
  if (slug.includes('family') || slug.includes('kids') || slug.includes('planet')) {
    return 'from-sky-500 via-cyan-600 to-primary-900';
  }
  if (slug.includes('yard') || slug.includes('museum') || slug.includes('exhibit')) {
    return 'from-slate-700 via-primary-800 to-sky-950';
  }
  if (slug.includes('bus') || slug.includes('walk') || slug.includes('excursion') || slug.includes('tour')) {
    return 'from-sky-600 via-cyan-700 to-slate-900';
  }
  if (slug.includes('salute') || slug.includes('new-year') || slug.includes('city-day')) {
    return 'from-primary-600 via-sky-700 to-cyan-950';
  }
  if (slug.includes('concert') || slug.includes('theatre') || slug.includes('rooftop')) {
    return 'from-primary-700 via-sky-800 to-slate-950';
  }
  if (slug.includes('active') || slug.includes('sport')) {
    return 'from-slate-700 via-sky-900 to-cyan-950';
  }
  return 'from-primary-700 via-sky-700 to-cyan-900';
}

function formatLandingPriceBadge(value?: number | null): string | null {
  if (typeof value !== 'number') return null;
  if (value === 0) return 'Бесплатно';
  if (value > 0) return formatPriceFrom(value);
  return null;
}

function landingBenefit(landing: LandingDirectionCardItem): string {
  if (landing.subtitle?.trim()) return landing.subtitle.trim();
  return 'Готовый список с ценами, датами и площадками - без долгого поиска по афише.';
}

function LandingCityBadge({
  slug,
  filterCitySlug,
  showFilterCityBadge,
}: {
  slug: string;
  filterCitySlug?: string | null;
  showFilterCityBadge?: boolean;
}) {
  const boundSlug = resolveLandingBoundCitySlug(slug);
  const boundName = boundSlug ? resolveLandingCityName(boundSlug) : null;
  const filterSlug =
    filterCitySlug && filterCitySlug !== 'all' ? normalizeKnownCitySlug(filterCitySlug) : null;
  const filterName = filterSlug
    ? resolveLandingCityName(filterSlug) || resolveLandingCityName(filterCitySlug)
    : null;
  const inCityContext = Boolean(filterSlug && (showFilterCityBadge || filterName));

  // City-bound landing in another city's hub/catalog - hide badge (card should be filtered out).
  if (boundSlug && filterSlug && boundSlug !== filterSlug) {
    return null;
  }

  // Prefer selected city for multi-city landings; keep permanent city for bound landings.
  const cityName = boundName || (inCityContext ? filterName : null);
  if (!cityName) return null;
  return (
    <span className="inline-flex w-fit max-w-full items-center gap-1 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-semibold leading-none text-slate-900 shadow-sm backdrop-blur-md sm:px-2.5 sm:py-1 sm:text-[11px]">
      <MapPin className="h-3 w-3 shrink-0 text-primary-700" aria-hidden />
      <span className="truncate">{cityName}</span>
    </span>
  );
}

function CardStatBadges({
  landing,
}: {
  landing: LandingDirectionCardItem;
}) {
  const price = formatLandingPriceBadge(landing.priceFrom);
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md ring-1 ring-white/25 sm:text-[11px]">
        {pluralEvents(landing.events)}
      </span>
      {price ? (
        <span className="inline-flex items-center rounded-full bg-sky-400/25 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md ring-1 ring-sky-200/30 sm:text-[11px]">
          {price}
        </span>
      ) : null}
    </div>
  );
}

function quietMetaLine(landing: LandingDirectionCardItem): string {
  const parts = [pluralEvents(landing.events)];
  const price = formatLandingPriceBadge(landing.priceFrom);
  if (price) parts.push(price);
  return parts.join(' · ');
}

/** Та же сущность, что в «Подборки» (`/podborki`): плитка или широкий баннер для city hub. */
export function LandingDirectionCard({
  landing,
  citySlug,
  variant = 'tile',
  rank,
  showFilterCityBadge = false,
  featured = false,
}: {
  landing: LandingDirectionCardItem;
  citySlug?: string | null;
  variant?: 'tile' | 'banner';
  /** 1-based порядок в топе запросов (для баннера). */
  rank?: number;
  /** Show selected-city badge on national landings when catalog is city-filtered. */
  showFilterCityBadge?: boolean;
  /** Taller tile for bento wide cells. */
  featured?: boolean;
}) {
  const contextCity = citySlug && citySlug !== 'all' ? citySlug : undefined;
  const imageUrl = resolveLandingCardImage(landing.slug, contextCity);
  const href = landingCategoryHref(landing.slug, contextCity);
  const cityBadge = (
    <LandingCityBadge
      slug={landing.slug}
      filterCitySlug={citySlug}
      showFilterCityBadge={showFilterCityBadge || Boolean(contextCity)}
    />
  );

  if (variant === 'banner') {
    return (
      <Link
        href={href}
        className="group relative flex min-h-[10.5rem] w-full overflow-hidden bg-slate-950 text-white ring-1 ring-slate-900/10 transition hover:ring-primary-500/40 sm:min-h-[11.5rem]"
      >
        {imageUrl ? (
          <SafeImage
            src={imageUrl}
            alt=""
            fill
            loading="lazy"
            sizes={IMAGE_SIZES.landingBanner}
            className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.08]"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${landingGradient(landing.slug)}`} />
        )}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-slate-950 from-[8%] via-slate-950/88 via-[42%] to-slate-950/25 to-[88%]"
        />
        <div aria-hidden className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-slate-950/50 to-transparent" />

        <div className="relative z-[1] flex w-full flex-col justify-center gap-3 px-5 py-6 sm:px-7 sm:py-7 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
          <div className="min-w-0 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/55">
                {typeof rank === 'number' ? `Топ-запрос · ${String(rank).padStart(2, '0')}` : 'Топ-запрос'}
              </p>
              {cityBadge}
            </div>
            <h3 className="font-display mt-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              <span className="underline-offset-4 group-hover:underline">{landing.title}</span>
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/80 sm:text-[0.95rem]">{landingBenefit(landing)}</p>
            <div className="mt-3">
              <CardStatBadges landing={landing} />
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition group-hover:gap-3 lg:self-end">
            Открыть подборку
            <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        </div>
      </Link>
    );
  }

  const coverHeight = featured
    ? 'min-h-[14rem] sm:min-h-[16rem]'
    : 'min-h-[11rem] sm:min-h-[12.5rem]';

  const photoFallback = (
    <div className={`absolute inset-0 bg-gradient-to-br ${landingGradient(landing.slug)}`} aria-hidden />
  );

  return (
    <Link
      href={href}
      className="group relative flex w-full overflow-hidden rounded-2xl shadow-md ring-1 ring-slate-900/15 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className={`relative flex w-full ${coverHeight} flex-col justify-end overflow-hidden bg-slate-900`}>
        {imageUrl ? (
          <SafeImage
            src={imageUrl}
            alt=""
            fill
            loading="lazy"
            sizes={IMAGE_SIZES.landingCard}
            className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.06]"
            fallback={photoFallback}
          />
        ) : (
          photoFallback
        )}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-slate-950/10"
        />
        <div className="relative z-[1] flex flex-col gap-2 p-4 text-white sm:p-5">
          {cityBadge}
          <h3
            className={`font-display font-bold leading-tight text-white drop-shadow-sm ${
              featured ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'
            }`}
          >
            <span className="underline-offset-4 group-hover:underline">{landing.title}</span>
          </h3>
          <p className="text-xs font-medium text-white/85 sm:text-sm">{quietMetaLine(landing)}</p>
          <p className="inline-flex items-center gap-1 text-sm font-semibold text-white">
            Смотреть
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden />
          </p>
        </div>
      </div>
    </Link>
  );
}
