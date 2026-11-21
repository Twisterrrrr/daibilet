'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, MapPin } from 'lucide-react';

import { readRecentViews, type RecentViewItem } from '@/lib/recent-views';

/** «Просмотрено ранее» - только при наличии истории в localStorage. */
export function RecentViewsRail() {
  const [items, setItems] = useState<RecentViewItem[]>([]);

  useEffect(() => {
    setItems(readRecentViews());
  }, []);

  if (!items.length) return null;

  return (
    <section className="scroll-mt-24">
      <h2 className="text-left text-lg font-bold tracking-tight text-ink">Просмотрено ранее</h2>
      <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex shrink-0 items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-card transition hover:border-accent/40 hover:shadow-card-hover"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
              <MapPin className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 max-w-[14rem] truncate text-sm font-semibold text-ink group-hover:text-accent">
              {item.title}
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-ink-muted-2" aria-hidden />
          </Link>
        ))}
      </div>
    </section>
  );
}