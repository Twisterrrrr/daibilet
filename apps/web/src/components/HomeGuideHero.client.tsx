'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Gift,
  Landmark,
  Map as MapIcon,
  MapPin,
  Mic2,
  Music2,
  Route,
  Ship,
  Sparkles,
  Theater,
  type LucideIcon,
} from 'lucide-react';

import { SafeImage } from '@/components/SafeImage.client';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import type { PublicCatalogListItemDto, PublicSessionDto } from '@daibilet/contracts/public';
import { catalogHrefWithSelectedCity, venueCatalogHrefWithSelectedCity } from '@/lib/catalog-url';
import {
  HOME_CATEGORY_CHIPS,
  buildHomeHeroSlides,
  buildMyDayHref,
  type HomeGuideChip,
  type HomeHeroSlide,
} from '@/lib/home-guide';
import { filterSessionsByCity } from '@/lib/landing-city';

const ICON_MAP: Record<HomeGuideChip['icon'], LucideIcon> = {
  mic: Mic2,
  music: Music2,
  ship: Ship,
  map: MapIcon,
  calendar: CalendarDays,
  gift: Gift,
  sparkles: Sparkles,
  landmark: Landmark,
  pin: MapPin,
  route: Route,
  theater: Theater,
};

/** Auto-advance interval for the event afisha carousel. */
const HERO_AUTO_ROTATE_MS = 2_000;

type PublicSession = PublicSessionDto | PublicCatalogListItemDto;

type HomeGuideHeroProps = {
  sessions: PublicSession[];
  fingerprints?: Record<string, string>;
};

function chipHref(chip: HomeGuideChip, cityValue: string, citySlug?: string | null): string {
  if (chip.href.startsWith('/events')) {
    const qs = chip.href.includes('?') ? chip.href.slice(chip.href.indexOf('?') + 1) : '';
    const params = new URLSearchParams(qs);
    return catalogHrefWithSelectedCity(cityValue, {
      q: params.get('q') || undefined,
      category: params.get('category') || undefined,
      date: params.get('date') || undefined,
      sort: (params.get('sort') as 'popular' | 'time' | undefined) || undefined,
      minPrice: params.has('minPrice') ? Number(params.get('minPrice')) : undefined,
      maxPrice: params.has('maxPrice') ? Number(params.get('maxPrice')) : undefined,
    });
  }
  if (chip.href === '/locations' || chip.href.startsWith('/locations?')) {
    return venueCatalogHrefWithSelectedCity('/locations', cityValue);
  }
  if (chip.href === '/my-day' || chip.href.startsWith('/my-day')) {
    return buildMyDayHref(citySlug);
  }
  return chip.href;
}

function slideHref(slide: HomeHeroSlide, cityValue: string): string {
  if (slide.href.startsWith('/events?') || slide.href === '/events') {
    const qs = slide.href.includes('?') ? slide.href.slice(slide.href.indexOf('?') + 1) : '';
    const params = new URLSearchParams(qs);
    return catalogHrefWithSelectedCity(cityValue, {
      q: params.get('q') || undefined,
      category: params.get('category') || undefined,
      date: params.get('date') || undefined,
      sort: (params.get('sort') as 'popular' | 'time' | undefined) || undefined,
      minPrice: params.has('minPrice') ? Number(params.get('minPrice')) : undefined,
      maxPrice: params.has('maxPrice') ? Number(params.get('maxPrice')) : undefined,
    });
  }
  return slide.href;
}

function HeroSlideCard({
  slide,
  href,
  priority,
  asHeading = 'h2',
}: {
  slide: HomeHeroSlide;
  href: string;
  priority?: boolean;
  asHeading?: 'h1' | 'h2';
}) {
  const TitleTag = asHeading;
  return (
    <Link
      href={href}
      className="group relative flex h-full min-h-[200px] w-full flex-col overflow-hidden rounded-2xl bg-slate-900 text-white shadow-card md:min-h-[240px] lg:min-h-[280px]"
    >
      <SafeImage
        src={slide.imageUrl}
        alt=""
        fill
        priority={priority}
        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 100vw, 1200px"
        className="object-cover transition duration-500 group-hover:scale-[1.03]"
        fallback={<div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-neutral-800" />}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/45 to-slate-900/10" />
      <div className="relative z-[1] mt-auto flex flex-col justify-end p-5 sm:p-6 md:p-7 lg:p-8">
        <span className="inline-flex w-fit rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
          {slide.badge}
        </span>
        <TitleTag className="mt-3 max-w-2xl font-display text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl md:text-[1.85rem] lg:text-4xl">
          {slide.title}
        </TitleTag>
        <p className="mt-2 max-w-xl text-sm text-white/85 sm:text-base">{slide.subtitle}</p>
        <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-primary-700 shadow-sm transition group-hover:bg-sky-50 md:mt-5">
          {slide.ctaLabel}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

/**
 * Personal-guide hero: full-width afisha event carousel + category rail.
 * My Day lives in bottom nav / chips - not as a sibling panel here.
 */
export function HomeGuideHero({ sessions, fingerprints }: HomeGuideHeroProps) {
  const selectedCity = useSelectedCityOptional();
  const cityReady = selectedCity?.cityReady ?? false;
  const cityValue = cityReady ? selectedCity?.cityValue ?? 'all' : 'all';
  const cityName =
    cityValue !== 'all'
      ? selectedCity?.selectedDestination?.name ||
        (selectedCity?.cityLabel !== 'Все города' ? selectedCity?.cityLabel : null)
      : null;
  const citySlug = selectedCity?.selectedDestination?.slug || null;

  const fingerprintMap = useMemo(
    () => new Map(Object.entries(fingerprints || {})),
    [fingerprints],
  );

  const scopedSessions = useMemo(() => {
    if (!cityReady || !cityName || cityValue === 'all') return sessions;
    return filterSessionsByCity(sessions as PublicSessionDto[], cityName, citySlug) as PublicSession[];
  }, [sessions, cityReady, cityName, citySlug, cityValue]);

  const safeSlides = useMemo(
    () => buildHomeHeroSlides(scopedSessions, { fingerprints: fingerprintMap }),
    [scopedSessions, fingerprintMap],
  );

  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const syncActive = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || !safeSlides.length) return;
    const children = Array.from(el.children) as HTMLElement[];
    if (!children.length) return;
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    children.forEach((child, index) => {
      const center = child.offsetLeft + child.offsetWidth / 2;
      const dist = Math.abs(center - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = index;
      }
    });
    activeIndexRef.current = best;
    setActiveIndex(best);
  }, [safeSlides.length]);

  const goTo = useCallback(
    (index: number, behavior: ScrollBehavior = 'smooth') => {
      const el = scrollerRef.current;
      if (!el) return;
      const count = safeSlides.length;
      if (!count) return;
      const next = ((index % count) + count) % count;
      const child = el.children[next] as HTMLElement | undefined;
      if (!child) return;
      el.scrollTo({ left: child.offsetLeft, behavior });
      activeIndexRef.current = next;
      setActiveIndex(next);
    },
    [safeSlides.length],
  );

  useEffect(() => {
    activeIndexRef.current = 0;
    setActiveIndex(0);
    const el = scrollerRef.current;
    if (el) el.scrollTo({ left: 0 });
  }, [cityValue, safeSlides.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    syncActive();
    el.addEventListener('scroll', syncActive, { passive: true });
    window.addEventListener('resize', syncActive, { passive: true });
    return () => {
      el.removeEventListener('scroll', syncActive);
      window.removeEventListener('resize', syncActive);
    };
  }, [syncActive]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Auto-rotate every 2s; pause on hover/focus/touch; off when prefers-reduced-motion.
  useEffect(() => {
    if (safeSlides.length <= 1 || paused || reduceMotion) return;
    const id = window.setInterval(() => {
      goTo(activeIndexRef.current + 1);
    }, HERO_AUTO_ROTATE_MS);
    return () => window.clearInterval(id);
  }, [safeSlides.length, paused, reduceMotion, goTo]);

  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);

  return (
    <section className="border-b border-slate-200/70 bg-gradient-to-b from-sky-50/70 via-neutral-50 to-neutral-50">
      <div className="container-page py-4 sm:py-5 md:py-6 lg:py-7">
        {/* Full-width featured event carousel */}
        <div className="min-w-0">
          {safeSlides.length <= 1 ? (
            safeSlides[0] ? (
              <div className="min-h-[200px] md:min-h-[240px] lg:min-h-[280px]">
                <HeroSlideCard
                  slide={safeSlides[0]}
                  href={slideHref(safeSlides[0], cityValue)}
                  priority
                  asHeading="h1"
                />
              </div>
            ) : null
          ) : (
            <div
              className="relative min-h-[200px] md:min-h-[240px] lg:min-h-[280px]"
              onMouseEnter={pause}
              onMouseLeave={resume}
              onFocusCapture={pause}
              onBlurCapture={(event) => {
                const next = event.relatedTarget as Node | null;
                if (next && event.currentTarget.contains(next)) return;
                resume();
              }}
              onTouchStart={pause}
              onTouchEnd={resume}
            >
              <div
                ref={scrollerRef}
                className="flex h-full gap-3 overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="region"
                aria-roledescription="carousel"
                aria-label="Афиша событий"
              >
                {safeSlides.map((slide, index) => (
                  <div
                    key={slide.id}
                    className="w-full shrink-0 snap-start"
                    aria-roledescription="slide"
                    aria-label={`${index + 1} из ${safeSlides.length}`}
                    aria-hidden={index !== activeIndex}
                  >
                    <HeroSlideCard
                      slide={slide}
                      href={slideHref(slide, cityValue)}
                      priority={index === 0}
                      asHeading={index === 0 ? 'h1' : 'h2'}
                    />
                  </div>
                ))}
              </div>
              <button
                type="button"
                aria-label="Предыдущий слайд"
                onClick={() => goTo(activeIndex - 1)}
                className="absolute left-2 top-1/2 z-[2] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-sm backdrop-blur-sm transition hover:bg-white md:left-3 md:h-10 md:w-10"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Следующий слайд"
                onClick={() => goTo(activeIndex + 1)}
                className="absolute right-2 top-1/2 z-[2] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-sm backdrop-blur-sm transition hover:bg-white md:right-3 md:h-10 md:w-10"
              >
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
            </div>
          )}
        </div>

        {/* Desktop category rail - equal flex across full container width */}
        <div
          className="mt-5 hidden w-full gap-2 lg:flex lg:gap-2.5 xl:gap-3"
          role="navigation"
          aria-label="Категории"
        >
          {HOME_CATEGORY_CHIPS.map((chip) => {
            const Icon = ICON_MAP[chip.icon];
            return (
              <Link
                key={chip.id}
                href={chipHref(chip, cityValue, citySlug)}
                className="flex min-w-0 flex-1 flex-col items-center gap-2 rounded-2xl bg-white px-1.5 py-3.5 text-center shadow-card ring-1 ring-slate-200/70 transition hover:ring-primary/35 hover:shadow-card-hover md:px-2 lg:py-3.5"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-50 to-sky-50 text-primary-600 xl:h-11 xl:w-11">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-slate-800 xl:text-xs">
                  {chip.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
