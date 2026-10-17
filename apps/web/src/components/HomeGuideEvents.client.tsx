'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useMemo } from 'react';

import { EventCard } from '@/components/EventCard';
import { ScrollRail } from '@/components/ScrollRail.client';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import type { PublicCatalogListItemDto, PublicSessionDto } from '@daibilet/contracts/public';
import { catalogHrefWithSelectedCity } from '@/lib/catalog-url';
import { filterSessionsByCity } from '@/lib/landing-city';
import { buildHomePageSectionsSync } from '@/lib/home-page-sections-sync';

type PublicSession = PublicSessionDto | PublicCatalogListItemDto;

/**
 * City-scoped «Куда сходить»: desktop grid-4, mobile full-width-ish snap carousel.
 */
export function HomeGuideEvents({
  sessions,
  fingerprints,
  sparseCatalog,
}: {
  sessions: PublicSession[];
  fingerprints: Record<string, string>;
  sparseCatalog: boolean;
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

  const { editorsPick, popular } = useMemo(
    () =>
      buildHomePageSectionsSync(scopedSessions, {
        cityName,
        fingerprints: fingerprintMap,
      }),
    [scopedSessions, cityName, fingerprintMap],
  );

  const events = (popular.length ? popular : editorsPick).slice(0, 8);
  if (!events.length) return null;

  const moreHref = catalogHrefWithSelectedCity(cityReady ? cityValue : 'all', { sort: 'popular' });
  const cityHint =
    cityReady && cityName ? ` · ${cityName}` : !cityReady ? '' : ' · все города';

  return (
    <section id="events" className="section-y">
      <div className="container-page min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {sparseCatalog ? 'Рекомендуем начать с этого' : 'Куда сходить'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {sparseCatalog
                ? `Сильные предложения из текущего каталога${cityHint}`
                : `Топ-события с ближайшими датами${cityHint}`}
            </p>
          </div>
          <Link
            href={moreHref}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            Смотреть афишу <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Mobile: almost full-width snap with edge padding peek */}
        <ScrollRail
          className="mt-5 sm:hidden"
          viewportClassName="flex flex-nowrap gap-3 snap-x snap-mandatory px-0.5"
          arrowAlign="center"
          aria-label="Куда сходить"
        >
          {events.map((session) => (
            <div
              key={session.id}
              className="w-[min(88%,320px)] shrink-0 snap-start"
              data-rail-item
            >
              <EventCard session={session} showcaseRail />
            </div>
          ))}
        </ScrollRail>

        {/* Desktop: grid-4 */}
        <ul className="mt-6 hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-4">
          {events.slice(0, 8).map((session) => (
            <li key={session.id}>
              <EventCard session={session} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
