'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { CollectRouteCtaHint } from '@/components/CollectRouteCtaHint.client';
import {
  createNoteDayRouteStopId,
  createTextDayRouteStopId,
  hydrateDayRouteFromShare,
  type DayRouteVenueItem,
} from '@/lib/day-route';
import {
  MY_DAY_COLLECT_CTA_ARIA,
  MY_DAY_COLLECT_CTA_LABEL,
  formatMyDayCollectTooltip,
} from '@/lib/my-day-collect-cta';

export type DayRouteShareStopProp = {
  index: number;
  title: string;
  isText: boolean;
  isNote: boolean;
  timeLabel: string | null;
};

type Props = {
  code: string;
  citySlug: string | null;
  longPath: string;
  stops: DayRouteShareStopProp[];
};

function stopsToVenues(stops: DayRouteShareStopProp[], citySlug: string | null): DayRouteVenueItem[] {
  return stops.map((stop) => {
    const isNote = stop.isNote;
    return {
      id: isNote ? createNoteDayRouteStopId() : createTextDayRouteStopId(),
      title: stop.title,
      note: isNote ? stop.title : null,
      citySlug: citySlug || null,
      slug: null,
      href: null,
      imageUrl: null,
      sessionLabel: stop.timeLabel || null,
    } satisfies DayRouteVenueItem;
  });
}

/**
 * Public `/m` CTAs: open long my-day path, or write localStorage then navigate.
 */
export function DayRouteSharePublicActions({ code, citySlug, longPath, stops }: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [saveOk, setSaveOk] = React.useState(false);
  const [rating, setRating] = React.useState<number | null>(null);
  const [avg, setAvg] = React.useState<number | null>(null);

  async function saveToMyDay() {
    if (busy) return;
    setBusy(true);
    try {
      void fetch(`/api/day-route/share/${encodeURIComponent(code)}/save`, {
        method: 'POST',
      }).catch(() => undefined);

      const venues = stopsToVenues(stops, citySlug);
      if (venues.length) {
        hydrateDayRouteFromShare(venues, citySlug);
      }
      setSaveOk(true);
      router.push(longPath || '/my-day');
    } finally {
      setBusy(false);
    }
  }

  async function submitRating(value: number) {
    if (rating != null) return;
    setRating(value);
    try {
      const res = await fetch(`/api/day-route/share/${encodeURIComponent(code)}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: value }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { averageRating?: number };
      if (typeof data.averageRating === 'number') setAvg(data.averageRating);
    } catch {
      // ignore
    }
  }

  return (
    <div className="mt-8 space-y-4">
      <div className="flex flex-wrap gap-3">
        <CollectRouteCtaHint hint={formatMyDayCollectTooltip(stops.length)}>
          <a
            href={longPath}
            className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
            aria-label={MY_DAY_COLLECT_CTA_ARIA}
            title={formatMyDayCollectTooltip(stops.length)}
          >
            {MY_DAY_COLLECT_CTA_LABEL}
          </a>
        </CollectRouteCtaHint>
        <button
          type="button"
          disabled={busy}
          onClick={() => void saveToMyDay()}
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-primary/40 hover:text-primary-700 disabled:opacity-60"
        >
          {saveOk ? 'Сохранено' : busy ? 'Сохраняем…' : 'Сохранить к себе'}
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white/80 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Оценка маршрута</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              disabled={rating != null}
              onClick={() => void submitRating(value)}
              className={`h-9 w-9 rounded-md text-sm font-semibold transition ${
                rating === value
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-amber-100'
              } disabled:cursor-default`}
              aria-label={`Оценка ${value}`}
            >
              {value}
            </button>
          ))}
          {avg != null ? (
            <span className="text-sm text-slate-600">Средняя: {avg.toFixed(1)}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
