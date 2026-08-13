'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import { CatalogDateRail } from '@/components/CatalogDateRail.client';
import { PageBreadcrumbBar } from '@/components/PageBreadcrumbs';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { catalogFiltersFromQuery, type CatalogFilterValues } from '@/lib/catalog-url';
import { cityToPrepositional } from '@/lib/city-declension';

/**
 * Compact catalog header: breadcrumbs + H1/subtitle.
 * Desktop: date rail in the title band. Mobile: date/type selects live in CatalogToolbar.
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

  const cityPrep = cityName ? cityToPrepositional(cityName) : null;

  const title = q
    ? `Результаты поиска: «${q}»`
    : category
      ? `События: ${category}`
      : cityPrep
        ? `Афиша событий в ${cityPrep}`
        : 'Афиша событий';

  const subtitle = q
    ? cityPrep
      ? `Подборка по запросу в ${cityPrep}`
      : 'Подборка по запросу'
    : category
      ? cityPrep
        ? `Афиша в категории «${category}» - ${cityPrep}`
        : `Афиша в категории «${category}»`
      : cityPrep
        ? `Билеты и расписание - выбирайте по дате и интересам`
        : 'Сначала выберите город - покажем только актуальную афишу';

  return (
    <>
      <PageBreadcrumbBar
        hideOnMobile
        items={[
          { label: 'Главная', href: '/' },
          { label: 'События', href: '/events' },
          ...(category ? [{ label: category }] : []),
        ]}
      />
      <header className="border-b border-slate-100 bg-white">
        <div className="container-page py-4 sm:py-5">
          {/* Desktop: title band + date rail; mobile keeps date/type as selects under search. */}
          <div className="flex flex-col gap-2.5 md:flex-row md:items-end md:gap-5">
            <div className="min-w-0 shrink-0 md:max-w-md lg:max-w-lg">
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-graphite sm:text-3xl">
                {title}
              </h1>
              <p className="mt-1 text-sm leading-snug text-graphite-muted sm:text-[15px]">
                {subtitle ?? (
                  <>
                    Билеты на экскурсии, концерты и музеи
                    <br />
                    более чем в 100 городах России.
                  </>
                )}
              </p>
            </div>
            <div className="hidden min-w-0 w-full md:block md:flex-1">
              <CatalogDateRail className="min-w-0 w-full" />
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
