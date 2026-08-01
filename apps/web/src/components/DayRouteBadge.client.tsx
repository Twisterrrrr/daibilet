'use client';

import Link from 'next/link';
import { Route } from 'lucide-react';
import { useEffect, useState } from 'react';

import { DAY_ROUTE_CHANGED_EVENT, readDayRoute } from '@/lib/day-route';

export function DayRouteBadge({ className = '' }: { className?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () => setCount(readDayRoute().venues.length);
    sync();
    window.addEventListener(DAY_ROUTE_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(DAY_ROUTE_CHANGED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return (
    <Link
      href="/my-day"
      title={count ? `Мой день · ${count}` : 'Мой день'}
      aria-label={count ? `Мой день, ${count} точек` : 'Мой день'}
      data-day-route-count={count}
      className={`relative inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 text-graphite-muted transition hover:bg-surface-muted hover:text-graphite sm:px-2.5 ${className}`}
    >
      <Route className="h-5 w-5" strokeWidth={1.75} />
      <span className="text-xs font-semibold">
        {count > 0 ? `Маршрут · ${count}` : 'Маршрут'}
      </span>
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
