'use client';

import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { useState } from 'react';

type MapCity = {
  slug: string;
  name: string;
  region: string;
};

const HOTSPOTS: MapCity[] = [
  { slug: 'moscow', name: 'Москва', region: 'Центр' },
  { slug: 'saint-petersburg', name: 'Санкт-Петербург', region: 'Северо-Запад' },
  { slug: 'kazan', name: 'Казань', region: 'Поволжье' },
  { slug: 'ekaterinburg', name: 'Екатеринбург', region: 'Урал' },
];

/**
 * Calm rectangular city picker for catalog heroes (cities / locations).
 * Replaces the irregular SVG stub - links stay navigational until a real map lands.
 */
export function RussiaMap({ className = '' }: { className?: string }) {
  const [hover, setHover] = useState<string | null>(null);

  return (
    <div
      className={`flex h-full min-h-0 flex-col self-stretch overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`.trim()}
      role="navigation"
      aria-label="Популярные города"
    >
      <div className="relative flex flex-1 flex-col border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-sky-50 px-5 py-5 sm:px-6 sm:py-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgb(148 163 184 / 0.25) 1px, transparent 1px), linear-gradient(to bottom, rgb(148 163 184 / 0.25) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
          aria-hidden
        />
        <p className="relative text-xs font-semibold uppercase tracking-wider text-slate-500">Популярные города</p>
        <ul className="relative mt-4 space-y-2">
          {HOTSPOTS.map((city) => {
            const active = hover === city.slug;
            return (
              <li key={city.slug}>
                <Link
                  href={`/cities/${city.slug}`}
                  onMouseEnter={() => setHover(city.slug)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(city.slug)}
                  onBlur={() => setHover(null)}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                    active
                      ? 'border-primary-300 bg-primary-50 text-primary-900 shadow-sm'
                      : 'border-slate-200/80 bg-white/80 text-slate-800 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                      active ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <MapPin className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{city.name}</span>
                    <span className="block truncate text-xs text-slate-500">{city.region}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <span className="text-xs text-slate-500">Афиша и площадки по городу</span>
        <Link href="/cities" className="text-xs font-semibold text-primary-700 hover:text-primary-800 hover:underline">
          Все города →
        </Link>
      </div>
    </div>
  );
}
