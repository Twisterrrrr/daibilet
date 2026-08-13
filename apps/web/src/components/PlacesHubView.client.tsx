'use client';

import Link from 'next/link';
import { Building2, MapPin, Route } from 'lucide-react';

import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { venueCatalogHrefWithSelectedCity } from '@/lib/catalog-url';

/**
 * Umbrella hub for «Места»: discovery entry only.
 * Entity URLs stay `/venues/*` and `/locations/*` (never rewritten).
 */
export function PlacesHubView() {
  const selectedCity = useSelectedCityOptional();
  const cityReady = selectedCity?.cityReady ?? false;
  const cityValue = cityReady ? selectedCity?.cityValue ?? 'all' : 'all';
  const cityQuery =
    cityReady && cityValue !== 'all'
      ? selectedCity?.selectedDestination?.slug || cityValue
      : 'all';

  const venuesHref = venueCatalogHrefWithSelectedCity('/venues', cityQuery);
  const locationsHref = venueCatalogHrefWithSelectedCity('/locations', cityQuery);
  const myDayHref =
    cityQuery && cityQuery !== 'all'
      ? `/my-day?city=${encodeURIComponent(cityQuery)}`
      : '/my-day';

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
        <Link
          href={venuesHref}
          className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-primary-300 hover:shadow-sm sm:p-7"
        >
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
            <Building2 className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <h2 className="mt-4 text-xl font-bold text-slate-900 group-hover:text-primary-700">С афишей</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Музеи, театры, залы и клубы - места, где можно купить билет на событие.
          </p>
          <span className="mt-5 text-sm font-semibold text-primary-700">Открыть площадки →</span>
        </Link>

        <Link
          href={locationsHref}
          className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-primary-300 hover:shadow-sm sm:p-7"
        >
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <MapPin className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <h2 className="mt-4 text-xl font-bold text-slate-900 group-hover:text-primary-700">
            Достопримечательности и точки
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Парки, набережные, памятники, причалы и точки сбора для маршрута дня.
          </p>
          <span className="mt-5 text-sm font-semibold text-primary-700">Открыть локации →</span>
        </Link>
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-5 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:p-6">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">Собрать день из мест</p>
          <p className="mt-1 text-sm text-slate-600">
            Площадки и локации одинаково добавляются в «Мой день» - это точки на карте поездки.
          </p>
        </div>
        <Link
          href={myDayHref}
          className="mt-4 inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 sm:mt-0"
        >
          <Route className="h-4 w-4" strokeWidth={1.75} />
          Мой день
        </Link>
      </div>
    </div>
  );
}
