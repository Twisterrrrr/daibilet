'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';

import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { fontUnbounded } from '@/lib/fonts';
import { pluralCities, pluralEvents } from '@/lib/format';
import { cityHref } from '@/lib/routes';

function sortCities(list: PublicDestinationDto[]): PublicDestinationDto[] {
  return [...list].sort((a, b) => b.events - a.events || a.name.localeCompare(b.name, 'ru'));
}

/** Превью каталога городов в новом дизайне. Не production - упрощённый поиск без router/URL-sync. */
export function CitiesIndexPreview({ destinations }: { destinations: PublicDestinationDto[] }) {
  const cities = useMemo(
    () => sortCities(destinations.filter((item) => item.type === 'city')),
    [destinations],
  );
  const regions = useMemo(
    () =>
      destinations
        .filter((item) => item.type === 'region' && item.events > 0)
        .sort((a, b) => b.events - a.events || a.name.localeCompare(b.name, 'ru')),
    [destinations],
  );

  const [query, setQuery] = useState('');
  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed ? cities.filter((city) => city.name.toLowerCase().includes(trimmed)) : cities;
  const totalEvents = cities.reduce((sum, city) => sum + city.events, 0);

  return (
    <>
      <section className="border-b border-line bg-gradient-to-b from-accent-soft/70 via-white to-white">
        <div className="container-page max-w-5xl py-14 sm:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Каталог</p>
          <h1
            className={`${fontUnbounded.className} mt-3 text-4xl font-bold tracking-tight text-ink sm:text-5xl`}
          >
            Города России
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-7 text-ink-muted">
            Выберите город для посещения. Билеты на экскурсии, музеи и мероприятия по всей России.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="inline-flex rounded-full bg-accent-soft px-3 py-1.5 text-sm font-semibold text-accent">
              {pluralCities(cities.length)}
            </span>
            <span className="inline-flex rounded-full bg-surface-alt px-3 py-1.5 text-sm font-semibold text-ink-2">
              {pluralEvents(totalEvents)}
            </span>
          </div>
        </div>
      </section>

      <div className="container-page max-w-5xl py-10 sm:py-14">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted-2"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Найти город"
            aria-label="Найти город"
            className="w-full rounded-2xl border border-line bg-white py-3.5 pl-11 pr-4 text-[15px] text-ink outline-none transition-colors placeholder:text-ink-muted-2 focus:border-accent"
          />
        </div>

        {filtered.length ? (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((city) => (
              <Link
                key={`${city.type}:${city.id || city.slug || city.name}`}
                href={cityHref(city)}
                className="group flex flex-col gap-1.5 rounded-2xl border border-line bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-card-hover"
              >
                <span className="font-display text-lg font-bold tracking-tight text-ink group-hover:text-accent">
                  {city.name}
                </span>
                <span className="text-sm text-ink-muted">{pluralEvents(city.events)}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-line py-16 text-center">
            <p className="text-ink-muted">Ничего не найдено</p>
            <button
              type="button"
              onClick={() => setQuery('')}
              className="mt-2 text-sm font-semibold text-accent hover:underline"
            >
              Сбросить поиск
            </button>
          </div>
        )}

        {regions.length ? (
          <section className="mt-14 border-t border-line pt-10">
            <h2 className={`${fontUnbounded.className} text-2xl font-bold tracking-tight text-ink`}>
              Области и направления
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              События в городах без отдельной карточки - курорты, пригороды и малые населённые пункты.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {regions.map((region) => (
                <Link
                  key={`region:${region.slug || region.name}`}
                  href={cityHref(region)}
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 shadow-card transition hover:border-accent/40 hover:shadow-card-hover"
                >
                  <span className="min-w-0 truncate font-semibold text-ink-2 group-hover:text-ink">
                    {region.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 text-sm text-ink-muted">
                    {pluralEvents(region.events)}
                    <ArrowRight className="h-4 w-4 opacity-60" aria-hidden />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}