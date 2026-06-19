import * as React from 'react';
import { Award, CalendarDays, ChevronRight, Clock, Flame, MapPin, Ticket } from 'lucide-react';

import { formatMoney } from '@/data';
import { eventHref } from '@/routes';
import type { PublicSession } from '@/types';

type EventCardProps = {
  event: PublicSession;
  compact?: boolean;
};

export function EventCard({ event, compact = false }: EventCardProps) {
  const [hasImageError, setHasImageError] = React.useState(false);
  const showLowTickets = typeof event.vacant === 'number' && event.vacant > 0 && event.vacant <= 20;
  const hasPrice = typeof event.priceFrom === 'number' && event.priceFrom >= 100;
  const showImage = Boolean(event.imageUrl && !hasImageError);
  const detailsHref = eventHref(event);
  const highlights = event.tags.slice(0, 3);
  const upcomingSlots = (event.upcomingSlots || []).slice(0, 4);
  const sessionCount = event.sessionCount || upcomingSlots.length || 1;
  const destinationLabel = event.destinationType === 'region' && event.destination ? event.destination : event.city;

  return (
    <a
      href={detailsHref}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_46px_rgba(15,23,42,0.14)]"
    >
      <div className={`relative overflow-hidden bg-slate-100 ${compact ? 'h-36 sm:h-40' : 'h-40 sm:h-52'}`}>
        <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary-50 via-slate-100 to-amber-50 transition-opacity duration-300 ${showImage ? 'opacity-0' : 'opacity-100'}`}>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/75 text-primary-600 shadow-sm">
            <Ticket className="h-6 w-6" />
          </div>
        </div>

        {showImage ? (
          <img
            src={event.imageUrl || ''}
            alt={event.title}
            loading="lazy"
            onError={() => setHasImageError(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : null}

        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent opacity-75 transition-opacity group-hover:opacity-100" />

        <div className="absolute left-3 top-3 flex flex-col gap-1">
          {event.landingSlugs.length > 0 ? (
            <span className="flex items-center gap-1 rounded-full bg-amber-400/95 px-2.5 py-1 text-[11px] font-semibold text-amber-950 shadow-sm backdrop-blur-sm">
              <Award className="h-3.5 w-3.5" />
              Рекомендуем
            </span>
          ) : null}
          {showLowTickets ? (
            <span className="flex items-center gap-1 rounded-full bg-red-500/90 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm backdrop-blur-sm">
              <Flame className="h-3.5 w-3.5" />
              {event.vacant} мест
            </span>
          ) : null}
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
          <span className="min-w-0 rounded-full bg-white/92 px-3 py-1 text-xs font-semibold text-slate-800 shadow-sm backdrop-blur">
            {event.category}
          </span>
          {sessionCount > 1 ? (
            <span className="shrink-0 rounded-full bg-primary-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
              {sessionCount} сеансов
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary-700">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span className="truncate">{event.dateLabel}</span>
          <span className="text-slate-300">·</span>
          <Clock className="h-4 w-4 shrink-0 text-primary-500" />
          <span>{event.timeLabel}</span>
        </div>

        <h3 className="mt-2 line-clamp-2 text-base font-bold leading-snug text-slate-950 transition-colors group-hover:text-primary-600">
          {event.title}
        </h3>

        <div className="mt-2 grid gap-1.5 text-xs leading-relaxed text-slate-500">
          <span className="flex min-w-0 items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{destinationLabel}</span>
          </span>
          {event.destinationType === 'region' && event.city ? <span className="line-clamp-1 pl-5 text-slate-400">{event.city}</span> : null}
          {event.venue ? (
            <span className="line-clamp-1 pl-5 text-slate-600">{event.venue}</span>
          ) : null}
        </div>

        {upcomingSlots.length > 1 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {upcomingSlots.map((slot) => (
              <span key={`${slot.eventId || event.id}:${slot.startsAt}`} className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold leading-none text-slate-700">
                {shortSlotLabel(slot.dateLabel, slot.timeLabel)}
              </span>
            ))}
            {sessionCount > upcomingSlots.length ? (
              <span className="rounded-lg bg-primary-50 px-2 py-1 text-[11px] font-semibold leading-none text-primary-700">
                +{sessionCount - upcomingSlots.length}
              </span>
            ) : null}
          </div>
        ) : null}

        {highlights.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {highlights.map((tag) => (
              <span key={tag} className="line-clamp-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-400">Билеты</div>
            <div className="mt-0.5 text-base font-extrabold text-slate-950">{hasPrice ? formatMoney(event.priceFrom) : 'уточняется'}</div>
          </div>
          {event.purchaseUrl ? (
            <span className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-primary-600 px-3.5 text-sm font-bold text-white shadow-sm transition group-hover:bg-primary-700">
              <Ticket className="h-4 w-4" />
              Открыть
              <ChevronRight className="h-4 w-4" />
            </span>
          ) : (
            <span className="text-xs font-semibold text-slate-400">Нет ссылки</span>
          )}
        </div>
      </div>
    </a>
  );
}

function shortSlotLabel(dateLabel: string, timeLabel: string): string {
  const compactDate = String(dateLabel || '').replace(/^[^,]+,\s*/, '');
  return [compactDate, timeLabel].filter(Boolean).join(' · ');
}
