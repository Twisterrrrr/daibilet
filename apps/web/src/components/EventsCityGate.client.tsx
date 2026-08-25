'use client';

import { useMemo } from 'react';
import { MapPin } from 'lucide-react';

import { CityPicker } from '@/components/CityPicker.client';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import {
  isPopularRailMoscow,
  isPopularRailSpb,
  orderPopularRailCities,
} from '@/lib/popular-cities-rail';
import { pluralEvents } from '@/lib/format';
import type { PublicDestinationDto } from '@daibilet/contracts/public';

/** Enough chips for ultrawide grid; CSS caps visible density via columns. */
const POPULAR_CITY_LIMIT = 24;

function chipLabel(city: PublicDestinationDto): string {
  if (isPopularRailMoscow(city)) return 'Москва';
  if (isPopularRailSpb(city)) return 'СПб';
  const slug = String(city.slug || '').trim().toLowerCase();
  if (slug === 'kaliningrad') return 'Калининград';
  return city.name;
}

/**
 * Hard city gate for catalog surfaces (/events, /podborki).
 */
export function CatalogCityGate({
  title = 'Выберите город',
  subtitle = 'Покажем актуальные варианты только для вашего города - без мешанины из других регионов.',
  dataAttr = 'catalog-city-gate',
}: {
  title?: string;
  subtitle?: string;
  dataAttr?: string;
}) {
  const selectedCity = useSelectedCityOptional();
  const cities = selectedCity?.destinations || [];

  const popular = useMemo(() => {
    const cityOnly = cities.filter((item) => item.type === 'city' && Number(item.events) > 0);
    return orderPopularRailCities(cityOnly, POPULAR_CITY_LIMIT);
  }, [cities]);

  const value =
    selectedCity?.cityValue && selectedCity.cityValue !== 'all' ? selectedCity.cityLabel : '';

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-b from-primary-50/90 via-white to-slate-50/60 px-5 py-8 sm:px-8 sm:py-11 lg:px-10"
      data-catalog-city-gate={dataAttr}
    >
      <div
        className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary-100/60 blur-3xl"
        aria-hidden
      />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-600 text-white shadow-sm">
          <MapPin className="h-7 w-7" strokeWidth={1.75} aria-hidden />
        </div>
        <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600 sm:text-[0.95rem]">
          {subtitle}
        </p>

        <div className="mt-6 w-full max-w-md text-left">
          <CityPicker
            cities={cities}
            value={value}
            onChange={(name) => selectedCity?.setCity(name)}
            allLabel="Выберите город"
            variant="hero"
            className="w-full"
          />
        </div>

        {popular.length > 0 ? (
          <div className="mt-6 w-full">
            <p className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 sm:text-center">
              Популярные города
            </p>
            <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
              {popular.map((city) => (
                <li key={city.slug || city.name} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => selectedCity?.setCity(city.name)}
                    className="inline-flex h-full min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-left text-sm font-semibold text-slate-700 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-800"
                  >
                    <span className="min-w-0 truncate">{chipLabel(city)}</span>
                    {city.events > 0 ? (
                      <span className="shrink-0 text-xs font-medium text-slate-400 tabular-nums">
                        {pluralEvents(city.events)}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** @deprecated Prefer CatalogCityGate; kept for existing /events imports. */
export function EventsCityGate() {
  return (
    <CatalogCityGate
      dataAttr="events"
      title="Выберите город"
      subtitle="Покажем актуальную афишу и билеты только для вашего города - без мешанины из других регионов."
    />
  );
}
