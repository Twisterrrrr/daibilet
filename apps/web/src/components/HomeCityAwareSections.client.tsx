'use client';

import { HomeEventRail, HomeNowSection } from '@/components/HomeNowSection.client';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import type { PublicCatalogListItemDto, PublicSessionDto } from '@daibilet/contracts/public';
import { catalogHrefWithSelectedCity } from '@/lib/catalog-url';
import type { HomeNowTab } from '@/lib/home-now-section';

type PublicSession = PublicSessionDto | PublicCatalogListItemDto;

/**
 * Home rails island: receives already-built sections from RSC.
 * City switch on `/` triggers router.refresh() in SelectedCityProvider, so we
 * do not keep a 40-56 session pool in the client flight.
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
  const showEditorsPick = editorsPick.length > 0;

  return (
    <>
      <HomeEventRail
        id="editors-pick"
        title="Выбор редакции"
        subtitle={`Закреплённые в подборках и сильные предложения с ближайшими датами${cityHint}`}
        href={editorsHref}
        events={editorsPick as PublicSessionDto[]}
        editorsPickBadge
        sectionClassName={showEditorsPick ? 'max-sm:!pt-[calc(var(--space-section)/2)]' : undefined}
      />

      {homeNowTabs.length ? (
        <HomeNowSection
          tabs={homeNowTabs}
          sectionTitle={sparseCatalog ? 'Рекомендуем начать с этого' : 'Популярно на этой неделе'}
          sectionSubtitle={`События с фото и ближайшими датами${cityHint}`}
        />
      ) : null}

    </>
  );
}
