import Link from 'next/link';

import { DaibiletLogo } from '@/components/DaibiletLogo';
import { CITY_NIGHT_HERO } from '@/lib/city-night-hero';

/**
 * Paintable chrome for Suspense / route loading.
 * Must stay free of useSearchParams / city context so static HTML can include it
 * (CSR bailout fallback previously rendered only site-header-spacer = blank 2-3s).
 *
 * `city` variant: fixed night-hero shell matching CityPageView (no CLS on soft-nav).
 */
export function SiteChromeSkeleton({
  variant = 'page',
}: {
  variant?: 'page' | 'header-only' | 'city';
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/70 bg-white/95 pt-[env(safe-area-inset-top,0px)] shadow-[0_1px_0_hsl(210_9%_11%/0.03)] backdrop-blur-md supports-[backdrop-filter]:bg-white/90">
        <div className="container-page flex min-h-[var(--site-header-height)] items-center justify-between gap-2 py-2.5 sm:gap-3 sm:py-3 lg:py-3.5">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 rounded-lg bg-slate-100 lg:hidden" aria-hidden />
            <Link href="/" className="inline-flex shrink-0 items-center" aria-label="Дайбилет - на главную">
              <DaibiletLogo textClassName="text-lg sm:text-xl lg:text-2xl" />
            </Link>
            <span className="hidden h-9 w-28 rounded-lg bg-slate-100 lg:block" aria-hidden />
          </div>
          <nav aria-hidden className="hidden items-center gap-2 lg:flex">
            <span className="h-4 w-14 rounded bg-slate-100" />
            <span className="h-4 w-14 rounded bg-slate-100" />
            <span className="h-4 w-16 rounded bg-slate-100" />
            <span className="h-4 w-16 rounded bg-slate-100" />
          </nav>
          <div className="flex shrink-0 items-center gap-1.5" aria-hidden>
            <span className="hidden h-10 w-10 rounded-lg bg-slate-100 lg:block" />
            <span className="hidden h-10 w-10 rounded-lg bg-slate-100 lg:block" />
            <span className="h-10 w-10 rounded-lg bg-slate-100" />
          </div>
        </div>
      </header>
      <div aria-hidden="true" className="site-header-spacer" />
      {variant === 'header-only' ? null : (
        <main className="flex-1" aria-busy="true" aria-label="Загрузка">
          {variant === 'city' ? <CityNightHeroSkeleton /> : <GenericPageSkeleton />}
        </main>
      )}
    </div>
  );
}

function CityNightHeroSkeleton() {
  return (
    <>
      <div className="border-b border-slate-200 bg-white">
        <div className="container-page flex min-h-11 items-center gap-1.5 py-3" aria-hidden>
          <span className="h-3 w-16 animate-pulse rounded bg-slate-200/80" />
          <span className="h-3 w-3 rounded bg-slate-100" />
          <span className="h-3 w-24 animate-pulse rounded bg-slate-200/70" />
        </div>
      </div>
      <section className={CITY_NIGHT_HERO.section}>
        <div
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
          style={{ backgroundColor: CITY_NIGHT_HERO.navy }}
          aria-hidden
        >
          {/* HERO3n: leftGrad → 16:9 photo + soft edge fade md-only → right gutter. No alpha-mask. */}
          <div
            className={CITY_NIGHT_HERO.leftFillDesktop}
            style={{ backgroundImage: CITY_NIGHT_HERO.fadeLeftDesktop }}
          />
          <div className={`${CITY_NIGHT_HERO.photoFrame} bg-white/[0.06]`}>
            <div
              className={CITY_NIGHT_HERO.photoEdgeFade}
              style={{ backgroundImage: CITY_NIGHT_HERO.fadePhotoEdges }}
            />
          </div>
          <div
            className="absolute inset-0 md:hidden"
            style={{ backgroundImage: CITY_NIGHT_HERO.fadeLeftMobile }}
          />
          <div
            className={CITY_NIGHT_HERO.rightGutter}
            style={{ backgroundImage: CITY_NIGHT_HERO.fadeRightGutter }}
          />
        </div>
        <div className={CITY_NIGHT_HERO.content}>
          <div className={CITY_NIGHT_HERO.contentInner}>
            <div className="h-10 max-w-md animate-pulse rounded bg-white/22 sm:h-12" />
            <div className="mt-3 h-4 max-w-xl animate-pulse rounded bg-white/16" />
            <div className="mt-2 h-4 max-w-lg animate-pulse rounded bg-white/12" />
            <div className="mt-5 md:mt-3 flex gap-3">
              <span className="h-11 w-44 animate-pulse rounded-lg bg-white/24" />
              <span className="h-11 w-36 animate-pulse rounded-lg bg-white/12" />
            </div>
          </div>
        </div>
      </section>
      <div className="container-page section-y">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-200/80" />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="aspect-[4/3] animate-pulse rounded-2xl bg-slate-200/70" />
          ))}
        </div>
      </div>
    </>
  );
}

function GenericPageSkeleton() {
  return (
    <>
      <div className="border-b border-slate-100 bg-slate-50/80">
        <div className="container-page py-10 sm:py-14">
          <div className="h-8 w-2/3 max-w-md animate-pulse rounded-lg bg-slate-200/90 sm:h-10" />
          <div className="mt-3 h-4 w-1/2 max-w-sm animate-pulse rounded bg-slate-200/70" />
          <div className="mt-8 flex flex-wrap gap-2">
            <span className="h-10 w-28 animate-pulse rounded-lg bg-slate-200/80" />
            <span className="h-10 w-36 animate-pulse rounded-lg bg-slate-200/60" />
          </div>
        </div>
      </div>
      <div className="container-page section-y">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-200/80" />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="aspect-[4/3] animate-pulse rounded-2xl bg-slate-200/70" />
          ))}
        </div>
      </div>
    </>
  );
}
