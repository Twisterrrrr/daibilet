'use client';

import { ArrowRight } from 'lucide-react';

import { formatMoneyRange, formatNumber, formatPriceFrom, moneyRangeStatLabel } from '@/lib/format';

/**
 * Bridges-inspired CTA + honest stats for non-bridges landing heroes.
 * Price on primary CTA is always «от min»; range lives only in the stats cell.
 */
export function LandingHeroCtaBlock({
  priceFrom,
  priceTo,
  visibleCount,
  countLabel,
  sessionsReady,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
}: {
  priceFrom: number | null;
  priceTo?: number | null;
  visibleCount: number;
  countLabel: string;
  sessionsReady: boolean;
  primaryLabel: string;
  secondaryLabel?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
}) {
  const priceCtaLabel = priceFrom ? formatPriceFrom(priceFrom) : null;
  const priceRangeLabel = priceFrom ? formatMoneyRange(priceFrom, priceTo) : null;
  const priceStatLabel = moneyRangeStatLabel(priceFrom, priceTo);

  return (
    <div className="space-y-0">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onPrimary}
          className="inline-btn inline-flex items-center gap-2 rounded-full bridges-cta-gradient px-6 py-3 text-sm font-semibold text-white transition hover:brightness-105 active:scale-[0.98]"
        >
          {priceCtaLabel ? `${primaryLabel} · ${priceCtaLabel}` : primaryLabel}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
        {secondaryLabel && onSecondary ? (
          <button
            type="button"
            onClick={onSecondary}
            className="inline-btn rounded-full border border-primary-foreground/25 px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary-foreground/10 active:scale-[0.98]"
          >
            {secondaryLabel}
          </button>
        ) : null}
      </div>

      <dl className="mt-10 grid grid-cols-2 gap-4 border-t border-primary-foreground/15 pt-6 md:max-w-lg">
        {sessionsReady ? (
          <>
            <div>
              <dt className="text-2xl font-semibold tracking-tight text-primary-foreground md:text-3xl">
                {formatNumber(visibleCount)}
              </dt>
              <dd className="mt-1 text-xs uppercase tracking-wider text-primary-foreground/60">{countLabel}</dd>
            </div>
            <div>
              <dt className="whitespace-nowrap text-2xl font-semibold tracking-tight text-primary-foreground md:text-3xl">
                {priceRangeLabel || '—'}
              </dt>
              <dd className="mt-1 text-xs uppercase tracking-wider text-primary-foreground/60">{priceStatLabel}</dd>
            </div>
          </>
        ) : (
          <p className="col-span-full text-sm text-primary-foreground/80">Загружаем актуальное расписание…</p>
        )}
      </dl>
    </div>
  );
}

export type LandingHeroTheme = {
  className: string;
  glow: string;
};

/** Category-adapted dark atmosphere - typography/chrome like night-bridges, not a flat blue slab. */
export function resolveLandingHeroTheme(options: {
  profile: 'bus' | 'dinner' | 'river' | 'seasonal' | 'bridges' | 'default';
  landingSlug: string;
  countdownKind?: 'new-year' | 'salute-may9' | null;
}): LandingHeroTheme {
  const key = options.landingSlug.toLowerCase();
  const atmosphere = 'text-primary-foreground landing-hero-atmosphere';

  if (options.profile === 'bridges') {
    return { className: `gradient-bridges-hero ${atmosphere}`, glow: 'var(--bridges-hero-glow)' };
  }
  if (options.countdownKind === 'new-year') {
    return { className: `gradient-newyear-hero ${atmosphere}`, glow: 'var(--newyear-hero-glow)' };
  }
  if (options.countdownKind === 'salute-may9' || key.includes('salute') || key.includes('salyut')) {
    return { className: `gradient-salute-hero ${atmosphere}`, glow: 'var(--landing-hero-glow)' };
  }
  if (options.profile === 'dinner' || key.includes('dinner') || key.includes('uzhin')) {
    return { className: `gradient-dinner-hero ${atmosphere}`, glow: 'var(--dinner-hero-glow)' };
  }
  if (options.profile === 'bus' || key.includes('bus')) {
    return { className: `gradient-bus-hero ${atmosphere}`, glow: 'var(--bus-hero-glow)' };
  }
  if (options.profile === 'river' || key.includes('river') || key.includes('cruise')) {
    return { className: `gradient-river-hero ${atmosphere}`, glow: 'var(--river-hero-glow)' };
  }
  if (options.profile === 'seasonal') {
    return { className: `gradient-seasonal-hero ${atmosphere}`, glow: 'var(--landing-hero-glow)' };
  }
  if (key.includes('rooftop') || key.includes('krysh') || key.includes('крыш')) {
    return { className: `gradient-rooftop-hero ${atmosphere}`, glow: 'var(--rooftop-hero-glow)' };
  }
  if (key.includes('planet') || key.includes('планетар')) {
    return { className: `gradient-planetarium-hero ${atmosphere}`, glow: 'var(--planetarium-hero-glow)' };
  }
  if (key.includes('standup') || key.includes('stendap') || key.includes('concert') || key.includes('koncert') || key.includes('jazz')) {
    return { className: `gradient-stage-hero ${atmosphere}`, glow: 'var(--stage-hero-glow)' };
  }
  if (key.includes('family') || key.includes('deti') || key.includes('detsk') || key.includes('semey') || key.includes('kids')) {
    return { className: `gradient-family-hero ${atmosphere}`, glow: 'var(--family-hero-glow)' };
  }
  if (key.includes('country') || key.includes('zagorod') || key.includes('usadb') || key.includes('estate')) {
    return { className: `gradient-country-hero ${atmosphere}`, glow: 'var(--country-hero-glow)' };
  }
  if (key.includes('party') || key.includes('vecherink')) {
    return { className: `gradient-party-hero ${atmosphere}`, glow: 'var(--party-hero-glow)' };
  }

  return { className: `gradient-default-hero ${atmosphere}`, glow: 'var(--landing-hero-glow)' };
}

export function resolveLandingHeroPrimaryLabel(profile: 'bus' | 'dinner' | 'river' | 'seasonal' | 'bridges' | 'default'): string {
  if (profile === 'bus') return 'Смотреть рейсы';
  if (profile === 'river' || profile === 'dinner') return 'Выбрать прогулку';
  if (profile === 'seasonal') return 'Смотреть программы';
  return 'Смотреть расписание';
}
