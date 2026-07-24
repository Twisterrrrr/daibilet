'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import { HeroLayout } from '@/components/HeroLayout';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { catalogFiltersFromQuery, type CatalogFilterValues } from '@/lib/catalog-url';
import { cityToPrepositional } from '@/lib/city-declension';

/**
 * Events hero: geo H1 + short subtitle only.
 * Search / date / categories live in CatalogToolbar - no matrix, no trust chips.
 */
export function EventsCatalogHero() {
  const searchParams = useSearchParams();
  const selectedCity = useSelectedCityOptional();

  const filters = useMemo(() => {
    return catalogFiltersFromQuery({
      city: searchParams.get('city') || undefined,
      sort: (searchParams.get('sort') as CatalogFilterValues['sort']) || undefined,
    });
  }, [searchParams]);

  const cityReady = selectedCity?.cityReady ?? true;
  const cityName =
    cityReady && (filters.city || (selectedCity && selectedCity.cityValue !== 'all'))
      ? selectedCity?.selectedDestination?.name ||
        (selectedCity?.cityLabel !== 'Все города' ? selectedCity?.cityLabel : null) ||
        filters.city ||
        null
      : null;

  const title = cityName ? <>Афиша событий в {cityToPrepositional(cityName)}</> : <>Афиша событий</>;

  const description = cityName
    ? `Билеты на экскурсии, концерты и музеи в ${cityToPrepositional(cityName)}.`
    : 'Билеты на экскурсии, концерты и музеи более чем в 100 городах России.';

  return (
    <HeroLayout
      variant="minimal"
      dense
      breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'События' }]}
      title={title}
      description={description}
    />
  );
}
