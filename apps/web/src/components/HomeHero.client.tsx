'use client';

import { CalendarDays, Search } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { CityPicker } from '@/components/CityPicker.client';
import { HeroLayout } from '@/components/HeroLayout';
import { HeroMedia } from '@/components/HeroMedia.client';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import type { PublicDestinationDto, PublicLandingDto } from '@daibilet/contracts/public';
import { buildCatalogHref } from '@/lib/catalog-url';
import { catalogSocialStats } from '@/lib/catalog-social-stats';
import { cityToPrepositional } from '@/lib/city-declension';
import { formatNumber } from '@/lib/format';
import {
  HOME_HERO_IMAGES,
  homeHeroObjectPositionClass,
} from '@/lib/home-hero-images';
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
  /** Cookie city so H1 / chips match SSR and do not jump after hydrate. */
  ssrCityName?: string | null;
  ssrCitySlug?: string | null;
};

export function HomeHero({
  destinations,
  frames,
  expandStaticRotator = true,
  landings = [],
  videoSrc,
  ssrCityName = null,
  ssrCitySlug = null,
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
        frames[0]!,
        ...rest,
      ]);
    };
    if (typeof window === 'undefined') return;
    // Keep the LCP photo on screen; expanding the pool immediately looks like a glitch.
    const timer = window.setTimeout(expand, 8000);
    return () => window.clearTimeout(timer);
  }, [expandStaticRotator, frames, videoSrc]);

  const selectedCityName =
    selectedDestination?.name ||
    (destination !== 'all' && selectedCity?.cityLabel && selectedCity.cityLabel !== 'Все города'
      ? selectedCity.cityLabel
      : null) ||
    (selectedCity?.cityReady === false ? ssrCityName : null) ||
    (!selectedCity ? ssrCityName : null);
  const citySlug =
    normalizeKnownCitySlug(selectedDestination?.slug) ||
    normalizeKnownCitySlug(selectedDestination?.sourceSlug) ||
    (destination !== 'all' ? normalizeKnownCitySlug(destination) || destination : null) ||
    (selectedCity?.cityReady === false || !selectedCity ? ssrCitySlug : null);

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

  // City-aware H1: personalize by detected city; national = event count.
  const { events: totalEvents, places: totalCities } = catalogSocialStats(destinations);
  const cityTitle = selectedCityName ? (
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
        в {formatNumber(totalCities)} городах России
      </span>
    </>
  );

  return (
    <HeroLayout
      variant={videoSrc ? 'video' : 'imageOverlay'}
      brand="Дайбилет"
      title={cityTitle}
      tone="dark"
      className="!bg-[#122868]"
      media={<HeroMedia frames={mediaFrames} videoSrc={videoSrc} />}
    >
      {/* Social proof strip — live stats from catalog */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm text-white/75 sm:gap-x-5">
        <span>{formatNumber(totalEvents)} событий</span>
        <span className="text-white/30" aria-hidden>·</span>
        <span>{formatNumber(totalCities)} городов</span>
        <span className="text-white/30" aria-hidden>·</span>
        <span>Электронные билеты</span>
      </div>

      {/* H2 value proposition */}
      <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-relaxed text-white/60 sm:text-base">
        Сравните цены, выберите дату и купите билет онлайн без переплат и наценок.
      </p>

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
    </HeroLayout>
  );
}
