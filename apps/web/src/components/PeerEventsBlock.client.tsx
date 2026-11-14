'use client';

import Link from 'next/link';
import { MapPin, Calendar, Ticket, ChevronDown } from 'lucide-react';
import * as React from 'react';

type PeerEvent = {
  id: string;
  slug: string;
  eventPageSlug?: string | null;
  title: string;
  city: string;
  citySlug: string;
  venue: string;
  venueSlug: string;
  startsAt: string | null;
  timeZone?: string | null;
  priceFrom: number | null;
};

function formatPeerDate(startsAt: string | null, timeZone?: string | null): string {
  if (!startsAt) return '';
  const date = new Date(startsAt);
  const parts = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  }).formatToParts(date);
  const day = parts.find((part) => part.type === 'day')?.value;
  const month = parts.find((part) => part.type === 'month')?.value?.replace('.', '');
  const hour = parts.find((part) => part.type === 'hour')?.value;
  const minute = parts.find((part) => part.type === 'minute')?.value;
  return `${day} ${month}, ${hour}:${minute}`;
}

function pluralCities(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word = mod10 === 1 && mod100 !== 11
    ? 'городе'
    : 'городах';
  return `Ещё в ${count} ${word}`;
}

export function PeerEventsHeroSwitcher({ peers }: { peers: PeerEvent[] }) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const indexablePeers = peers.filter((peer) => Boolean(peer.eventPageSlug));
  React.useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', closeOnOutsideClick);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('pointerdown', closeOnOutsideClick);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);
  if (!indexablePeers.length) return null;

  return (
    <div ref={rootRef} className="relative mt-3 max-w-full sm:mt-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="tour-city-options"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/25 bg-slate-950/75 px-3.5 py-2 text-sm font-semibold text-white shadow-sm backdrop-blur transition hover:bg-slate-950/90"
      >
        <MapPin className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate">{pluralCities(indexablePeers.length)}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open ? (
        <div
          id="tour-city-options"
          role="region"
          aria-label="Событие в других городах"
          className="absolute left-0 top-full z-50 mt-2 max-h-[min(65vh,30rem)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 text-slate-900 shadow-2xl sm:w-[min(28rem,calc(100vw-2rem))]"
        >
          <p className="px-3 pb-2 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Ближайшие события в других городах
          </p>
          <div className="space-y-1">
            {indexablePeers.map((peer) => {
              const href = `/events/${encodeURIComponent(peer.eventPageSlug!)}`;
              const dateLabel = formatPeerDate(peer.startsAt, peer.timeZone);
              return (
                <Link
                  key={`${peer.citySlug}:${peer.eventPageSlug || peer.id}`}
                  href={href}
                  aria-label={[peer.city, dateLabel, peer.venue, peer.priceFrom ? `от ${peer.priceFrom} ₽` : null].filter(Boolean).join(', ')}
                  onClick={() => setOpen(false)}
                  className="flex items-start justify-between gap-3 rounded-xl px-3 py-3 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <span className="truncate">{peer.city}</span>
                    </span>
                    {dateLabel ? (
                      <span className="mt-1 flex items-center gap-1.5 pl-6 text-xs text-slate-600">
                        <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span>{dateLabel}</span>
                      </span>
                    ) : null}
                    {peer.venue ? <span className="mt-1 block truncate pl-6 text-xs text-slate-500">{peer.venue}</span> : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-1 pt-0.5 text-xs font-semibold text-slate-800">
                    {peer.priceFrom ? `от ${peer.priceFrom.toLocaleString('ru-RU')} ₽` : 'Билеты'}
                    <Ticket className="h-3.5 w-3.5 text-primary" aria-hidden />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
