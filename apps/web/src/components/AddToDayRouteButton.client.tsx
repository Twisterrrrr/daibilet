'use client';

import { Check, Route } from 'lucide-react';

import { useDayRouteState } from '@/hooks/useDayRouteState';
import {
  DAY_ROUTE_MAX,
  addToDayRoute,
  isInDayRoute,
  normalizeDayRouteVenueId,
  removeFromDayRoute,
  toggleDayRoute,
  type DayRouteVenueItem,
} from '@/lib/day-route';

type Props = {
  venue: DayRouteVenueItem;
  className?: string;
  variant?: 'light' | 'dark';
  /** Компактный вид для карточек каталога (иконка + короткий лейбл). */
  compact?: boolean;
  /**
   * `route` - «В мой маршрут» (must-see / venue).
   * `day` - «В мой день» (с события, с временем сессии).
   */
  intent?: 'route' | 'day';
};

export function AddToDayRouteButton({
  venue,
  className = '',
  variant = 'light',
  compact = false,
  intent = 'route',
}: Props) {
  const venueKey = normalizeDayRouteVenueId(venue);
  const route = useDayRouteState();
  const active = Boolean(venueKey) && isInDayRoute(venueKey, route, venue.slug);
  const full = route.venues.length >= DAY_ROUTE_MAX && !active;

  const base =
    variant === 'dark'
      ? active
        ? 'bg-white text-emerald-950'
        : 'bg-white/15 text-white hover:bg-white/25'
      : active
        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
        : 'bg-slate-100 text-slate-800 hover:bg-slate-200';

  const idleLabel = intent === 'day' ? (compact ? 'В день' : 'В мой день') : compact ? 'В маршрут' : 'В мой маршрут';
  const activeLabel = intent === 'day' ? (compact ? 'В дне' : 'В моём дне') : 'В маршруте';
  const label = active ? activeLabel : idleLabel;
  const idleTitle = intent === 'day' ? 'В мой день' : 'В мой маршрут';
  const activeTitle = intent === 'day' ? 'Убрать из дня' : 'Убрать из маршрута';
  const idleAria = intent === 'day' ? 'Добавить место события в мой день' : 'Добавить в маршрут дня';
  const activeAria = intent === 'day' ? 'Убрать место из моего дня' : 'Убрать из маршрута дня';

  function applyToggle() {
    if (!venueKey) return;
    const payload = { ...venue, id: venueKey };
    if (intent === 'day') {
      const before = route;
      const existing = before.venues.find(
        (item) => item.id === venueKey || (payload.slug && item.slug === payload.slug),
      );
      if (existing) {
        const sameEventMeta =
          (existing.eventId || null) === (payload.eventId || null) &&
          (existing.sessionLabel || null) === (payload.sessionLabel || null) &&
          (existing.startsAt || null) === (payload.startsAt || null);
        if (sameEventMeta) {
          removeFromDayRoute(existing.id);
        } else {
          addToDayRoute(payload);
        }
      } else {
        addToDayRoute(payload);
      }
    } else {
      toggleDayRoute(payload);
    }
    // UI follows useDayRouteState snapshot (same source as header badge).
  }

  return (
    <button
      type="button"
      disabled={!venueKey || (full && !active)}
      title={
        !venueKey
          ? 'Нельзя добавить: нет id точки'
          : full && !active
            ? `Лимит ${DAY_ROUTE_MAX} точек`
            : active
              ? activeTitle
              : idleTitle
      }
      aria-pressed={active}
      aria-label={active ? activeAria : idleAria}
      data-venue-id={venueKey || undefined}
      data-day-route-intent={intent}
      onPointerDown={(event) => {
        // Stop bubble to parent <Link>; do NOT preventDefault (kills click on some browsers).
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        applyToggle();
      }}
      className={`inline-flex min-h-10 min-w-[2.75rem] items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${base} ${className}`}
    >
      {active ? <Check className="h-3.5 w-3.5 shrink-0" /> : <Route className="h-3.5 w-3.5 shrink-0" />}
      {/* Always show label - icon-only on mobile was easy to miss vs card Link. */}
      <span>{label}</span>
    </button>
  );
}
