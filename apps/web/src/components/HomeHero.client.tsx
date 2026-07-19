'use client';

import { CalendarDays, Landmark, MapPin, Search, Ticket } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { CityPicker } from '@/components/CityPicker.client';
import { HomeHeroBackground } from '@/components/HomeHeroBackground.client';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { buildCatalogHref, catalogHrefWithSelectedCity } from '@/lib/catalog-url';
import { cityToPrepositional } from '@/lib/city-declension';
import {
  formatNumber,
  formatStatCount,
  isMeaningfulStatCount,
  pluralCities,
  pluralEvents,
  pluralVenues,
  roundStatToTen,
} from '@/lib/format';
import { HERO_QUICK_CHIPS } from '@/lib/home-scenarios';

const HERO_DATE_OPTIONS = [
  { value: 'all', label: 'Любая дата' },
  { value: 'today', label: 'Сегодня' },
  { value: 'tomorrow', label: 'Завтра' },
  { value: 'weekend', label: 'Выходные' },
] as const;

type HomeHeroProps = {
  destinations: PublicDestinationDto[];
  totalEvents: number;
  totalVenues: number;
  cityCount: number;
};

export function HomeHero({ destinations, totalEvents, totalVenues, cityCount }: HomeHeroProps) {
  const router = useRouter();
  const selectedCity = useSelectedCityOptional();
  const destination = selectedCity?.cityValue ?? 'all';
  const setDestination = selectedCity?.setCity ?? (() => {});
  const selectedDestination = selectedCity?.selectedDestination ?? null;
  const [heroQuery, setHeroQuery] = useState('');
  const [heroDate, setHeroDate] = useState('all');

  const selectedCityName = selectedDestination?.name || null;

  const openCatalog = (extra?: Record<string, string>) => {
    router.push(
      buildCatalogHref({
        q: heroQuery.trim() || undefined,
        city: destination !== 'all' ? destination : undefined,
        date: heroDate !== 'all' ? heroDate : undefined,
        sort: extra?.sort as 'popular' | 'time' | undefined,
        ...extra,
      }),
    );
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    openCatalog({ sort: 'popular' });
  };

  return (
    <section className="relative overflow-hidden bg-slate-900">
      <HomeHeroBackground />
      <div className="container-page relative pb-12 pt-12 sm:pb-16 sm:pt-16">
        <div className="mx-auto max-w-3xl text-center drop-shadow-[0_2px_14px_rgba(15,23,42,0.55)]">
          <HomeHeroStats
            selectedCityName={selectedCityName}
            selectedDestination={selectedDestination}
            totalEvents={totalEvents}
            totalVenues={totalVenues}
            cityCount={cityCount}
          />
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            {selectedCityName ? (
              <>
                Экскурсии и события
                <span className="block bg-gradient-to-r from-sky-200 to-white bg-clip-text text-transparent">
                  в {cityToPrepositional(selectedCityName)}
                </span>
              </>
            ) : (
              <>
                Экскурсии, музеи и мероприятия
                <span className="block bg-gradient-to-r from-sky-200 to-white bg-clip-text text-transparent">
                  в городах России
                </span>
              </>
            )}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/85 sm:text-lg">
            Найдите, куда сходить сегодня, завтра или на выходных — от речных прогулок и музеев до концертов и авторских экскурсий.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mx-auto mt-8 max-w-5xl rounded-2xl bg-white p-2 shadow-2xl shadow-slate-950/30">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(140px,1fr)_minmax(130px,0.8fr)_minmax(0,1.6fr)_auto]">
            <CityPicker
              cities={destinations}
              value={destination}
              onChange={setDestination}
              allLabel="Куда поедете?"
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
            <label className="relative flex items-center">
              <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={heroQuery}
                onChange={(event) => setHeroQuery(event.target.value)}
                placeholder="Экскурсия, музей, теплоход, концерт..."
                className="h-11 w-full rounded-xl bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-primary/25"
              />
            </label>
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
      </div>
    </section>
  );
}

function HomeHeroStats({
  selectedCityName,
  selectedDestination,
  totalEvents,
  totalVenues,
  cityCount,
}: {
  selectedCityName?: string | null;
  selectedDestination?: PublicDestinationDto | null;
  totalEvents: number;
  totalVenues: number;
  cityCount: number;
}) {
  if (selectedCityName && selectedDestination) {
    const cityEvents = roundStatToTen(selectedDestination.events);
    const cityVenues = roundStatToTen(selectedDestination.venues);
    if (!isMeaningfulStatCount(cityEvents, 1)) return null;
    return (
      <div className="mx-auto mb-4 flex flex-wrap items-center justify-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
          <Ticket className="h-4 w-4 shrink-0" />
          {formatStatCount(cityEvents)} {pluralEventsLabel(cityEvents)} в {cityToPrepositional(selectedCityName)}
        </span>
        {isMeaningfulStatCount(cityVenues, 1) ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
            <Landmark className="h-4 w-4 shrink-0" />
            {formatStatCount(cityVenues)} {pluralVenuesLabel(cityVenues)}
          </span>
        ) : null}
      </div>
    );
  }

  const roundedEvents = roundStatToTen(totalEvents);
  const roundedVenues = roundStatToTen(totalVenues);
  const showEvents = isMeaningfulStatCount(roundedEvents, 1);
  const showVenues = isMeaningfulStatCount(roundedVenues, 1);
  const showCities = cityCount >= 3;
  if (!showEvents && !showVenues && !showCities) return null;

  return (
    <div className="mx-auto mb-4 flex flex-wrap items-center justify-center gap-3">
      {showEvents ? (
        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
          <Ticket className="h-4 w-4 shrink-0" />
          {formatStatCount(roundedEvents)} {pluralEventsLabel(roundedEvents)}
        </span>
      ) : null}
      {showVenues ? (
        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
          <Landmark className="h-4 w-4 shrink-0" />
          {formatStatCount(roundedVenues)} {pluralVenuesLabel(roundedVenues)}
        </span>
      ) : null}
      {showCities ? (
        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
          <MapPin className="h-4 w-4 shrink-0" />
          {formatNumber(cityCount)} {pluralCitiesLabel(cityCount)}
        </span>
      ) : null}
    </div>
  );
}

function pluralEventsLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'событий';
  if (mod10 === 1) return 'событие';
  if (mod10 >= 2 && mod10 <= 4) return 'события';
  return 'событий';
}

function pluralCitiesLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'городов';
  if (mod10 === 1) return 'город';
  if (mod10 >= 2 && mod10 <= 4) return 'города';
  return 'городов';
}

function pluralVenuesLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'площадок';
  if (mod10 === 1) return 'площадка';
  if (mod10 >= 2 && mod10 <= 4) return 'площадки';
  return 'площадок';
}
