'use client';

import { CalendarDays, Search } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { CityPicker } from '@/components/CityPicker.client';
import { HeroLayout } from '@/components/HeroLayout';
import { HeroMedia } from '@/components/HeroMedia.client';
import { ScrollRail } from '@/components/ScrollRail.client';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import type { PublicDestinationDto, PublicLandingDto } from '@daibilet/contracts/public';
import { buildCatalogHref, catalogHrefWithSelectedCity } from '@/lib/catalog-url';
import { cityToPrepositional } from '@/lib/city-declension';
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
  destinations: PublicDestinationDto[];
  frames: HomeHeroFrame[];
  landings?: Array<Pick<PublicLandingDto, 'slug' | 'title' | 'subtitle' | 'events' | 'priceFrom'>>;
  videoSrc?: string | null;
};

export function HomeHero({ destinations, frames, landings = [], videoSrc }: HomeHeroProps) {
  const router = useRouter();
  const selectedCity = useSelectedCityOptional();
  const destination = selectedCity?.cityValue ?? 'all';
  const setDestination = selectedCity?.setCity ?? (() => {});
  const selectedDestination = selectedCity?.selectedDestination ?? null;
  const [heroDate, setHeroDate] = useState('all');

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
      media={<HeroMedia frames={frames} videoSrc={videoSrc} />}
    >
      <form
        onSubmit={onSubmit}
        className="mt-8 w-full max-w-5xl rounded-2xl bg-white p-2 text-left shadow-2xl shadow-slate-950/30"
        aria-label="Поиск билетов"
      >
        {/* City + date + find on all breakpoints. Category lives in soft chip rail. */}
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(120px,0.9fr)_auto]">
          <CityPicker
            cities={destinations}
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

      {/* Soft chip rail: md+ hub discs outside the track; mobile = swipe only. */}
      <ScrollRail
        className="mt-4 w-full max-w-5xl"
        viewportClassName="!overflow-x-auto overscroll-x-contain !pb-0.5"
        hideScrollbar
        arrowAlign="center"
        edgeFade
        aria-label="Быстрые подборки"
      >
        <div
          className="flex w-max flex-nowrap items-center gap-2 px-1 pb-0.5"
          data-home-hero-chips
        >
          {quickChips.map((chip) => {
            let href = chip.href;
            if (chip.href.startsWith('/events')) {
              const params = new URLSearchParams(
                chip.href.includes('?') ? chip.href.slice(chip.href.indexOf('?') + 1) : '',
              );
              href = catalogHrefWithSelectedCity(destination, {
                q: params.get('q') || undefined,
                city: params.get('city') || undefined,
                category: params.get('category') || undefined,
                date: heroDate !== 'all' ? heroDate : params.get('date') || undefined,
                sort: (params.get('sort') as 'popular' | 'time' | undefined) || undefined,
              });
            }
            return (
              <a
                key={chip.label}
                href={href}
                data-rail-item
                className="inline-flex h-8 shrink-0 items-center rounded-full bg-white/20 px-3.5 text-xs font-semibold text-white/95 ring-1 ring-white/35 backdrop-blur-sm transition hover:bg-white/35"
              >
                {chip.label}
              </a>
            );
          })}
        </div>
      </ScrollRail>
    </HeroLayout>
  );
}
