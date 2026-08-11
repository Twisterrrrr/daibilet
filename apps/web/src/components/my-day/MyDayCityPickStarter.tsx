'use client';

import { forwardRef, useMemo } from 'react';

import { CityPicker } from '@/components/CityPicker.client';
import {
  isPopularRailMoscow,
  isPopularRailSpb,
  orderPopularRailCities,
} from '@/lib/popular-cities-rail';
import type { PublicDestinationDto } from '@daibilet/contracts/public';

type MyDayCityPickStarterProps = {
  cities: PublicDestinationDto[];
  value: string;
  onChange: (cityName: string) => void;
};

function citySlug(city: PublicDestinationDto): string {
  return String(city.slug || '').trim().toLowerCase();
}

/** Compact chip labels for the popular row (full name stays in the select). */
function chipLabel(city: PublicDestinationDto): string {
  if (isPopularRailMoscow(city)) return 'Москва';
  if (isPopularRailSpb(city)) return 'СПб';
  if (citySlug(city) === 'kaliningrad') return 'Калининград';
  return city.name;
}

/** Route pin + trail + stop dots - light inline SVG in brand blue. */
function DayRoutePictogram({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 160 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M18 72C34 52 48 44 68 48C88 52 98 70 118 62C132 56 140 40 146 28"
        stroke="#93c5fd"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="5 7"
      />
      <circle cx="22" cy="70" r="5.5" fill="#dbeafe" stroke="#3b82f6" strokeWidth="2" />
      <circle cx="68" cy="48" r="5.5" fill="#dbeafe" stroke="#3b82f6" strokeWidth="2" />
      <circle cx="118" cy="62" r="5.5" fill="#dbeafe" stroke="#3b82f6" strokeWidth="2" />
      <path
        d="M146 10c-7.2 0-13 5.7-13 12.7 0 9.5 13 22.3 13 22.3s13-12.8 13-22.3C159 15.7 153.2 10 146 10z"
        fill="#2563eb"
      />
      <circle cx="146" cy="22.5" r="4.2" fill="#fff" />
    </svg>
  );
}

export const MyDayCityPickStarter = forwardRef<HTMLSectionElement, MyDayCityPickStarterProps>(
  function MyDayCityPickStarter({ cities, value, onChange }, ref) {
    const popular = useMemo(() => {
      const cityOnly = cities.filter((item) => item.type === 'city');
      return orderPopularRailCities(cityOnly, 8);
    }, [cities]);

    return (
      <section
        ref={ref}
        className="relative mt-3 overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-b from-primary-50/90 via-white to-slate-50/60 px-5 py-8 sm:mt-5 sm:px-8 sm:py-11"
        data-day-unified-search
        data-day-starter="1"
        data-day-starter-variant="pick-city"
      >
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary-100/60 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-28 -left-16 h-56 w-56 rounded-full bg-sky-100/50 blur-3xl"
          aria-hidden
        />

        <div className="relative mx-auto flex w-full max-w-lg flex-col items-center text-center">
          <DayRoutePictogram className="h-20 w-[8.5rem] sm:h-24 sm:w-40" />

          <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Собери свой день
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600 sm:text-[0.95rem]">
            Выберите город - откроются готовые сценарии и места под ваш темп.
          </p>

          <div className="mt-6 w-full max-w-md text-left" data-day-city-picker>
            <CityPicker
              cities={cities}
              value={value}
              onChange={onChange}
              allLabel="Выберите город"
              variant="hero"
              className="w-full"
            />
          </div>

          {popular.length > 0 ? (
            <div className="mt-5 w-full max-w-md" data-day-popular-cities>
              <p className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Популярные города
              </p>
              <ul className="mt-2.5 flex flex-wrap justify-start gap-2">
                {popular.map((city) => {
                  const active = value === city.name;
                  return (
                    <li key={city.slug || city.name}>
                      <button
                        type="button"
                        data-day-popular-city={city.slug || city.name}
                        aria-pressed={active}
                        onClick={() => onChange(city.name)}
                        className={
                          active
                            ? 'inline-flex min-h-9 items-center rounded-full bg-primary-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition'
                            : 'inline-flex min-h-9 items-center rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-800'
                        }
                      >
                        {chipLabel(city)}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
    );
  },
);
