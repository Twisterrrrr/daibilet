'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';

import { EventCard } from '@/components/EventCard';
import type { PublicSessionDto } from '@daibilet/contracts/public';
import { buildCatalogHref } from '@/lib/catalog-url';
import type { HomeNowTab, HomeNowTabKey } from '@/lib/home-now-section';
import { pickDefaultHomeNowTab } from '@/lib/home-now-section';

export function HomeNowSection({ tabs }: { tabs: HomeNowTab[] }) {
  const [activeTab, setActiveTab] = useState<HomeNowTabKey>(() => pickDefaultHomeNowTab(tabs));
  const current = tabs.find((tab) => tab.key === activeTab) || tabs[0];

  useEffect(() => {
    if (!tabs.some((tab) => tab.key === activeTab)) {
      setActiveTab(pickDefaultHomeNowTab(tabs));
    }
  }, [activeTab, tabs]);

  if (!current) return null;

  return (
    <section id="events" className="section-y bg-surface-muted">
      <div className="container-page min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Куда сходить сейчас</h2>
            <p className="mt-1 text-sm text-slate-500">{current.subtitle}</p>
          </div>
          <Link
            href={buildCatalogHref(current.catalogQuery)}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            {current.title} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => {
            const active = tab.key === current.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-primary/30'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="horizontal-snap-row mt-5 touch-pan-x" key={current.key}>
          <div className="horizontal-snap-track">
            {current.events.map((event) => (
              <div key={`${current.key}-${event.id}-${event.startsAt}`} className="showcase-rail-card">
                <EventCard session={event} showcaseRail />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomeEventRail({
  id,
  title,
  subtitle,
  href,
  events,
  editorsPickBadge = false,
}: {
  id?: string;
  title: string;
  subtitle: string;
  href: string;
  events: PublicSessionDto[];
  editorsPickBadge?: boolean;
}) {
  if (!events.length) return null;

  return (
    <section id={id} className="section-y">
      <div className="container-page min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700">
            Смотреть все <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="horizontal-snap-row mt-5 touch-pan-x">
          <div className="horizontal-snap-track">
            {events.map((event) => (
              <div key={event.id} className="showcase-rail-card">
                <EventCard session={event} showcaseRail editorsPickBadge={editorsPickBadge} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
