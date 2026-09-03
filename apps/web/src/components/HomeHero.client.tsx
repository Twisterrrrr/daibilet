'use client';

import { CalendarDays, Search } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { CityPicker } from '@/components/CityPicker.client';
import { HeroLayout } from '@/components/HeroLayout';
import { HeroMedia } from '@/components/HeroMedia.client';
import { ScrollRail } from '@/components/ScrollRail.client';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import type { PublicDestinationDto, PublicLandingDto } from '@daibilet/contracts/public';
import { buildCatalogHref, catalogHrefWithSelectedCity } from '@/lib/catalog-url';
import { cityToPrepositional } from '@/lib/city-declension';
import {
  HOME_HERO_IMAGES,
  homeHeroObjectPositionClass,
  objectPositionForHeroSrc,
} from '@/lib/home-hero-images';
import { buildHomeHeroQuickChips } from '@/lib/home-scenarios';
import { normalizeKnownCitySlug } from '@/lib/landing-routes';

const HERO_DATE_OPTIONS = [
  { value: 'all', label: 'Любая дата' },
  { value: 'today', label: 'Сегодня' },
  { value: 'tomorrow', label: 'Завтра' },
  { value: 'weekend', label: 'Выходные' },
] as const;

export type HomeHeroFrame = { src: string; alt: string; objectPosition?: string };

type HomeHeroProps = {
  /** Prefer SelectedCityProvider destinations to avoid duplicating the layout payload. */
  destinations?: PublicDestinationDto[];
  /** LCP frame(s) for SSR; rotator may expand client-side from the static pool. */
  frames: HomeHeroFrame[];
  /**
   * When true (default), after mount append the static emotion pool if SSR only
   * sent one frame (WEB.LIGHT.A2 - keep residual frames out of RSC HTML).
   */
  expandStaticRotator?: boolean;
  landings?: Array<Pick<PublicLandingDto, 'slug' | 'title' | 'events' | 'priceFrom'> & { subtitle?: string }>;
  videoSrc?: string | null;
};

export function HomeHero({
  destinations,
  frames,
  expandStaticRotator = true,
  landings = [],
  videoSrc,
}: HomeHeroProps) {
  const router = useRouter();
  const selectedCity = useSelectedCityOptional();
  const destination = selectedCity?.cityValue ?? 'all';
  const setDestination = selectedCity?.setCity ?? (() => {});
  const selectedDestination = selectedCity?.selectedDestination ?? null;
  const pickerDestinations = destinations?.length
    ? destinations
    : selectedCity?.destinations ?? [];
  const [heroDate, setHeroDate] = useState('all');
  const [mediaFrames, setMediaFrames] = useState(frames);

  useEffect(() => {
    setMediaFrames(frames);
  }, [frames]);

  useEffect(() => {
    if (!expandStaticRotator || videoSrc || frames.length !== 1) return;
    const lcpSrc = frames[0]?.src?.trim();
    if (!lcpSrc) return;
    // Idle: grow rotator from the static pool without bloating SSR flight.
    const expand = () => {
      const poolFrames: HomeHeroFrame[] = HOME_HERO_IMAGES.map((image) => ({
        src: image.landscape,
        alt: image.alt,
        objectPosition: homeHeroObjectPositionClass(image),
      }));
      const rest = poolFrames.filter((frame) => frame.src !== lcpSrc);
      if (!rest.length) return;
      setMediaFrames([
        {
          ...frames[0]!,
          objectPosition: frames[0]!.objectPosition || objectPositionForHeroSrc(lcpSrc),
        },
        ...rest,
      ]);
    };
    if (typeof window === 'undefined') return;
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof win.requestIdleCallback === 'function') {
      const id = win.requestIdleCallback(expand, { timeout: 2500 });
      return () => win.cancelIdleCallback?.(id);
    }
    const timer = window.setTimeout(expand, 400);
    return () => window.clearTimeout(timer);
  }, [expandStaticRotator, frames, videoSrc]);

  const selectedCityName = selectedDestination?.name || null;
  const citySlug =
    normalizeKnownCitySlug(selectedDestination?.slug) ||
    normalizeKnownCitySlug(selectedDestination?.sourceSlug) ||
    (destination !== 'all' ? normalizeKnownCitySlug(destination) || destination : null);

  const quickChips = useMemo(
    () =>
      buildHomeHeroQuickChips({
        citySlug,
        landings,
        hubTags: selectedDestination?.hubTags,
        categories: selectedDestination?.categories,
      }),
    [citySlug, landings, selectedDestination?.categories, selectedDestination?.hubTags],
  );

  const openCatalog = (category?: string) => {
    router.push(
      buildCatalogHref({
        city: destination !== 'all' ? destination : undefined,
        date: heroDate !== 'all' ? heroDate : undefined,
        category: category || undefined,
        sort: 'popular',
      }),
    );
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    openCatalog();
  };

  const resolveChipHref = (chipHref: string) => {
    if (!chipHref.startsWith('/events')) return chipHref;
    const params = new URLSearchParams(
      chipHref.includes('?') ? chipHref.slice(chipHref.indexOf('?') + 1) : '',
    );
    return catalogHrefWithSelectedCity(destination, {
      q: params.get('q') || undefined,
      city: params.get('city') || undefined,
      category: params.get('category') || undefined,
      date: heroDate !== 'all' ? heroDate : params.get('date') || undefined,
      sort: (params.get('sort') as 'popular' | 'time' | undefined) || undefined,
    });
  };

  const chipClassName =
    'inline-flex h-8 items-center rounded-full border border-white/20 bg-white/15 px-3.5 text-xs font-semibold text-white backdrop-blur-[10px] transition hover:bg-white/25';

  // City and national share the same lead line so «музеи» does not disappear when a city is selected.
  const title = selectedCityName ? (
    <>
      <span className="block">Экскурсии, музеи и мероприятия</span>
      <span className="block bg-gradient-to-r from-sky-200 to-white bg-clip-text text-transparent">
        в {cityToPrepositional(selectedCityName)}
      </span>
    </>
  ) : (
    <>
      <span className="block">Экскурсии, музеи и мероприятия</span>
      <span className="block bg-gradient-to-r from-sky-200 to-white bg-clip-text text-transparent">
        в городах России
      </span>
    </>
  );

  return (
    <HeroLayout
      variant={videoSrc ? 'video' : 'imageOverlay'}
      brand="Дайбилет"
      title={title}
      tone="dark"
      // Base layer under images (legacy navy placeholder while frames load) - not a blue wash on top of photos.
      className="!bg-[#122868]"
      media={<HeroMedia frames={mediaFrames} videoSrc={videoSrc} />}
    >
      <form
        onSubmit={onSubmit}
        className="mt-8 w-full max-w-5xl rounded-2xl bg-white p-2 text-left shadow-2xl shadow-slate-950/30"
        aria-label="Поиск билетов"
      >
        {/* City + date + find on all breakpoints. Category lives in soft chip rail. */}
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(120px,0.9fr)_auto]">
          <CityPicker
            cities={pickerDestinations}
            value={destination}
            onChange={setDestination}
            allLabel="Город"
            variant="hero"
          />
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={heroDate}
              onChange={(event) => setHeroDate(event.target.value)}
              aria-label="Дата"
              className="h-11 w-full appearance-none rounded-xl bg-slate-50 pl-10 pr-8 text-sm font-medium text-slate-800 outline-none hover:bg-slate-100 focus:ring-2 focus:ring-primary/25"
            >
              {HERO_DATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98]"
          >
            <Search className="h-4 w-4" />
            Найти билеты
          </button>
        </div>
      </form>

      {/* Mobile: swipe rail. Desktop: wrap up to ~2 rows, no side arrows. */}
      <div className="mt-4 w-full max-w-5xl" data-home-hero-chips>
        <ScrollRail
          className="md:hidden"
          viewportClassName="!overflow-x-auto overscroll-x-contain !pb-0.5"
          hideScrollbar
          edgeFade
          aria-label="Быстрые подборки"
        >
          <div className="flex w-max flex-nowrap items-center gap-2 px-1 pb-0.5">
            {quickChips.map((chip) => (
              <a
                key={chip.label}
                href={resolveChipHref(chip.href)}
                data-rail-item
                className={`${chipClassName} shrink-0`}
              >
                {chip.label}
              </a>
            ))}
          </div>
        </ScrollRail>
        <div
          className="hidden flex-wrap justify-center gap-2 md:flex"
          aria-label="Быстрые подборки"
        >
          {quickChips.map((chip) => (
            <a key={chip.label} href={resolveChipHref(chip.href)} className={chipClassName}>
              {chip.label}
            </a>
          ))}
        </div>
      </div>
    </HeroLayout>
  );
}
