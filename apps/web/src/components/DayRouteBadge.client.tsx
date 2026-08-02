'use client';

import Link from 'next/link';
import { Route } from 'lucide-react';

import { useDayRouteState } from '@/hooks/useDayRouteState';

/**
 * Sticky chrome day-route entry.
 * - Empty: icon; on lg+ also label «Маршрут» (no badge).
 * - Filled: icon + green count badge only (never «Маршрут · N» - digit lives in badge).
 * - Mobile (below lg): icon-first, label hidden.
 */
export function DayRouteBadge({ className = '' }: { className?: string }) {
  const count = useDayRouteState().venues.length;

  return (
    <Link
      href="/my-day"
      title={count ? `Мой день · ${count}` : 'Мой день'}
      aria-label={count ? `Мой день, ${count} точек` : 'Мой день'}
      data-day-route-count={count}
      className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-graphite-muted transition hover:bg-surface-muted hover:text-graphite lg:w-auto lg:gap-1.5 lg:px-2.5 ${className}`}
    >
      <Route className="h-5 w-5" strokeWidth={1.75} />
      {count === 0 ? (
        <span className="hidden text-xs font-semibold lg:inline">Маршрут</span>
      ) : null}
      {count > 0 ? (
        <span
          data-day-route-badge
          className="absolute -right-0.5 -top-0.5 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold leading-4 text-white"
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}
