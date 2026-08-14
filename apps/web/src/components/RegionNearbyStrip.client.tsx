'use client';

import Link from 'next/link';
import { MapPin, Ticket } from 'lucide-react';

import { formatPriceFrom } from '@/lib/format';
import type { PublicRegionNearbyDto } from '@daibilet/contracts/public';

export function RegionNearbyStrip({
  nearby,
  editorial = false,
}: {
  nearby: PublicRegionNearbyDto;
  editorial?: boolean;
}) {
  if (!nearby.events?.length) return null;

  return (
    <section
      id="region-nearby"
      className={
        editorial
          ? 'border-b border-zinc-200 bg-emerald-50/40'
          : 'border-b border-slate-100 bg-emerald-50/50'
      }
      aria-label={nearby.title}
    >
      <div className={`container-page ${editorial ? 'py-10 sm:py-12' : 'py-8 sm:py-10'}`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2
              className={
                editorial
                  ? 'font-serif text-2xl font-semibold text-zinc-950 sm:text-3xl'
                  : 'text-xl font-bold text-slate-950 sm:text-2xl'
              }
            >
              {nearby.title}
            </h2>
            <p className={`mt-2 max-w-3xl text-sm leading-6 ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>
              {nearby.subtitle}
            </p>
          </div>
          <Link
            href={`/cities/${encodeURIComponent(nearby.regionSlug)}`}
            className="shrink-0 text-sm font-medium text-emerald-900 underline-offset-4 hover:underline"
          >
            Все события региона
          </Link>
        </div>

        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {nearby.events.map((event) => (
            <li key={event.id}>
              <article className="flex h-full flex-col rounded-xl border border-emerald-200/80 bg-white p-4 shadow-sm">
                <h3 className="text-base font-semibold leading-snug text-slate-950">{event.title}</h3>
                <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
                  {event.dateLabel || formatNearbyDate(event.startsAt) ? (
                    <span>{event.dateLabel || formatNearbyDate(event.startsAt)}</span>
                  ) : null}
                  <span aria-hidden="true" className="text-slate-300">
                    ·
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                    {event.city}
                  </span>
                </p>
                {event.venue ? <p className="mt-1 text-sm text-slate-500">{event.venue}</p> : null}
                <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                  <span className="text-sm font-semibold text-slate-900">
                    {event.priceFrom && event.priceFrom > 0 ? formatPriceFrom(event.priceFrom) : 'Билеты'}
                  </span>
                  <Link
                    href={event.url}
                    className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    <Ticket className="h-3.5 w-3.5" aria-hidden="true" />
                    Купить билет
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function formatNearbyDate(startsAt?: string | null): string | null {
  if (!startsAt) return null;
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  });
}
