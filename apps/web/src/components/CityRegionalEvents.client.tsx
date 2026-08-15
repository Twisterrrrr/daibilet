'use client';

import { CalendarDays } from 'lucide-react';

import {
  CityHubSectionHeading,
  HUB_SECTION_PAD_BOTTOM_HALF,
  HUB_SECTION_PAD_TOP,
  HUB_SECTION_PAD_TOP_HALF,
} from '@/components/CityHubSectionHeading';
import { listCityRegionalEvents, listCityRegionalPastEvents, regionalEventStatusLabel } from '@/lib/city-regional-events';

type Props = {
  citySlug: string;
  editorial?: boolean;
  /** Inside continuous #affiche zone (after collections / with near-city). */
  nested?: boolean;
};

export function CityRegionalEvents({ citySlug, editorial = false, nested = false }: Props) {
  const events = listCityRegionalEvents(citySlug);
  const past = listCityRegionalPastEvents(citySlug);
  if (!events.length && !past.length) return null;

  /** 3-col desktop grid when 2+ cards; single festival stays full-width. */
  const eventsGridClass =
    events.length >= 2 ? 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3' : 'grid gap-3';

  return (
    <section
      className={
        nested
          ? editorial
            ? 'border-t border-zinc-200/80'
            : 'border-t border-slate-100'
          : `border-b ${editorial ? 'border-zinc-200' : 'border-slate-100'}`
      }
      data-city-regional-events={nested ? 'nested' : 'standalone'}
    >
      <div
        className={`container-page ${
          nested
            ? `${HUB_SECTION_PAD_TOP_HALF} ${HUB_SECTION_PAD_BOTTOM_HALF}`
            : `${HUB_SECTION_PAD_TOP} ${HUB_SECTION_PAD_BOTTOM_HALF}`
        }`}
      >
        <CityHubSectionHeading
          title="Фестивали и крупные события"
          description="Анонсы и прошедшие фестивали рядом с городом"
          editorial={editorial}
        />
        <div className="mt-5 flex flex-col gap-5">
          {events.length ? (
            <ul className={eventsGridClass}>
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
            <aside
              className={`rounded-2xl border p-4 ${
                editorial ? 'border-zinc-200 bg-zinc-50' : 'border-slate-200 bg-slate-50'
              }`}
              data-city-regional-past
            >
              <h3 className={`text-sm font-semibold ${editorial ? 'text-zinc-800' : 'text-slate-800'}`}>
                Прошедшие фестивали сезона
              </h3>
              <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {past.map((event) => (
                  <li
                    key={event.id}
                    className={`rounded-xl px-3 py-2 text-sm ${
                      editorial ? 'bg-white text-zinc-600' : 'bg-white text-slate-600'
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
            </aside>
          ) : null}
        </div>
      </div>
    </section>
  );
}
