'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import {
  CatalogActiveFilters,
  catalogActiveDateHeadingLabel,
} from '@/components/CatalogActiveFilters';
import { PageBreadcrumbBar } from '@/components/PageBreadcrumbs';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { isCatalogPageSize } from '@daibilet/contracts/catalog';
import {
  catalogFiltersFromQuery,
  type CatalogFilterValues,
  type CatalogSort,
} from '@/lib/catalog-url';
import { buildEventsCatalogHeading } from '@/lib/events-catalog-heading';

function parseOptionalInt(raw: string | null): number | undefined {
  if (raw == null || raw === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Catalog header: breadcrumbs + H1/subtitle + removable active-filter chips.
 * Date rail lives in catalog-main (same width as the card grid).
 */
export function EventsCatalogHero() {
  const searchParams = useSearchParams();
  const selectedCity = useSelectedCityOptional();

  const filterValues = useMemo(() => {
    const limitRaw = parseOptionalInt(searchParams.get('limit'));
    return catalogFiltersFromQuery({
      q: searchParams.get('q') || undefined,
      city: searchParams.get('city') || undefined,
      category: searchParams.get('category') || undefined,
      landing: searchParams.get('landing') || undefined,
      date: searchParams.get('date') || undefined,
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
      sort: (searchParams.get('sort') as CatalogSort) || undefined,
      limit: limitRaw != null && isCatalogPageSize(limitRaw) ? limitRaw : undefined,
      minPrice: parseOptionalInt(searchParams.get('minPrice')),
      maxPrice: parseOptionalInt(searchParams.get('maxPrice')),
      ageMax: parseOptionalInt(searchParams.get('ageMax')),
    });
  }, [searchParams]);

  const cityReady = selectedCity?.cityReady ?? true;
  const cityName =
    cityReady && (filterValues.city || (selectedCity && selectedCity.cityValue !== 'all'))
      ? selectedCity?.selectedDestination?.name ||
        (selectedCity?.cityLabel !== 'Все города' ? selectedCity?.cityLabel : null) ||
        filterValues.city ||
        null
      : null;

  const dateLabel = useMemo(() => catalogActiveDateHeadingLabel(filterValues), [filterValues]);

  const { title, subtitle, filtered } = useMemo(
    () =>
      buildEventsCatalogHeading({
        q: filterValues.q,
        category: filterValues.category,
        cityName,
        dateLabel,
      }),
    [filterValues.q, filterValues.category, cityName, dateLabel],
  );

  const chipValues = useMemo((): CatalogFilterValues => {
    // Prefer resolved city name slug from URL/header so "Сбросить" keeps city context.
    const city =
      filterValues.city ||
      (selectedCity?.cityValue && selectedCity.cityValue !== 'all' ? selectedCity.cityValue : undefined);
    return { ...filterValues, city };
  }, [filterValues, selectedCity?.cityValue]);

  return (
    <>
      <PageBreadcrumbBar
        hideOnMobile
        items={[
          { label: 'Главная', href: '/' },
          { label: 'События', href: '/events' },
          ...(filterValues.category ? [{ label: filterValues.category }] : []),
        ]}
      />
      <div className="border-b border-slate-100 bg-white max-sm:border-0 max-sm:bg-transparent">
        <div className={`container-page ${filtered ? 'py-3 sm:py-5' : 'sm:py-5'}`}>
          <h1
            className={
              filtered
                ? 'font-display text-xl font-bold tracking-tight text-graphite sm:text-3xl'
                : 'max-sm:sr-only font-display text-2xl font-bold tracking-tight text-graphite sm:text-3xl'
            }
          >
            {title}
          </h1>
          <p
            className={
              filtered
                ? 'mt-1 text-sm leading-snug text-graphite-muted sm:text-[15px]'
                : 'hidden text-sm leading-snug text-graphite-muted sm:mt-1 sm:block sm:text-[15px]'
            }
          >
            {subtitle}
          </p>
          <CatalogActiveFilters values={chipValues} className="mt-3" />
        </div>
      </div>
    </>
  );
}
