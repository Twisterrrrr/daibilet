'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';

import { EventCard } from '@/components/EventCard';
import { HomeEventRail, HomeNowSection } from '@/components/HomeNowSection.client';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import type { PublicCatalogListItemDto, PublicSessionDto } from '@daibilet/contracts/public';
import { catalogHrefWithSelectedCity } from '@/lib/catalog-url';
import { filterSessionsByCity } from '@/lib/landing-city';
import { buildHomePageSectionsSync } from '@/lib/home-page-sections-sync';

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

  const catalogPopularHref = catalogHrefWithSelectedCity(cityReady ? cityValue : 'all', {
    sort: 'popular',
  });
  const editorsHref = catalogHrefWithSelectedCity(cityReady ? cityValue : 'all', {
    sort: 'popular',
  });

  const cityHint =
    cityReady && cityName ? ` · ${cityName}` : !cityReady ? '' : ' · все города';

  return (
    <>
      <HomeEventRail
        id="editors-pick"
        title="Выбор редакции"
        subtitle={`Закреплённые в подборках и сильные предложения с ближайшими датами${cityHint}`}
        href={editorsHref}
        events={editorsPick}
        editorsPickBadge
      />

      {children}

      {homeNowTabs.length ? <HomeNowSection tabs={homeNowTabs} /> : null}

      {popular.length ? (
        <section className="section-y">
          <div className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {sparseCatalog ? 'Рекомендуем начать с этого' : 'Популярное сейчас'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {sparseCatalog
                    ? `Сильные предложения из текущего каталога${cityHint}`
                    : `Конкретные события с ближайшими датами${cityHint}`}
                </p>
              </div>
              <Link
                href={catalogPopularHref}
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700"
              >
                Открыть каталог <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
              {popular.map((session) => (
                <li key={session.id}>
                  <EventCard session={session} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  );
}
