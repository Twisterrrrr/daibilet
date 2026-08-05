'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { pluralEvents } from '@/lib/format';

type MapPin = {
  slug: string;
  name: string;
  /** Percent positions on a simplified Russia silhouette board. */
  left: number;
  top: number;
};

/** Major cities as clickable pins - no topoJSON / heavy map deps. */
const PINS: MapPin[] = [
  { slug: 'saint-petersburg', name: 'Санкт-Петербург', left: 18, top: 28 },
  { slug: 'moscow', name: 'Москва', left: 24, top: 42 },
  { slug: 'kaliningrad', name: 'Калининград', left: 6, top: 36 },
  { slug: 'kazan', name: 'Казань', left: 34, top: 44 },
  { slug: 'nizhny-novgorod', name: 'Нижний Новгород', left: 30, top: 40 },
  { slug: 'samara', name: 'Самара', left: 36, top: 52 },
  { slug: 'sochi', name: 'Сочи', left: 28, top: 72 },
  { slug: 'ekaterinburg', name: 'Екатеринбург', left: 48, top: 38 },
  { slug: 'novosibirsk', name: 'Новосибирск', left: 62, top: 46 },
  { slug: 'irkutsk', name: 'Иркутск', left: 74, top: 52 },
  { slug: 'vladivostok', name: 'Владивосток', left: 92, top: 62 },
];

type RussiaMapProps = {
  className?: string;
  destinations?: PublicDestinationDto[];
};

/**
 * Compact interactive pin-board for `/cities` hero.
 * Hover tooltip shows event count when destinations are provided.
 */
export function RussiaMap({ className = '', destinations = [] }: RussiaMapProps) {
  const [hover, setHover] = useState<string | null>(null);

  const eventsBySlug = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of destinations) {
      if (item.type !== 'city') continue;
      const key = (item.slug || item.sourceSlug || '').toLowerCase();
      if (key) map.set(key, item.events);
    }
    return map;
  }, [destinations]);

  return (
    <div
      className={`flex h-full min-h-0 flex-col self-stretch overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`.trim()}
      role="navigation"
      aria-label="Карта городов"
    >
      <div className="relative flex flex-1 flex-col bg-gradient-to-br from-slate-50 via-sky-50/40 to-primary-50/30 px-3 py-3 sm:px-4 sm:py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">По России</p>
        <div className="relative mt-2 min-h-[11rem] flex-1 sm:min-h-[12.5rem]">
          {/* Simplified land mass */}
          <svg viewBox="0 0 100 70" className="absolute inset-0 h-full w-full text-slate-200/80" aria-hidden>
            <path
              fill="currentColor"
              d="M4 28 C8 18, 16 14, 22 16 C28 12, 34 14, 40 18 C48 14, 58 16, 68 22 C78 18, 88 24, 96 32 C94 42, 88 50, 80 54 C72 60, 62 58, 54 52 C46 58, 36 60, 28 56 C18 60, 10 52, 6 42 Z"
            />
            <path
              fill="none"
              stroke="rgb(148 163 184 / 0.45)"
              strokeWidth="0.4"
              d="M4 28 C8 18, 16 14, 22 16 C28 12, 34 14, 40 18 C48 14, 58 16, 68 22 C78 18, 88 24, 96 32 C94 42, 88 50, 80 54 C72 60, 62 58, 54 52 C46 58, 36 60, 28 56 C18 60, 10 52, 6 42 Z"
            />
          </svg>

          {PINS.map((pin) => {
            const events = eventsBySlug.get(pin.slug) ?? 0;
            const active = hover === pin.slug;
            return (
              <div
                key={pin.slug}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${pin.left}%`, top: `${pin.top}%` }}
              >
                <Link
                  href={`/cities/${pin.slug}`}
                  onMouseEnter={() => setHover(pin.slug)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(pin.slug)}
                  onBlur={() => setHover(null)}
                  className={`relative block h-3 w-3 rounded-full border-2 border-white shadow transition ${
                    active
                      ? 'scale-125 bg-primary-600 ring-4 ring-primary-200'
                      : 'bg-primary-500 hover:scale-110 hover:bg-primary-600'
                  }`}
                  aria-label={
                    events > 0 ? `${pin.name}: ${pluralEvents(events)}` : `${pin.name}`
                  }
                >
                  <span className="sr-only">{pin.name}</span>
                </Link>
                {active ? (
                  <div
                    className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-max max-w-[11rem] -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left shadow-lg"
                    role="tooltip"
                  >
                    <p className="text-xs font-semibold text-slate-900">{pin.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {events > 0 ? pluralEvents(events) : 'Скоро события'}
                    </p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5">
        <span className="text-xs text-slate-500">Наведите на точку</span>
        <a href="#cities-all" className="text-xs font-semibold text-primary-700 hover:text-primary-800 hover:underline">
          Все города
        </a>
      </div>
    </div>
  );
}
