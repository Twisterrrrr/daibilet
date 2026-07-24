import * as React from 'react';

import { PageBreadcrumbBar, type BreadcrumbItem } from '@/components/PageBreadcrumbs';

export type HeroVariant = 'minimal' | 'withMap' | 'imageOverlay' | 'split' | 'video';

export type HeroLayoutProps = {
  variant: HeroVariant;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Brand / eyebrow над H1 (brand-first на home). */
  brand?: React.ReactNode;
  eyebrow?: React.ReactNode;
  /** Single background for imageOverlay / video / dark overlays. */
  backgroundImage?: string | null;
  backgroundAlt?: string;
  /** Rotator frames (imageOverlay). Takes precedence over backgroundImage when length > 1. */
  backgroundImages?: Array<{ src: string; alt?: string }>;
  /** Video src for variant=video. */
  videoSrc?: string | null;
  /** Right/aside column for split / map panel. */
  aside?: React.ReactNode;
  /** Breadcrumbs above hero (catalog pages). */
  breadcrumbs?: BreadcrumbItem[];
  /** Tone for text and overlays. */
  tone?: 'light' | 'dark';
  /** Extra class on outer section. */
  className?: string;
  /** Override split grid (e.g. lg:grid-cols-[7fr_3fr]). */
  splitClassName?: string;
  /** Search / tags / filters slot. */
  children?: React.ReactNode;
  /** Media renderer - injected to keep RSC shell free of client image rotator. */
  media?: React.ReactNode;
};

const TONE = {
  light: {
    section: 'bg-slate-50 text-slate-900',
    title: 'text-slate-900',
    description: 'text-slate-600',
    brand: 'text-primary-700',
    eyebrow: 'text-slate-500',
  },
  dark: {
    section: 'bg-slate-950 text-white',
    title: 'text-white',
    description: 'text-white/85',
    brand: 'text-sky-200',
    eyebrow: 'text-white/70',
  },
} as const;

/**
 * Shared first-viewport layout for public catalog surfaces.
 * Variants share one composition API - pages pass search/map/featured as children/aside.
 */
export function HeroLayout({
  variant,
  title,
  description,
  brand,
  eyebrow,
  aside,
  breadcrumbs,
  tone: toneProp,
  className = '',
  splitClassName = 'lg:grid-cols-[minmax(0,2fr)_minmax(14rem,1fr)]',
  children,
  media,
}: HeroLayoutProps) {
  const tone = toneProp ?? (variant === 'imageOverlay' || variant === 'video' || variant === 'withMap' ? 'dark' : 'light');
  const t = TONE[tone];

  if (variant === 'split') {
    return (
      <>
        {breadcrumbs?.length ? <PageBreadcrumbBar items={breadcrumbs} /> : null}
        <section className={`relative overflow-hidden border-b border-slate-200 ${t.section} ${className}`.trim()}>
          <div className="container-page py-10 lg:py-14">
            <div className={`mx-auto grid w-full max-w-5xl items-stretch gap-4 lg:gap-5 ${splitClassName}`.trim()}>
              <div className="min-w-0">
                {brand ? <div className={`font-display text-sm font-bold tracking-[0.18em] uppercase ${t.brand}`}>{brand}</div> : null}
                {eyebrow ? <p className={`text-sm font-semibold uppercase tracking-wider ${t.eyebrow} ${brand ? 'mt-2' : ''}`}>{eyebrow}</p> : null}
                <h1
                  className={`font-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl ${t.title} ${
                    brand || eyebrow ? 'mt-3' : ''
                  }`}
                >
                  {title}
                </h1>
                {description ? <p className={`mt-3 max-w-xl text-base leading-relaxed sm:text-lg ${t.description}`}>{description}</p> : null}
                {children}
              </div>
              <div className="min-w-0 self-stretch">{aside}</div>
            </div>
          </div>
        </section>
      </>
    );
  }

  if (variant === 'minimal') {
    return (
      <>
        {breadcrumbs?.length ? <PageBreadcrumbBar items={breadcrumbs} /> : null}
        <section className={`border-b border-slate-200 ${t.section} ${className}`.trim()}>
          <div className="container-page py-8 sm:py-10">
            {/* One centered column: H1 + children share the same max-w axis (no nested left-biased max-w). */}
            <div className="mx-auto w-full max-w-5xl">
              {brand ? <div className={`font-display text-sm font-bold tracking-[0.18em] uppercase ${t.brand}`}>{brand}</div> : null}
              {eyebrow ? <p className={`text-sm font-semibold uppercase tracking-wider ${t.eyebrow} ${brand ? 'mt-2' : ''}`}>{eyebrow}</p> : null}
              <h1
                className={`font-display text-3xl font-extrabold tracking-tight sm:text-4xl ${t.title} ${
                  brand || eyebrow ? 'mt-2' : ''
                }`}
              >
                {title}
              </h1>
              {description ? <p className={`mt-3 max-w-2xl text-base leading-relaxed sm:text-lg ${t.description}`}>{description}</p> : null}
              {children}
            </div>
          </div>
        </section>
      </>
    );
  }

  // imageOverlay | video | withMap - full-bleed media plane
  // Высота: контент + padding (без 70vh / ultrawide min-h inflation).
  return (
    <>
      {breadcrumbs?.length ? <PageBreadcrumbBar items={breadcrumbs} /> : null}
      <section className={`relative overflow-hidden ${t.section} ${className}`.trim()}>
        {media}
        <div className="container-page relative z-10 pb-12 pt-12 sm:pb-16 sm:pt-16">
          {variant === 'withMap' && aside ? (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.85fr)] lg:items-end">
              <div className="min-w-0">
                <HeroCopy brand={brand} eyebrow={eyebrow} title={title} description={description} t={t} />
                {children}
              </div>
              <div className="min-w-0">{aside}</div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl text-center">
              <HeroCopy brand={brand} eyebrow={eyebrow} title={title} description={description} t={t} centered />
              {children}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function HeroCopy({
  brand,
  eyebrow,
  title,
  description,
  t,
  centered,
}: {
  brand?: React.ReactNode;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  t: (typeof TONE)['light'] | (typeof TONE)['dark'];
  centered?: boolean;
}) {
  const align = centered ? 'text-center' : '';
  return (
    <div className={align}>
      {brand ? (
        <div
          className={`font-display text-base font-bold tracking-[0.2em] uppercase drop-shadow-[0_2px_12px_rgba(15,23,42,0.45)] sm:text-lg ${t.brand}`}
        >
          {brand}
        </div>
      ) : null}
      {eyebrow ? (
        <p className={`text-sm font-semibold uppercase tracking-wider ${t.eyebrow} ${brand ? 'mt-3' : ''}`}>{eyebrow}</p>
      ) : null}
      <h1
        className={`font-display text-3xl font-extrabold tracking-tight drop-shadow-[0_2px_14px_rgba(15,23,42,0.55)] sm:text-5xl lg:text-6xl ${t.title} ${
          brand || eyebrow ? 'mt-3' : ''
        }`}
      >
        {title}
      </h1>
      {description ? (
        <p className={`mx-auto mt-4 max-w-2xl text-base sm:text-lg ${t.description} ${centered ? '' : 'mx-0'}`}>{description}</p>
      ) : null}
    </div>
  );
}
