'use client';

import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';

import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { formatPriceFrom, pluralEvents } from '@/lib/format';
import { resolveLandingCityName } from '@/lib/landing-city';
import { resolveLandingCardImage } from '@/lib/landing-images';
import { landingCategoryHref, resolveLandingBoundCitySlug } from '@/lib/landing-routes';

export type LandingDirectionCardItem = {
  slug: string;
  title: string;
  subtitle?: string | null;
  events: number;
  priceFrom?: number | null;
};

const LANDING_EMOJI: Record<string, string> = {
  'river-cruises': '🚢',
  'bus-tours': '🚌',
  'river-party': '🎉',
  'bridges-night': '🌉',
  'moscow-dinner-boat': '🍽',
  'moscow-museums': '🏛',
  'spb-yards': '🏛',
  standup: '🎤',
  'new-year': '🎄',
  'salute-9-may': '🎆',
  'family-kids': '🎪',
  'concerts-genre': '🎸',
  'active-sport': '🏎',
};

function formatLandingPrice(value?: number | null): string {
  if (!value || value <= 0) return '—';
  return formatPriceFrom(value);
}

function landingGradient(slug: string): string {
  if (slug.includes('yard') || slug.includes('paradn') || slug.includes('museum')) {
    return 'from-amber-700 via-orange-800 to-stone-900';
  }
  if (slug.includes('river') || slug.includes('bridge') || slug.includes('boat')) {
    return 'from-sky-600 via-primary-700 to-slate-900';
  }
  if (slug.includes('bus')) return 'from-amber-500 via-orange-600 to-rose-600';
  if (slug.includes('salute') || slug.includes('new-year')) {
    return 'from-violet-700 via-fuchsia-600 to-indigo-900';
  }
  if (slug.includes('standup')) return 'from-emerald-600 via-teal-600 to-cyan-800';
  if (slug.includes('family') || slug.includes('kids')) {
    return 'from-pink-500 via-rose-500 to-orange-500';
  }
  if (slug.includes('concert')) return 'from-red-600 via-rose-700 to-purple-900';
  if (slug.includes('active') || slug.includes('sport')) {
    return 'from-slate-700 via-zinc-800 to-black';
  }
  return 'from-indigo-600 via-primary to-fuchsia-700';
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
  const filterName =
    !boundName && showFilterCityBadge && filterCitySlug && filterCitySlug !== 'all'
      ? resolveLandingCityName(filterCitySlug)
      : null;
  const cityName = boundName || filterName;
  if (!cityName) return null;
  return (
    <span className="inline-flex w-fit max-w-full items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold leading-none text-slate-900 shadow-sm backdrop-blur-sm sm:px-2.5 sm:py-1 sm:text-[11px]">
      <MapPin className="h-3 w-3 shrink-0 text-primary-700" aria-hidden />
      <span className="truncate">{cityName}</span>
    </span>
  );
}

/** Та же сущность, что в «Подборки» (`/podborki`): плитка или широкий баннер для city hub. */
export function LandingDirectionCard({
  landing,
  citySlug,
  variant = 'tile',
  rank,
  showFilterCityBadge = false,
}: {
  landing: LandingDirectionCardItem;
  citySlug?: string | null;
  variant?: 'tile' | 'banner';
  /** 1-based порядок в топе запросов (для баннера). */
  rank?: number;
  /** Show selected-city badge on national landings when catalog is city-filtered. */
  showFilterCityBadge?: boolean;
}) {
  const emoji = LANDING_EMOJI[landing.slug] || '✨';
  const imageUrl = resolveLandingCardImage(landing.slug);
  const href = landingCategoryHref(landing.slug, citySlug && citySlug !== 'all' ? citySlug : undefined);
  const priceLabel = formatLandingPrice(landing.priceFrom);
  const eventsLabel = pluralEvents(landing.events);
  const cityBadge = (
    <LandingCityBadge
      slug={landing.slug}
      filterCitySlug={citySlug}
      showFilterCityBadge={showFilterCityBadge}
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
            sizes={IMAGE_SIZES.landingBanner}
            className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${landingGradient(landing.slug)}`} />
        )}
        {/* Читаемость слева + лёгкий fade справа, чтобы баннер «дышал» на широком экране. */}
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
            <h3 className="font-display mt-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">{landing.title}</h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/80 sm:text-[0.95rem]">{landingBenefit(landing)}</p>
            <p className="mt-3 text-sm font-semibold text-white/90">
              {eventsLabel}
              <span className="mx-2 text-white/35" aria-hidden>
                ·
              </span>
              {priceLabel}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition group-hover:gap-3 lg:self-end">
            Открыть подборку
            <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="group relative flex h-56 flex-col justify-end overflow-hidden rounded-card bg-slate-900 shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-card-hover sm:h-60"
    >
      {imageUrl ? (
        <SafeImage
          src={imageUrl}
          alt=""
          fill
          sizes={IMAGE_SIZES.landingCard}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${landingGradient(landing.slug)} opacity-90`} />
      )}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/5" />
      {cityBadge ? <div className="absolute left-2 top-2 z-[2] sm:left-3 sm:top-3">{cityBadge}</div> : null}
      <div className="relative z-[1] p-4 text-white sm:p-5">
        <span className="text-xl" aria-hidden>
          {emoji}
        </span>
        <h3 className="font-display mt-1 text-lg font-bold text-white sm:text-xl">{landing.title}</h3>
        {landing.subtitle ? (
          <p className="mt-1 line-clamp-2 text-xs text-white/80 sm:text-sm">{landing.subtitle}</p>
        ) : null}
        <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-white/90 group-hover:text-white sm:text-sm">
          {eventsLabel} · {priceLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </p>
      </div>
    </Link>
  );
}
