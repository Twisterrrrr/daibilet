'use client';

import * as React from 'react';
import Link from 'next/link';

import { EventCard } from '@/components/EventCard';
import { ScrollRail } from '@/components/ScrollRail.client';
import {
  groupStandupInHubFeed,
  rankCityHubSessions,
} from '@/lib/city-hub-affiche';
import { formatCoverDateBadge } from '@/lib/event-card-meta';
import { eventHref, venueHref } from '@/lib/routes';
import type { PublicSessionDto } from '@daibilet/contracts/public';

/**
 * Same «Ближайшие события» rail as city hub - poster EventCards + standup series.
 * Shared by CityPageView and RegionPageView (child city / region affiche).
 */
export function HubEventsAfficheRail({
  sessions,
  ariaLabel = 'Ближайшие события',
  className = '',
}: {
  sessions: PublicSessionDto[];
  ariaLabel?: string;
  className?: string;
}) {
  const rows = React.useMemo(
    () => groupStandupInHubFeed(rankCityHubSessions(sessions)).slice(0, 48),
    [sessions],
  );

  if (!rows.length) return null;

  return (
    <div className={className} data-city-events-rail>
      <ScrollRail
        className="mt-1"
        hideScrollbar
        viewportClassName="flex flex-nowrap gap-2.5 snap-x snap-mandatory pb-0.5"
        aria-label={ariaLabel}
      >
        {rows.map((row) =>
          row.kind === 'standup' ? (
            <div
              key={`standup:${row.venueName}`}
              className="w-[min(88%,18.5rem)] shrink-0 snap-start sm:w-[20rem]"
              data-rail-item
              data-city-standup-series
            >
              <HubStandupSeriesCard sessions={row.sessions} venueName={row.venueName} />
            </div>
          ) : (
            <div
              key={row.session.id || row.session.slug}
              className="w-[min(62%,11.5rem)] shrink-0 snap-start sm:w-[12rem] md:w-[12.5rem] lg:w-[13rem]"
              data-rail-item
              data-city-events-card
            >
              <EventCard session={row.session} showcaseRail cityHub />
            </div>
          ),
        )}
      </ScrollRail>
    </div>
  );
}

function HubStandupSeriesCard({
  sessions,
  venueName,
}: {
  sessions: PublicSessionDto[];
  venueName: string;
}) {
  const dates = sessions.slice(0, 8);
  const venueLink = sessions[0]?.venueSlug
    ? venueHref({ slug: sessions[0].venueSlug, name: venueName })
    : null;
  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Стендап</p>
      {venueLink ? (
        <Link href={venueLink} className="mt-1 text-base font-bold text-slate-950 hover:text-primary-700">
          {venueName}
        </Link>
      ) : (
        <p className="mt-1 text-base font-bold text-slate-950">{venueName}</p>
      )}
      <p className="mt-1 text-xs text-slate-500">{dates.length} дат</p>
      <ul className="mt-3 space-y-2">
        {dates.map((session) => (
          <li key={session.id || session.slug}>
            <Link
              href={eventHref(session)}
              className="block rounded-lg border border-slate-100 px-2.5 py-2 hover:bg-slate-50"
            >
              <span className="text-xs font-semibold text-slate-700">
                {formatCoverDateBadge(session) || 'Дата'}
              </span>
              <span className="mt-0.5 line-clamp-2 block text-sm font-medium text-slate-900">
                {session.title || session.eventTitle}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}
