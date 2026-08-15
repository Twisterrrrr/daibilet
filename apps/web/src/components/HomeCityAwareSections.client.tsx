'use client';

import { useMemo, type ReactNode } from 'react';

import { HomeEventRail, HomeNowSection } from '@/components/HomeNowSection.client';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import type { PublicCatalogListItemDto, PublicSessionDto } from '@daibilet/contracts/public';
import { catalogHrefWithSelectedCity } from '@/lib/catalog-url';
import { filterSessionsByCity } from '@/lib/landing-city';
import { buildHomePageSectionsSync } from '@/lib/home-page-sections-sync';
import { sessionHasCoverImage } from '@/lib/session-cover-image';

type PublicSession = PublicSessionDto | PublicCatalogListItemDto;

export function HomeCityAwareSections({
  sessions,
  fingerprints,
  sparseCatalog,
  children,
}: {
  sessions: PublicSession[];
  fingerprints: Record<string, string>;
  sparseCatalog: boolean;
  /** Inserted after «Выбор редакции» (e.g. popular cities). */
  children?: ReactNode;
}) {
  const selectedCity = useSelectedCityOptional();
  const cityReady = selectedCity?.cityReady ?? true;
  const cityValue = selectedCity?.cityValue ?? 'all';
  const cityName =
    cityValue === 'all'
      ? null
      : selectedCity?.selectedDestination?.name ||
        (selectedCity?.cityLabel !== 'Все города' ? selectedCity?.cityLabel : null) ||
        null;
  const citySlug = selectedCity?.selectedDestination?.slug || null;

  const fingerprintMap = useMemo(() => new Map(Object.entries(fingerprints || {})), [fingerprints]);

  const scopedSessions = useMemo(() => {
    if (!cityReady || !cityName || cityValue === 'all') return sessions;
    return filterSessionsByCity(sessions as PublicSessionDto[], cityName, citySlug) as PublicSession[];
  }, [sessions, cityReady, cityName, citySlug, cityValue]);

  const { editorsPick, homeNowTabs, popular } = useMemo(
    () =>
      buildHomePageSectionsSync(scopedSessions, {
        cityName,
        fingerprints: fingerprintMap,
      }),
    [scopedSessions, cityName, fingerprintMap],
  );

  // Merge «Куда сходить» + «Популярное»: one photo carousel; seed empty tabs from popular covers.
  const mergedTabs = useMemo(() => {
    const coverPopular = popular.filter((session) => sessionHasCoverImage(session));
    if (!homeNowTabs.length && coverPopular.length) {
      return [
        {
          key: 'nearest' as const,
          label: 'Сейчас',
          title: sparseCatalog ? 'Рекомендуем начать с этого' : 'Популярно на этой неделе',
          subtitle: sparseCatalog
            ? 'Сильные предложения из текущего каталога'
            : 'События с фото и ближайшими датами',
          events: coverPopular,
          catalogQuery: { sort: 'popular' },
          usedFallback: true,
        },
      ];
    }
    return homeNowTabs
      .map((tab) => ({
        ...tab,
        events: tab.events.filter((session) => sessionHasCoverImage(session)),
      }))
      .filter((tab) => tab.events.length > 0);
  }, [homeNowTabs, popular, sparseCatalog]);

  const editorsHref = catalogHrefWithSelectedCity(cityReady ? cityValue : 'all', {
    sort: 'popular',
  });

  const cityHint =
    cityReady && cityName ? ` · ${cityName}` : !cityReady ? '' : ' · все города';

  const showEditorsPick = editorsPick.length > 0;

  return (
    <>
      <HomeEventRail
        id="editors-pick"
        title="Выбор редакции"
        subtitle={`Закреплённые в подборках и сильные предложения с ближайшими датами${cityHint}`}
        href={editorsHref}
        events={editorsPick}
        editorsPickBadge
        sectionClassName={showEditorsPick ? 'max-sm:!pt-[calc(var(--space-section)/2)]' : undefined}
      />

      {children}

      {mergedTabs.length ? (
        <HomeNowSection
          tabs={mergedTabs}
          sectionTitle={sparseCatalog ? 'Рекомендуем начать с этого' : 'Популярно на этой неделе'}
          sectionSubtitle={`События с фото и ближайшими датами${cityHint}`}
        />
      ) : null}
    </>
  );
}
