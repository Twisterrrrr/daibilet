'use client';

import { useEffect, useMemo, useState } from 'react';

import { HomeEventRail, HomeNowSection } from '@/components/HomeNowSection.client';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import type { PublicCatalogDto, PublicCatalogListItemDto, PublicSessionDto } from '@daibilet/contracts/public';
import { catalogHrefWithSelectedCity } from '@/lib/catalog-url';
import { buildHomePageSectionsSync, mergeHomeNowTabsForSsr } from '@/lib/home-page-sections-sync';
import type { HomeNowTab } from '@/lib/home-now-section';
import { toHomeSsrSession } from '@/lib/ssr-lean-payloads';

type PublicSession = PublicSessionDto | PublicCatalogListItemDto;

/**
 * Home rails island: receives the all-city SSR sections, then fetches a small
 * city-scoped catalog when the visitor changes their selected city. The root
 * page stays cacheable; city selection is applied only to these client rails.
 */
export function HomeCityAwareSections({
  editorsPick,
  homeNowTabs,
  sparseCatalog,
  ssrCityName = null,
}: {
  editorsPick: PublicSession[];
  homeNowTabs: HomeNowTab[];
  sparseCatalog: boolean;
  /** Cookie city used for the SSR catalog - keep copy stable until header catches up. */
  ssrCityName?: string | null;
}) {
  const selectedCity = useSelectedCityOptional();
  const cityReady = selectedCity?.cityReady ?? true;
  const cityValue = selectedCity?.cityValue ?? 'all';
  const cityName =
    cityValue === 'all'
      ? null
      : selectedCity?.selectedDestination?.name ||
        (selectedCity?.cityLabel !== 'Все города' ? selectedCity?.cityLabel : null) ||
        ssrCityName ||
        null;

  const editorsHref = catalogHrefWithSelectedCity(cityReady ? cityValue : 'all', {
    sort: 'popular',
  });

  const cityHint = cityReady && cityName ? ` · ${cityName}` : '';
  const cityQuery = useMemo(() => {
    if (!cityReady || cityValue === 'all') return null;
    // Send the display name: legacy and stage0 catalogs can use different city
    // slugs, while both accept the canonical public city name.
    return cityName || selectedCity?.selectedDestination?.slug || cityValue;
  }, [cityReady, cityValue, cityName, selectedCity?.selectedDestination?.slug]);
  const cityKey = cityQuery || 'all';
  const [citySections, setCitySections] = useState<{
    cityKey: string;
    editorsPick: PublicSession[];
    homeNowTabs: HomeNowTab[];
    sparseCatalog: boolean;
    error?: boolean;
  } | null>(null);

  useEffect(() => {
    if (!cityQuery) {
      setCitySections(null);
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({ city: cityQuery, limit: '40', sort: 'popular' });

    fetch(`/api/public/events?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('home_city_catalog_failed');
        return (await response.json()) as PublicCatalogDto;
      })
      .then((catalog) => {
        const sessions = (catalog.items || []).map(toHomeSsrSession);
        const sparse = sessions.length < 12;
        const sections = buildHomePageSectionsSync(sessions, { cityName });
        setCitySections({
          cityKey,
          editorsPick: sections.editorsPick,
          homeNowTabs: mergeHomeNowTabsForSsr(sections.homeNowTabs, sections.popular, sparse),
          sparseCatalog: sparse,
        });
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        setCitySections({
          cityKey,
          editorsPick: [],
          homeNowTabs: [],
          sparseCatalog: false,
          error: true,
        });
      });

    return () => controller.abort();
  }, [cityKey, cityName, cityQuery]);

  const sections = cityQuery
    ? citySections?.cityKey === cityKey
      ? citySections
      : null
    : null;
  const shownEditorsPick = sections?.editorsPick ?? (cityQuery ? [] : editorsPick);
  const shownHomeNowTabs = sections?.homeNowTabs ?? (cityQuery ? [] : homeNowTabs);
  const shownSparseCatalog = sections?.sparseCatalog ?? sparseCatalog;
  const loadingCitySections = Boolean(cityQuery && !sections);
  const showEditorsPick = shownEditorsPick.length > 0;

  if (loadingCitySections) {
    return (
      <div aria-live="polite" aria-busy="true">
        {(['Выбор редакции', 'Популярно на этой неделе'] as const).map((title) => (
          <section key={title} className="section-y" data-home-band="boxed">
            <div className="container-page min-w-0">
              <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
              <p className="mt-1 text-sm text-slate-500">Загружаем события{cityHint}</p>
              <div className="mt-5 flex gap-5 overflow-hidden">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="showcase-rail-card aspect-[3/4] animate-pulse rounded-xl bg-slate-200" />
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    );
  }

  if (sections?.error) {
    return (
      <div role="status" className="section-y container-page text-sm text-slate-600">
        Не удалось загрузить события для города. Попробуйте обновить страницу.
      </div>
    );
  }

  return (
    <>
      <HomeEventRail
        id="editors-pick"
        title="Выбор редакции"
        subtitle={`Закреплённые в подборках и сильные предложения с ближайшими датами${cityHint}`}
        href={editorsHref}
        events={shownEditorsPick as PublicSessionDto[]}
        editorsPickBadge
        sectionClassName={showEditorsPick ? 'max-sm:!pt-[calc(var(--space-section)/2)]' : undefined}
      />

      {shownHomeNowTabs.length ? (
        <HomeNowSection
          tabs={shownHomeNowTabs}
          sectionTitle={shownSparseCatalog ? 'Рекомендуем начать с этого' : 'Популярно на этой неделе'}
          sectionSubtitle={`События с фото и ближайшими датами${cityHint}`}
        />
      ) : null}

    </>
  );
}
