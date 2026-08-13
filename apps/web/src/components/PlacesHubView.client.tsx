'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Route } from 'lucide-react';
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
  type VenueCatalogFamily,
  type VenueCatalogFeedPage,
} from '@/lib/venue-catalog-feed';

const FAMILY_TABS: Array<{ id: 'all' | VenueCatalogFamily; label: string }> = [
  { id: 'all', label: 'Все места' },
  { id: 'institution', label: 'С афишей' },
  { id: 'location', label: 'Достопримечательности' },
];

function parseFamilyParam(raw: string | null): 'all' | VenueCatalogFamily {
  if (raw === 'institution' || raw === 'location') return raw;
  return 'all';
}

/**
 * Umbrella «Места»: mixed venues+locations grid. Entity URLs stay `/venues/*` and `/locations/*`.
 */
export function PlacesHubView() {
  const searchParams = useSearchParams();
  const selectedCity = useSelectedCityOptional();
  const q = searchParams.get('q')?.trim() || '';
  const family = parseFamilyParam(searchParams.get('family'));
  const urlPage = parseVenueCatalogPageParam(searchParams.get('page'));
  const cityReady = selectedCity?.cityReady ?? true;
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
  const [loading, setLoading] = useState(true);

  const hubHref = (next: { family?: 'all' | VenueCatalogFamily; page?: number; keepQ?: boolean }) =>
    placesSearchHref({
      city: cityQuery !== 'all' ? cityQuery : undefined,
      q: next.keepQ === false ? undefined : q || undefined,
      family: next.family ?? family,
      page: next.page,
    });

  const paginationParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (q) params.q = q;
    if (family !== 'all') params.family = family;
    if (cityQuery && cityQuery !== 'all') params.city = cityQuery;
    if (urlPage > 1) params.page = String(urlPage);
    return params;
  }, [q, family, cityQuery, urlPage]);

  useEffect(() => {
    if (!cityReady) return;
    const controller = new AbortController();
    setLoading(true);
    void fetchVenueCatalogPage(
      {
        family,
        q: q || undefined,
        city: cityQuery !== 'all' ? cityQuery : undefined,
        page: urlPage,
        limit: VENUE_CATALOG_PAGE_SIZE,
        sort: q || family !== 'all' ? 'events' : 'mixed',
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
  }, [q, family, cityQuery, urlPage, cityReady]);

  const totalLabel = feed?.total
    ? `${feed.total} ${feed.total === 1 ? 'место' : feed.total < 5 ? 'места' : 'мест'}`
    : null;

  return (
    <div className="container-page py-8 sm:py-10">
      <PlacesSearch mode="hub" initialQuery={q} className="max-w-2xl" />

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Тип мест">
          {FAMILY_TABS.map((tab) => {
            const on = family === tab.id;
            return (
              <Link
                key={tab.id}
                href={hubHref({ family: tab.id, page: 1 })}
                role="tab"
                aria-selected={on}
                className={`inline-flex h-9 items-center rounded-full px-3.5 text-sm font-semibold transition ${
                  on
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
        <Link
          href={myDayHref}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 text-sm font-semibold text-primary-700 hover:text-primary-800"
        >
          <Route className="h-4 w-4" strokeWidth={1.75} />
          Собрать день
        </Link>
      </div>

      <div className="mt-6 mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {q ? 'Результаты' : 'Площадки и локации'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {q
              ? 'Площадки и локации в одном списке. Карточки ведут на привычные адреса.'
              : 'Музей и набережная в одной ленте. Фильтр сверху, если нужен только один тип.'}
          </p>
        </div>
        {!loading && totalLabel ? (
          <p className="text-sm text-slate-500">{totalLabel}</p>
        ) : null}
      </div>

      {loading && !feed ? (
        <p className="py-12 text-sm text-slate-500">Загружаем места…</p>
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
                  showFamilyTag
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
          <p className="text-lg font-semibold text-slate-700">
            {q ? 'Ничего не нашли' : 'Пока нет мест'}
          </p>
          <p className="mt-1 text-sm">
            {q
              ? 'Попробуйте другое название или смените город.'
              : 'Смените город в шапке или откройте поиск.'}
          </p>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-4 text-sm text-slate-500">
        <Link href={venuesHref} className="font-medium text-primary hover:underline">
          Каталог площадок
        </Link>
        <Link href={locationsHref} className="font-medium text-primary hover:underline">
          Каталог локаций
        </Link>
        {q ? (
          <Link href={hubHref({ keepQ: false, page: 1 })} className="hover:underline">
            Сбросить поиск
          </Link>
        ) : null}
      </div>
    </div>
  );
}
