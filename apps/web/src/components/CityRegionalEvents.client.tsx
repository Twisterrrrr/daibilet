'use client';

import { CalendarDays } from 'lucide-react';

import { listCityRegionalEvents, listCityRegionalPastEvents, regionalEventStatusLabel } from '@/lib/city-regional-events';

type Props = {
  citySlug: string;
  editorial?: boolean;
};

export function CityRegionalEvents({ citySlug, editorial = false, }: Props) {
  const events = listCityRegionalEvents(citySlug);
  const past = listCityRegionalPastEvents(citySlug);
  if (!events.length && !past.length) return null;

  return (
    <section
      id="region-events"
      className={`border-b ${editorial ? 'border-zinc-200' : 'border-slate-100'} scroll-mt-[calc(var(--site-header-height)+3.25rem)]`}
      data-city-regional-events
    >
      <div className={`container-page ${editorial ? 'py-12 sm:py-14' : 'py-8'}`}>
        <h2
          className={
            editorial
              ? 'font-serif text-3xl font-semibold text-zinc-950 sm:text-4xl'
              : 'text-2xl font-bold text-slate-950'
          }
        >
          События региона
        </h2>
        <p className={`mt-2 max-w-3xl text-sm leading-6 ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>
          Крупные фестивали сезона - не дубль афиши, а короткий ориентир. Даты из официальных анонсов, без выдуманного API.
        </p>
        {events.length ? (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <li
              key={event.id}
              className={`rounded-2xl border p-4 ${
                editorial ? 'border-zinc-200 bg-white' : 'border-slate-200 bg-white'
              }`}
              data-city-regional-event={event.id}
              data-status={event.status}
            >
              <div className="flex items-start justify-between gap-3">
                <p className={`text-sm font-semibold leading-5 ${editorial ? 'text-zinc-950' : 'text-slate-950'}`}>
                  {event.title}
                </p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    event.status === 'upcoming'
                      ? 'bg-emerald-50 text-emerald-800'
                      : event.status === 'now'
                        ? 'bg-sky-50 text-sky-800'
                        : editorial
                          ? 'bg-zinc-100 text-zinc-500'
                          : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {regionalEventStatusLabel(event.status)}
                </span>
              </div>
              <p className={`mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>
                <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {event.datesLabel}
              </p>
              <p className={`mt-1 text-xs ${editorial ? 'text-zinc-500' : 'text-slate-500'}`}>{event.place}</p>
              <p className={`mt-2 text-sm leading-6 ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>{event.blurb}</p>
              <a
                href={event.href || event.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-3 inline-flex text-xs font-semibold underline decoration-slate-300 underline-offset-2 hover:decoration-current ${
                  editorial ? 'text-zinc-800' : 'text-slate-800'
                }`}
              >
                Источник: {event.sourceLabel}
              </a>
            </li>
          ))}
        </ul>
        ) : null}
        {past.length ? (
          <details className="mt-5" data-city-regional-past>
            <summary
              className={`cursor-pointer list-none text-sm font-semibold ${
                editorial ? 'text-zinc-600 hover:text-zinc-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Прошедшие фестивали сезона ({past.length})
            </summary>
            <ul className="mt-3 space-y-2">
              {past.map((event) => (
                <li
                  key={event.id}
                  className={`rounded-xl px-3 py-2 text-sm ${
                    editorial ? 'bg-zinc-100 text-zinc-600' : 'bg-slate-50 text-slate-600'
                  }`}
                  data-city-regional-event={event.id}
                  data-status="past"
                >
                  <span className={editorial ? 'font-semibold text-zinc-800' : 'font-semibold text-slate-800'}>
                    {event.title}
                  </span>
                  <span className="mx-1.5">·</span>
                  {event.datesLabel}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </section>
  );
}
