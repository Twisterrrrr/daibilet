'use client';

import Link from 'next/link';

import { RegionEventCard } from '@/components/RegionEventCard.client';
import type { PublicSessionDto } from '@daibilet/contracts/public';
import { formatCoverDateBadge } from '@/lib/event-card-meta';
import { eventHref, venueHref } from '@/lib/routes';

export function RegionVenueSeriesCard({
  venueName,
  venueSlug,
  city,
  sessions,
  logisticsChip = null,
  expanded,
  onToggle,
}: {
  venueName: string;
  venueSlug: string | null;
  city: string;
  sessions: PublicSessionDto[];
  logisticsChip?: string | null;
  expanded: boolean;
  onToggle: () => void;
}) {
  const count = sessions.length;
  const preview = sessions.slice(0, 8);
  const venueLink = venueSlug
    ? venueHref({ slug: venueSlug, name: venueName })
    : null;

  return (
    <article className="col-span-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Серия на площадке</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-950">
            {venueLink ? (
              <Link href={venueLink} className="hover:text-emerald-800">
                {venueName}
              </Link>
            ) : (
              venueName
            )}
            <span className="font-medium text-slate-500">
              {' '}
              ({count} {pluralConcerts(count)})
            </span>
          </h3>
          <p className="mt-0.5 text-sm text-slate-500">
            {[city, logisticsChip].filter(Boolean).join(' · ')}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          {expanded ? 'Свернуть' : 'Показать все'}
        </button>
      </div>

      {!expanded ? (
        <div className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-5">
          {preview.map((session) => {
            const badge = formatCoverDateBadge(session);
            return (
              <Link
                key={session.id || session.slug}
                href={eventHref(session)}
                className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left hover:border-slate-300 hover:bg-white"
              >
                <span className="block text-xs font-semibold text-slate-900">{badge || 'Скоро'}</span>
                <span className="mt-0.5 block max-w-[10rem] truncate text-xs text-slate-500">
                  {session.title}
                </span>
              </Link>
            );
          })}
          {count > preview.length ? (
            <button
              type="button"
              onClick={onToggle}
              className="shrink-0 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600"
            >
              +{count - preview.length}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
          {sessions.map((session) => (
            <RegionEventCard
              key={session.id || session.slug}
              session={session}
              logisticsChip={logisticsChip}
            />
          ))}
        </div>
      )}
    </article>
  );
}

function pluralConcerts(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'событий';
  if (mod10 === 1) return 'событие';
  if (mod10 >= 2 && mod10 <= 4) return 'события';
  return 'событий';
}
