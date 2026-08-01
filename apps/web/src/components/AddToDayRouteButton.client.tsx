'use client';

import { Check, Route } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  DAY_ROUTE_CHANGED_EVENT,
  DAY_ROUTE_MAX,
  isInDayRoute,
  readDayRoute,
  toggleDayRoute,
  type DayRouteVenueItem,
} from '@/lib/day-route';

type Props = {
  venue: DayRouteVenueItem;
  className?: string;
  variant?: 'light' | 'dark';
  /** Компактный вид для карточек каталога (иконка + короткий лейбл). */
  compact?: boolean;
};

export function AddToDayRouteButton({
  venue,
  className = '',
  variant = 'light',
  compact = false,
}: Props) {
  const [active, setActive] = useState(false);
  const [full, setFull] = useState(false);

  useEffect(() => {
    const sync = () => {
      const state = readDayRoute();
      setActive(isInDayRoute(venue.id, state));
      setFull(state.venues.length >= DAY_ROUTE_MAX && !isInDayRoute(venue.id, state));
    };
    sync();
    window.addEventListener(DAY_ROUTE_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(DAY_ROUTE_CHANGED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [venue.id]);

  const base =
    variant === 'dark'
      ? active
        ? 'bg-white text-emerald-950'
        : 'bg-white/15 text-white hover:bg-white/25'
      : active
        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
        : 'bg-slate-100 text-slate-800 hover:bg-slate-200';

  const label = active ? (compact ? 'В маршруте' : 'В маршруте') : compact ? 'В маршрут' : 'В мой маршрут';

  return (
    <button
      type="button"
      disabled={full && !active}
      title={full && !active ? `Лимит ${DAY_ROUTE_MAX} точек` : active ? 'Убрать из маршрута' : 'В мой маршрут'}
      aria-pressed={active}
      aria-label={active ? 'Убрать из маршрута дня' : 'Добавить в маршрут дня'}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const next = toggleDayRoute(venue);
        setActive(isInDayRoute(venue.id, next));
        setFull(next.venues.length >= DAY_ROUTE_MAX && !isInDayRoute(venue.id, next));
      }}
      className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${base} ${className}`}
    >
      {active ? <Check className="h-3.5 w-3.5" /> : <Route className="h-3.5 w-3.5" />}
      {compact ? <span className="hidden sm:inline">{label}</span> : label}
    </button>
  );
}
