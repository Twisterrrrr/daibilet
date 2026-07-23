'use client';

import Link from 'next/link';
import { useState } from 'react';

type MapCity = {
  slug: string;
  name: string;
  x: number;
  y: number;
};

const HOTSPOTS: MapCity[] = [
  { slug: 'moscow', name: 'Москва', x: 520, y: 250 },
  { slug: 'saint-petersburg', name: 'Санкт-Петербург', x: 430, y: 160 },
  { slug: 'kazan', name: 'Казань', x: 580, y: 270 },
];

/**
 * Simplified RF outline with hover hotspots for top cities.
 * Decorative + navigational - not a precise geo projection.
 */
export function RussiaMap({ className = '' }: { className?: string }) {
  const [hover, setHover] = useState<string | null>(null);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`.trim()}>
      <svg viewBox="0 0 1000 560" className="h-auto w-full" role="img" aria-label="Карта России: Москва, Санкт-Петербург, Казань">
        <defs>
          <linearGradient id="rfFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#f1f5f9" />
          </linearGradient>
        </defs>
        <path
          d="M120 180 C180 120 260 100 340 110 C400 80 460 70 520 90 C600 70 700 90 780 130 C860 160 920 210 940 280 C950 340 930 400 880 430 C800 470 700 480 620 460 C540 490 460 500 380 470 C300 490 220 470 160 420 C110 370 90 280 120 180 Z"
          fill="url(#rfFill)"
          stroke="#94a3b8"
          strokeWidth="3"
        />
        <path
          d="M480 455 C500 470 530 475 550 465 C540 490 510 495 490 480 Z"
          fill="#e2e8f0"
          stroke="#94a3b8"
          strokeWidth="2"
        />
        {HOTSPOTS.map((city) => {
          const active = hover === city.slug;
          return (
            <a
              key={city.slug}
              href={`/cities/${city.slug}`}
              onMouseEnter={() => setHover(city.slug)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(city.slug)}
              onBlur={() => setHover(null)}
            >
              <circle
                cx={city.x}
                cy={city.y}
                r={active ? 18 : 12}
                fill={active ? '#2563eb' : '#1e293b'}
                className="transition-all duration-200"
              />
              <circle
                cx={city.x}
                cy={city.y}
                r={active ? 28 : 20}
                fill="none"
                stroke={active ? '#60a5fa' : '#94a3b8'}
                strokeWidth="2"
                opacity={active ? 1 : 0.5}
              />
              <text
                x={city.x}
                y={city.y - (active ? 34 : 28)}
                textAnchor="middle"
                fill="#1e293b"
                fontSize="18"
                fontWeight="600"
                style={{ fontFamily: 'Space Grotesk, system-ui, sans-serif' }}
              >
                {city.name}
              </text>
            </a>
          );
        })}
      </svg>
      <div className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-100 px-4 py-3">
        {HOTSPOTS.map((city) => (
          <Link
            key={`chip-${city.slug}`}
            href={`/cities/${city.slug}`}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-800"
          >
            {city.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
