'use client';

import Link from 'next/link';
import { MapPin, Calendar, Ticket } from 'lucide-react';
import { eventHref } from '@/lib/routes';
import { formatMoneyRange } from '@/lib/format';

type PeerEvent = {
  id: string;
  slug: string;
  title: string;
  city: string;
  citySlug: string;
  venue: string;
  venueSlug: string;
  startsAt: string | null;
  priceFrom: number | null;
};

function formatPeerDate(startsAt: string | null): string {
  if (!startsAt) return '';
  const date = new Date(startsAt);
  const day = date.getDate();
  const month = date.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '');
  const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return `${day} ${month}, ${time}`;
}

export function PeerEventsBlock({ peers }: { peers: PeerEvent[] }) {
  if (!peers.length) return null;

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-bold text-slate-900">Также выступает в других городах</h2>
      <p className="mt-1 text-sm text-slate-500">
        Тот же спектакль в ближайших городах — выберите удобную дату и площадку.
      </p>

      <div className="mt-4 space-y-3">
        {peers.map((peer) => {
          const href = eventHref({ id: peer.id, slug: peer.slug, title: peer.title });
          const dateLabel = formatPeerDate(peer.startsAt);

          return (
            <Link
              key={peer.id}
              href={href}
              className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 transition hover:border-primary/40 hover:shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span>{peer.city}</span>
                </div>
                <h3 className="mt-1 truncate text-base font-semibold text-slate-900">
                  {peer.venue}
                </h3>
                {dateLabel ? (
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{dateLabel}</span>
                  </div>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-3">
                {peer.priceFrom ? (
                  <span className="text-sm font-semibold text-slate-900">
                    от {peer.priceFrom.toLocaleString('ru-RU')} ₽
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                  <Ticket className="h-4 w-4" />
                  Выбрать
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
