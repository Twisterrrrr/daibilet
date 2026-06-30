import * as React from 'react';
import { Award, Clock, Flame, MapPin, Star, Ticket } from 'lucide-react';

import { collectCatalogLabels } from '@/lib/catalog-labels';
import { LandingPurchaseButton } from '@/components/landing/LandingPurchaseButton';
import {
  collectDisplaySlotTimes,
  formatNextSession,
  formatPriceRub,
  getDepartingSoonMinutes,
  isEventSessionToday,
  isOpenDate,
  LOW_TICKETS_THRESHOLD,
  MIN_DISPLAY_PRICE_RUB,
  resolvePseudoRating,
} from '@/lib/event-card-meta';
import { formatVacantSeats } from '@/lib/pluralize';
import { eventHref } from '@/routes';
import type { PublicSession } from '@/types';

type EventCardProps = {
  event: PublicSession;
  compact?: boolean;
  /** На лендинге: кнопка открывает виджет, название ведёт на страницу события */
  landingActions?: boolean;
};

export function EventCard({ event, compact = false, landingActions = false }: EventCardProps) {
  const [hasImageError, setHasImageError] = React.useState(false);
  const showImage = Boolean(event.imageUrl && !hasImageError);
  const detailsHref = eventHref(event);
  const hasPrice = typeof event.priceFrom === 'number' && event.priceFrom >= MIN_DISPLAY_PRICE_RUB;
  const showLowTickets =
    typeof event.vacant === 'number' && event.vacant > 0 && event.vacant <= LOW_TICKETS_THRESHOLD;
  const isOptimalChoice = event.landingSlugs.length > 0;
  const destinationLabel = event.destinationType === 'region' && event.destination ? event.destination : event.city;
  const highlights = collectCatalogLabels(event);
  const openDate = isOpenDate(event);
  const departingSoonMinutes = openDate ? null : getDepartingSoonMinutes(event.startsAt);
  const nextSessionLabel = openDate ? null : formatNextSession(event.startsAt);
  const isToday = isEventSessionToday(event);
  const displaySlots = collectDisplaySlotTimes(event, { todayOnly: isToday });
  const showSlotPills = isToday && displaySlots.length > 1;
  const sessionMetaLabel = openDate
    ? null
    : isToday && displaySlots.length > 0
      ? displaySlots.length === 1
        ? `Сегодня, ${displaySlots[0]}`
        : 'Сегодня'
      : nextSessionLabel;
  const pseudoRating = resolvePseudoRating(event.id);
  const cardClassName =
    'group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60';

  const body = (
    <>
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
        {landingActions ? (
          <a href={detailsHref} className="absolute inset-0 z-[1]" aria-label={`Страница события: ${event.title}`} />
        ) : null}
        <div
          className={`absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,_#e5e7eb,_#f3f4f6)] transition-opacity duration-300 ${
            showImage ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300/80 bg-white/60 shadow-sm">
            <div className="h-3.5 w-3.5 rotate-45 rounded-[6px] border border-slate-300/90 bg-slate-200/90" />
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

        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

        <div className="absolute left-2 top-2 flex flex-col gap-1 sm:left-3 sm:top-3">
          {isOptimalChoice ? (
            <span className="flex items-center gap-1 rounded-full bg-amber-400/95 px-2 py-0.5 text-[10px] font-semibold text-amber-950 shadow-sm backdrop-blur-sm sm:px-2.5 sm:py-1 sm:text-xs">
              <Award className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              Рекомендуем
            </span>
          ) : null}
          {showLowTickets ? (
            <span className="flex items-center gap-1 rounded-full bg-red-500/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm sm:px-2.5 sm:py-1 sm:text-xs">
              <Flame className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              {formatVacantSeats(event.vacant ?? 0)}
            </span>
          ) : null}
        </div>

        {hasPrice ? (
          <div className="absolute bottom-2 right-2 flex flex-col items-end gap-0.5 sm:bottom-3 sm:right-3">
            <span className="rounded-full bg-primary-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm sm:px-4 sm:py-2 sm:text-sm">
              от {formatPriceRub(event.priceFrom)} ₽
            </span>
          </div>
        ) : null}

        {openDate ? (
          <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm sm:bottom-3 sm:left-3 sm:px-2.5 sm:py-1 sm:text-xs">
            Открытая дата
          </span>
        ) : departingSoonMinutes ? (
          <span className="absolute bottom-2 left-2 flex animate-pulse items-center gap-1 rounded-full bg-orange-500/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm sm:bottom-3 sm:left-3 sm:px-2.5 sm:py-1 sm:text-xs">
            <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            Через {departingSoonMinutes} мин
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col justify-between p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2 text-[10px] leading-relaxed text-slate-500 sm:text-xs">
          <span className="flex shrink-0 items-center gap-0.5">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400 sm:h-3.5 sm:w-3.5" />
            <span className="font-medium text-slate-700">{pseudoRating.toFixed(1)}</span>
          </span>
          {destinationLabel ? (
            <span className="flex min-w-0 items-center gap-0.5 truncate text-slate-500">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{destinationLabel}</span>
            </span>
          ) : null}
        </div>

        <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-relaxed text-slate-900 transition-colors group-hover:text-primary-600">
          {landingActions ? (
            <a href={detailsHref} className="relative z-[2] hover:text-primary-600">
              {event.title}
            </a>
          ) : (
            event.title
          )}
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] leading-relaxed text-slate-500 sm:gap-x-3 sm:text-xs">
          {openDate ? (
            <span className="font-medium text-emerald-600">Билет с открытой датой</span>
          ) : sessionMetaLabel ? (
            <span className="font-medium text-primary-600">{sessionMetaLabel}</span>
          ) : null}
          {event.venue ? <span className="line-clamp-1">{event.venue}</span> : null}
        </div>

        {highlights.length > 0 ? (
          <ul className="mt-2 space-y-0.5 text-[10px] leading-relaxed text-slate-600 sm:text-xs">
            {highlights.map((highlight) => (
              <li key={highlight} className="flex gap-1.5">
                <span className="text-primary-500">•</span>
                <span className="line-clamp-1">{highlight}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-2 flex min-h-6 flex-wrap items-start gap-1.5">
          {showSlotPills
            ? displaySlots.map((time) => (
                <span
                  key={time}
                  className="inline-flex h-6 min-h-6 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white px-2.5 text-[10px] font-medium leading-none text-slate-800"
                >
                  {time}
                </span>
              ))
            : null}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          {landingActions ? (
            <LandingPurchaseButton
              session={event}
              label={hasPrice ? `Купить от ${formatPriceRub(event.priceFrom)} ₽` : 'Купить'}
              className="relative z-[2] inline-flex w-full items-center justify-center rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700 sm:text-sm"
              compact
            />
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-medium text-primary-600 sm:text-xs">
              <Ticket className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              Подробнее →
            </span>
          )}
        </div>
      </div>
    </>
  );

  if (landingActions) {
    return <div className={cardClassName}>{body}</div>;
  }

  return (
    <a href={detailsHref} className={cardClassName}>
      {body}
    </a>
  );
}
