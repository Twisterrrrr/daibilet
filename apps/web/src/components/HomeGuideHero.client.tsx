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
  Gift,
  Landmark,
  Map as MapIcon,
  Mic2,
  Route,
  Ship,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

import { SafeImage } from '@/components/SafeImage.client';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import type { PublicCatalogListItemDto, PublicSessionDto } from '@daibilet/contracts/public';
import { catalogHrefWithSelectedCity } from '@/lib/catalog-url';
import { cityToPrepositional } from '@/lib/city-declension';
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
  ship: Ship,
  map: MapIcon,
  calendar: CalendarDays,
  gift: Gift,
  sparkles: Sparkles,
  landmark: Landmark,
};

type PublicSession = PublicSessionDto | PublicCatalogListItemDto;

type HomeGuideHeroProps = {
  sessions: PublicSession[];
  fingerprints?: Record<string, string>;
};

function chipHref(chip: HomeGuideChip, cityValue: string): string {
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
      className="group relative flex h-full min-h-[200px] w-full flex-col overflow-hidden rounded-2xl bg-slate-900 text-white shadow-card md:min-h-[240px] lg:min-h-[260px]"
    >
      <SafeImage
        src={slide.imageUrl}
        alt=""
        fill
        priority={priority}
        sizes="(max-width: 768px) 92vw, (max-width: 1024px) 66vw, 55vw"
        className="object-cover transition duration-500 group-hover:scale-[1.03]"
        fallback={<div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-neutral-800" />}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/45 to-slate-900/10" />
      <div className="relative z-[1] mt-auto flex flex-col justify-end p-5 sm:p-6 md:p-6 lg:p-7">
        <span className="inline-flex w-fit rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
          {slide.badge}
        </span>
        <TitleTag className="mt-3 max-w-xl font-display text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl md:text-[1.75rem] lg:text-3xl">
          {slide.title}
        </TitleTag>
        <p className="mt-2 max-w-lg text-sm text-white/85 sm:text-base md:text-sm lg:text-base">{slide.subtitle}</p>
        <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-primary-700 shadow-sm transition group-hover:bg-sky-50 md:mt-5">
          {slide.ctaLabel}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

/**
 * Personal-guide hero: desktop bento (afisha carousel 2/3 + Мой день 1/3) + category rail.
 * Mobile: horizontal snap carousel of real events + compact my-day CTA (stories live above).
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
  const myDayHref = buildMyDayHref(citySlug);

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
  const [activeIndex, setActiveIndex] = useState(0);

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
    setActiveIndex(best);
  }, [safeSlides.length]);

  useEffect(() => {
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

  const goTo = (index: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const child = el.children[index] as HTMLElement | undefined;
    if (!child) return;
    el.scrollTo({ left: child.offsetLeft, behavior: 'smooth' });
  };

  return (
    <section className="border-b border-slate-200/70 bg-gradient-to-b from-sky-50/70 via-neutral-50 to-neutral-50">
      <div className="container-page py-4 sm:py-5 md:py-6 lg:py-7">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:items-stretch md:gap-4">
          {/* Featured event carousel - 2/3 on md+ */}
          <div className="flex min-w-0 flex-col md:col-span-2 md:h-full">
            {safeSlides.length <= 1 ? (
              safeSlides[0] ? (
                <div className="min-h-[200px] flex-1 md:min-h-[240px] lg:min-h-[260px]">
                  <HeroSlideCard
                    slide={safeSlides[0]}
                    href={slideHref(safeSlides[0], cityValue)}
                    priority
                    asHeading="h1"
                  />
                </div>
              ) : null
            ) : (
              <>
                <div
                  ref={scrollerRef}
                  className="flex min-h-[200px] flex-1 gap-3 overflow-x-auto snap-x snap-mandatory md:min-h-[240px] lg:min-h-[260px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  role="region"
                  aria-roledescription="carousel"
                  aria-label="Афиша событий"
                >
                  {safeSlides.map((slide, index) => (
                    <div
                      key={slide.id}
                      className="w-[min(100%,calc(100%-1.25rem))] shrink-0 snap-start sm:w-[min(100%,calc(100%-1.5rem))] md:w-full md:shrink-0"
                      aria-roledescription="slide"
                      aria-label={`${index + 1} из ${safeSlides.length}`}
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
                <div className="mt-3 flex items-center justify-center gap-1.5" role="tablist" aria-label="Слайды афиши">
                  {safeSlides.map((slide, index) => (
                    <button
                      key={slide.id}
                      type="button"
                      role="tab"
                      aria-selected={index === activeIndex}
                      aria-label={`Слайд ${index + 1}: ${slide.title}`}
                      onClick={() => goTo(index)}
                      className={
                        index === activeIndex
                          ? 'h-2 w-5 rounded-full bg-primary-600 transition-all'
                          : 'h-2 w-2 rounded-full bg-slate-300 transition-all hover:bg-slate-400'
                      }
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* My Day - 1/3 on md+, same stretch height as banner cell */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-600 to-sky-500 p-5 text-white shadow-card sm:p-6 md:col-span-1 md:h-full md:min-h-[240px] md:p-6 lg:min-h-[260px] lg:p-7">
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-sky-300/25 blur-2xl"
              aria-hidden
            />
            <div className="pointer-events-none absolute -bottom-10 left-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" aria-hidden />
            <div className="relative z-[1]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm">
                <Route className="h-3.5 w-3.5" aria-hidden />
                Мой день
              </span>
              <h2 className="mt-3 font-display text-xl font-bold leading-snug tracking-tight sm:text-2xl md:text-xl lg:text-[1.55rem]">
                {cityName
                  ? `Соберите маршрут в ${cityToPrepositional(cityName)}`
                  : 'Соберите свой день в городе'}
              </h2>
              <p className="mt-2 text-sm text-white/85 md:text-[13px] lg:text-sm">
                Музеи, прогулки и события по порядку - без хаоса в заметках.
              </p>
            </div>
            <div className="relative z-[1] mt-5 flex flex-col gap-2 sm:mt-6 md:mt-auto md:pt-4">
              <Link
                href={myDayHref}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-primary-700 shadow-sm transition hover:bg-sky-50"
              >
                Собрать маршрут
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href={myDayHref}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/35 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                Спланировать выходной
              </Link>
            </div>
          </div>
        </div>

        {/* Desktop category carousel */}
        <div
          className="mt-5 hidden gap-3 overflow-x-auto pb-1 snap-x snap-mandatory lg:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="navigation"
          aria-label="Категории"
        >
          {HOME_CATEGORY_CHIPS.map((chip) => {
            const Icon = ICON_MAP[chip.icon];
            return (
              <Link
                key={chip.id}
                href={chipHref(chip, cityValue)}
                className="flex w-[7.75rem] shrink-0 snap-start flex-col items-center gap-2 rounded-2xl bg-white px-3 py-3.5 text-center shadow-card ring-1 ring-slate-200/70 transition hover:ring-primary/35 hover:shadow-card-hover"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-50 to-sky-50 text-primary-600">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-xs font-semibold leading-tight text-slate-800">{chip.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
