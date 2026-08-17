'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import { HeroLayout } from '@/components/HeroLayout';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { catalogFiltersFromQuery, type CatalogFilterValues } from '@/lib/catalog-url';
import { eventsCatalogH1, eventsCatalogLead } from '@/lib/catalog-index-copy';

/**
 * Compact catalog header: breadcrumbs + eyebrow + H1/lead.
 * Date rail lives in sticky CatalogToolbar on desktop; mobile uses date select there.
 */
export function EventsCatalogHero() {
  const searchParams = useSearchParams();
  const selectedCity = useSelectedCityOptional();
  const q = (searchParams.get('q') || '').trim();
  const category = (searchParams.get('category') || '').trim();

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

  const title = eventsCatalogH1({ cityName, q, category });
  const subtitle = eventsCatalogLead({ cityName, q, category });

  return (
    <HeroLayout
      variant="minimal"
      dense
      hideBreadcrumbsOnMobile
      breadcrumbs={[
        { label: 'Главная', href: '/' },
        { label: 'События', href: '/events' },
        ...(category ? [{ label: category }] : []),
      ]}
      eyebrow={cityName || undefined}
      title={title}
      description={subtitle}
      tone="light"
    />
  );
}
