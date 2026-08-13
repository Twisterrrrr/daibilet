'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Building2, MapPin, Route } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { CatalogPaginationLinks } from '@/components/CatalogPaginationLinks';
import { InstitutionCard } from '@/components/InstitutionCard.client';
import { LocationCard } from '@/components/LocationCard.client';
import { PlacesSearch } from '@/components/PlacesSearch.client';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { placesSearchHref, venueCatalogHrefWithSelectedCity } from '@/lib/catalog-url';
import { catalogCityQueryValue } from '@/lib/selected-city';
import { venueHref, venuePageTemplate } from '@/lib/routes';
import {
  fetchVenueCatalogPage,
  parseVenueCatalogPageParam,
  VENUE_CATALOG_PAGE_SIZE,
  type VenueCatalogFeedPage,
} from '@/lib/venue-catalog-feed';

/**
 * Umbrella hub for «Места»: discovery entry + unified search.
 * Entity URLs stay `/venues/*` and `/locations/*` (never rewritten).
 */
export function PlacesHubView() {
  const searchParams = useSearchParams();
  const selectedCity = useSelectedCityOptional();
  const q = searchParams.get('q')?.trim() || '';
  const urlPage = parseVenueCatalogPageParam(searchParams.get('page'));
  const cityReady = selectedCity?.cityReady ?? false;
  const cityValue = cityReady ? selectedCity?.cityValue ?? 'all' : 'all';
  const cityQuery =
    cityReady && cityValue !== 'all'
      ? selectedCity?.selectedDestination?.slug ||
        catalogCityQueryValue(selectedCity?.destinations || [], cityValue) ||
        cityValue
      : 'all';

  const venuesHref = venueCatalogHrefWithSelectedCity('/venues', cityQuery);
  const locationsHref = venueCatalogHrefWithSelectedCity('/locations', cityQuery);
  const myDayHref =
    cityQuery && cityQuery !== 'all'
      ? `/my-day?city=${encodeURIComponent(cityQuery)}`
      : '/my-day';

  const [feed, setFeed] = useState<VenueCatalogFeedPage | null>(null);
  const [loading, setLoading] = useState(false);

  const paginationParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (q) params.q = q;
    if (cityQuery && cityQuery !== 'all') params.city = cityQuery;
    if (urlPage > 1) params.page = String(urlPage);
    return params;
  }, [q, cityQuery, urlPage]);

  useEffect(() => {
    if (!q) {
      setFeed(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    void fetchVenueCatalogPage(
      {
        family: 'all',
        q,
        city: cityQuery !== 'all' ? cityQuery : undefined,
        page: urlPage,
        limit: VENUE_CATALOG_PAGE_SIZE,
        sort: 'events',
      },
      { signal: controller.signal },
    )
      .then((page) => {
        if (!controller.signal.aborted) setFeed(page);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [q, cityQuery, urlPage]);

  return (
    <div className="container-page py-8 sm:py-10">
      <PlacesSearch mode="hub" initialQuery={q} className="max-w-2xl" />

      {q ? (
        <div className="mt-8">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Результаты</h2>
              <p className="mt-1 text-sm text-slate-500">
                Площадки и локации в одном списке. Карточки ведут на привычные адреса.
              </p>
            </div>
            {!loading && feed ? (
              <p className="text-sm text-slate-500">{feed.total ? `${feed.total} мест` : null}</p>
            ) : null}
          </div>

          {loading && !feed ? (
            <p className="py-12 text-sm text-slate-500">Ищем места…</p>
          ) : feed && feed.venues.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {feed.venues.map((venue) =>
                  venuePageTemplate(venue.type) === 'institution' ? (
                    <InstitutionCard
                      key={venue.id}
                      venue={venue}
                      href={venueHref(venue)}
                      hideCity={cityQuery !== 'all'}
                    />
                  ) : (
                    <LocationCard
                      key={venue.id}
                      venue={venue}
                      href={venueHref(venue)}
                      nextSlot={venue.nextSlot}
                      hideCity={cityQuery !== 'all'}
                    />
                  ),
                )}
              </div>
              <CatalogPaginationLinks
                page={feed.page || urlPage}
                total={feed.total}
                limit={VENUE_CATALOG_PAGE_SIZE}
                searchParams={paginationParams}
                basePath="/places"
              />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500">
              <p className="text-lg font-semibold text-slate-700">Ничего не нашли</p>
              <p className="mt-1 text-sm">Попробуйте другое название или смените город.</p>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-4 text-sm text-slate-500">
            <Link href={venuesHref} className="font-medium text-primary hover:underline">
              Каталог площадок
            </Link>
            <Link href={locationsHref} className="font-medium text-primary hover:underline">
              Каталог локаций
            </Link>
            <Link href={placesSearchHref({ city: cityQuery })} className="hover:underline">
              Сбросить поиск
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-5">
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
        </>
      )}
    </div>
  );
}
