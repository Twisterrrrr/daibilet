'use client';

import Link from 'next/link';
import { MapPin, X } from 'lucide-react';
import { useCallback, useMemo, useState, useTransition } from 'react';

import { formatNumber, pluralEvents } from '@/lib/format';
import type { VenueMapMarker, VenueMapTip } from '@/lib/venue-map-types';

/** Approximate Russia mainland bounds for simple pin projection. */
const BOUNDS = {
  minLat: 41.2,
  maxLat: 70.0,
  minLng: 19.5,
  maxLng: 170.0,
};

function project(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * 100;
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * 100;
  return {
    x: Math.max(2, Math.min(98, x)),
    y: Math.max(4, Math.min(96, y)),
  };
}

/**
 * Client map for /locations: receives only flat `{ id, lat, lng }[]`.
 * Marker click loads tip via lightweight API (no huge JSON in RSC props).
 */
export function LocationsPinMap({
  markers,
  className = '',
}: {
  markers: VenueMapMarker[];
  className?: string;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tip, setTip] = useState<VenueMapTip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const plotted = useMemo(
    () =>
      markers.map((marker) => ({
        ...marker,
        ...project(marker.lat, marker.lng),
      })),
    [markers],
  );

  const onSelect = useCallback((id: string) => {
    setActiveId(id);
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/public/venues/map-tip?id=${encodeURIComponent(id)}`);
        if (!response.ok) {
          setTip(null);
          setError('Не удалось загрузить точку');
          return;
        }
        const payload = (await response.json()) as { tip?: VenueMapTip };
        setTip(payload.tip || null);
      } catch {
        setTip(null);
        setError('Сеть недоступна');
      }
    });
  }, []);

  const clear = () => {
    setActiveId(null);
    setTip(null);
    setError(null);
  };

  return (
    <div
      className={`flex h-full min-h-0 flex-col self-stretch overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`.trim()}
      role="region"
      aria-label="Карта локаций"
    >
      <div className="relative flex-1 min-h-[14rem] bg-gradient-to-br from-slate-50 via-sky-50/80 to-emerald-50/40">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.28]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgb(148 163 184 / 0.3) 1px, transparent 1px), linear-gradient(to bottom, rgb(148 163 184 / 0.3) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
          aria-hidden
        />
        <p className="absolute left-3 top-3 z-10 rounded-lg bg-white/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 shadow-sm">
          {formatNumber(markers.length)} точек
        </p>
        {plotted.map((marker) => {
          const active = marker.id === activeId;
          return (
            <button
              key={marker.id}
              type="button"
              aria-label="Точка на карте"
              onClick={() => onSelect(marker.id)}
              className={`absolute z-[1] -translate-x-1/2 -translate-y-full rounded-full p-0.5 transition ${
                active ? 'z-[2] scale-110 text-primary-700' : 'text-sky-700 hover:scale-110 hover:text-primary-600'
              }`}
              style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
            >
              <MapPin className={`h-5 w-5 drop-shadow-sm ${active ? 'fill-primary-100' : 'fill-white'}`} aria-hidden />
            </button>
          );
        })}

        {(tip || error || pending) && activeId ? (
          <div className="absolute inset-x-3 bottom-3 z-20 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {pending && !tip ? (
                  <p className="text-sm text-slate-500">Загрузка…</p>
                ) : error ? (
                  <p className="text-sm text-rose-600">{error}</p>
                ) : tip ? (
                  <>
                    <p className="truncate text-sm font-semibold text-slate-900">{tip.name}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {[tip.city, tip.address].filter(Boolean).join(' · ')}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-600">
                      {tip.events > 0 ? pluralEvents(tip.events) : 'Скоро в афише'}
                    </p>
                    <Link
                      href={tip.href}
                      className="mt-2 inline-flex text-xs font-semibold text-primary-700 hover:text-primary-800 hover:underline"
                    >
                      Открыть локацию
                    </Link>
                  </>
                ) : null}
              </div>
              <button
                type="button"
                onClick={clear}
                className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Закрыть"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
        <span className="text-xs text-slate-500">Клик по маркеру - краткая карточка</span>
        <Link href="/cities" className="text-xs font-semibold text-primary-700 hover:text-primary-800 hover:underline">
          Города
        </Link>
      </div>
    </div>
  );
}
