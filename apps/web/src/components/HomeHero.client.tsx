'use client';

import { CalendarDays, Search, Tags } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { CityPicker } from '@/components/CityPicker.client';
import { HeroLayout } from '@/components/HeroLayout';
import { HeroMedia } from '@/components/HeroMedia.client';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { buildCatalogHref, catalogHrefWithSelectedCity } from '@/lib/catalog-url';
import { cityToPrepositional } from '@/lib/city-declension';
import { HERO_QUICK_CHIPS } from '@/lib/home-scenarios';

const HERO_DATE_OPTIONS = [
  { value: 'all', label: 'Любая дата' },
  { value: 'today', label: 'Сегодня' },
  { value: 'tomorrow', label: 'Завтра' },
  { value: 'weekend', label: 'Выходные' },
] as const;

const HERO_CATEGORY_OPTIONS = [
  { value: 'all', label: 'Все категории' },
  { value: 'Экскурсии', label: 'Экскурсии' },
  { value: 'Музеи и арт', label: 'Музеи и арт' },
  { value: 'Концерты', label: 'Концерты' },
  { value: 'Театр', label: 'Театр' },
  { value: 'Стендап', label: 'Стендап' },
  { value: 'Речные прогулки', label: 'Речные прогулки' },
] as const;

export type HomeHeroFrame = { src: string; alt: string };

type HomeHeroProps = {
  destinations: PublicDestinationDto[];
  frames: HomeHeroFrame[];
  videoSrc?: string | null;
};

export function HomeHero({ destinations, frames, videoSrc }: HomeHeroProps) {
  const router = useRouter();
  const selectedCity = useSelectedCityOptional();
  const destination = selectedCity?.cityValue ?? 'all';
  const setDestination = selectedCity?.setCity ?? (() => {});
  const selectedDestination = selectedCity?.selectedDestination ?? null;
  const [heroDate, setHeroDate] = useState('all');
  const [heroCategory, setHeroCategory] = useState('all');

  const selectedCityName = selectedDestination?.name || null;

  const openCatalog = () => {
    router.push(
      buildCatalogHref({
        city: destination !== 'all' ? destination : undefined,
        date: heroDate !== 'all' ? heroDate : undefined,
        category: heroCategory !== 'all' ? heroCategory : undefined,
        sort: 'popular',
      }),
    );
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    openCatalog();
  };

  const title = selectedCityName ? (
    <>
      Найдите, куда сходить
      <span className="block text-sky-100">в {cityToPrepositional(selectedCityName)}</span>
    </>
  ) : (
    <>Найдите, куда сходить в эти выходные</>
  );

  return (
    <HeroLayout
      variant={videoSrc ? 'video' : 'imageOverlay'}
      brand="Дайбилет"
      title={title}
      description="Город, дата и категория - и вы в каталоге с актуальными билетами."
      tone="dark"
      media={<HeroMedia frames={frames} videoSrc={videoSrc} />}
    >
      <form
        onSubmit={onSubmit}
        className="mx-auto mt-8 max-w-5xl rounded-2xl bg-white p-2 text-left shadow-2xl shadow-slate-950/30"
      >
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(140px,1.1fr)_minmax(120px,0.85fr)_minmax(140px,1.1fr)_auto]">
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
          <div className="relative">
            <Tags className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={heroCategory}
              onChange={(event) => setHeroCategory(event.target.value)}
              aria-label="Категория"
              className="h-11 w-full appearance-none rounded-xl bg-slate-50 pl-10 pr-8 text-sm font-medium text-slate-800 outline-none hover:bg-slate-100 focus:ring-2 focus:ring-primary/25"
            >
              {HERO_CATEGORY_OPTIONS.map((option) => (
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
            Найти
          </button>
        </div>
      </form>

      <div className="mx-auto mt-4 flex max-w-5xl flex-wrap items-center justify-center gap-2">
        {HERO_QUICK_CHIPS.map((chip) => {
          let href = chip.href;
          if (chip.href.startsWith('/events')) {
            const params = new URLSearchParams(chip.href.includes('?') ? chip.href.slice(chip.href.indexOf('?') + 1) : '');
            href = catalogHrefWithSelectedCity(destination, {
              q: params.get('q') || undefined,
              city: params.get('city') || undefined,
              category: params.get('category') || undefined,
              date: params.get('date') || undefined,
              sort: (params.get('sort') as 'popular' | 'time' | undefined) || undefined,
            });
          }
          return (
            <a
              key={chip.label}
              href={href}
              className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              {chip.label}
            </a>
          );
        })}
      </div>
    </HeroLayout>
  );
}
