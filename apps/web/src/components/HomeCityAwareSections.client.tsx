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
  ssrCityName = null,
  children,
}: {
  sessions: PublicSession[];
  fingerprints: Record<string, string>;
  sparseCatalog: boolean;
  /** Cookie city used for the SSR catalog - keep rails stable until header catches up. */
  ssrCityName?: string | null;
  /** Inserted after «Выбор редакции» (e.g. popular cities). Must be ReactNode - not a render prop (RSC). */
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
        ssrCityName ||
        null;
  const citySlug = selectedCity?.selectedDestination?.slug || null;

  const fingerprintMap = useMemo(() => new Map(Object.entries(fingerprints || {})), [fingerprints]);

  const scopedSessions = useMemo(() => {
    // SSR payload is already city-scoped when the cookie matched. Re-filtering
    // on hydrate drops rows with messy citySlug and looks like a city swap.
    if (!cityReady) return sessions;
    if (!cityName || cityValue === 'all') return sessions;
    if (ssrCityName && ssrCityName === cityName) return sessions;
    return filterSessionsByCity(sessions as PublicSessionDto[], cityName, citySlug) as PublicSession[];
  }, [sessions, cityReady, cityName, citySlug, cityValue, ssrCityName]);

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

  const cityHint = cityReady && cityName ? ` · ${cityName}` : '';

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

      {children ? (
        <div
          className={
            showEditorsPick
              ? undefined
              : '[&_[data-home-band=full-bleed]]:!pt-[calc(var(--space-section)/2)] sm:[&_[data-home-band=full-bleed]]:!pt-[calc(var(--space-section-lg)/2)]'
          }
        >
          {children}
        </div>
      ) : null}

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
