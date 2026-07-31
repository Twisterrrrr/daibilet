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
      title="Мой день"
      aria-label={count ? `Мой день, ${count} точек` : 'Мой день'}
      className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-graphite-muted transition hover:bg-surface-muted hover:text-graphite ${className}`}
    >
      <Route className="h-5 w-5" strokeWidth={1.75} />
      {count > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold leading-4 text-white">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
