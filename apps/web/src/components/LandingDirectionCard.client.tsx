'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { formatPriceFrom, pluralEvents } from '@/lib/format';
import { resolveLandingCardImage } from '@/lib/landing-images';
import { landingCategoryHref } from '@/lib/landing-routes';

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

/** Та же карточка, что в разделе «Подборки» (`/podborki`). */
export function LandingDirectionCard({
  landing,
  citySlug,
}: {
  landing: LandingDirectionCardItem;
  citySlug?: string | null;
}) {
  const emoji = LANDING_EMOJI[landing.slug] || '✨';
  const imageUrl = resolveLandingCardImage(landing.slug);
  const href = landingCategoryHref(landing.slug, citySlug && citySlug !== 'all' ? citySlug : undefined);

  return (
    <Link
      href={href}
      className="group relative flex h-56 flex-col justify-end overflow-hidden rounded-2xl bg-slate-900 shadow-sm ring-1 ring-slate-900/10 transition hover:-translate-y-0.5 hover:shadow-xl sm:h-60"
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
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />
      <div className="relative p-4 text-white sm:p-5">
        <span className="text-xl" aria-hidden>
          {emoji}
        </span>
        <h3 className="font-display mt-1 text-lg font-bold sm:text-xl">{landing.title}</h3>
        {landing.subtitle ? (
          <p className="mt-1 line-clamp-2 text-xs text-white/80 sm:text-sm">{landing.subtitle}</p>
        ) : null}
        <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-white/90 group-hover:text-white sm:text-sm">
          {pluralEvents(landing.events)} · {formatLandingPrice(landing.priceFrom)}
          <ArrowRight className="h-3.5 w-3.5" />
        </p>
      </div>
    </Link>
  );
}
