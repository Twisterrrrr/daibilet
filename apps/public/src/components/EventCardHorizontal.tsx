import * as React from 'react';
import { Clock, MapPin, Star, Ticket } from 'lucide-react';

import { collectCatalogLabels } from '@/lib/catalog-labels';
import { resolveEditorialEventImage } from '@/lib/event-cover-images';
import { resolveEventCardDestinationLabel, resolveEventCardLocationLabel } from '@/lib/event-location';
import { EventFavoriteButton } from '@/components/EventFavoriteButton';
import { EventImageBadges } from '@/lib/event-card-badges';
import {
  collectDisplaySlotLabels,
  formatEventNextSession,
  formatListDescription,
  formatPriceRub,
  getDepartingSoonMinutes,
  isOpenDate,
  MIN_DISPLAY_PRICE_RUB,
  resolvePseudoRating,
} from '@/lib/event-card-meta';
import { eventHref } from '@/routes';
import type { PublicSession } from '@/types';

type EventCardHorizontalProps = {
  event: PublicSession;
};

export function EventCardHorizontal({ event }: EventCardHorizontalProps) {
  const [hasImageError, setHasImageError] = React.useState(false);
  const coverImageUrl =
    resolveEditorialEventImage(event.id, event.slug, event.imageUrl) || event.imageUrl || '';
  const showImage = Boolean(coverImageUrl && !hasImageError);
  const detailsHref = eventHref(event);
  const hasPrice = typeof event.priceFrom === 'number' && event.priceFrom >= MIN_DISPLAY_PRICE_RUB;
  const destinationLabel = resolveEventCardDestinationLabel(event);
  const highlights = collectCatalogLabels(event).slice(0, 3);
  const openDate = isOpenDate(event);
  const departingSoonMinutes = openDate ? null : getDepartingSoonMinutes(event.startsAt);
  const nextSessionLabel = openDate ? null : formatEventNextSession(event);
  const displaySlotLabels = collectDisplaySlotLabels(event);
  const showSlotPills = displaySlotLabels.length > 0;
  const sessionMetaLabel = openDate ? null : nextSessionLabel;
  const descriptionText = formatListDescription(event.description);
  const pseudoRating = resolvePseudoRating(event.groupKey || event.id);
  const locationLabel = resolveEventCardLocationLabel(event);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60 sm:flex-row">
      <a
        href={detailsHref}
        className="absolute inset-0 z-[1] rounded-xl"
        aria-label={`Событие: ${event.title}`}
      />
      <div className="relative aspect-video w-full shrink-0 bg-slate-100 sm:min-w-[20rem] sm:w-80">
        <div
          className={`absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,_#e5e7eb,_#f3f4f6)] transition-opacity duration-300 ${
            showImage ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300/80 bg-white/60 shadow-sm">
            <div className="h-4 w-4 rotate-45 rounded-[6px] border border-slate-300/90 bg-slate-200/90" />
          </div>
        </div>

        {showImage ? (
          <img
            src={coverImageUrl}
            alt={event.title}
            loading="lazy"
            onError={() => setHasImageError(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : null}

        <EventImageBadges event={event} rail recommendVariant="compact" />

        {hasPrice ? (
          <span className="absolute bottom-2 right-2 rounded-full bg-primary-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm sm:bottom-3 sm:right-3 sm:px-4 sm:py-2 sm:text-sm">
            от {formatPriceRub(event.priceFrom)} ₽
          </span>
        ) : null}

        <EventFavoriteButton eventId={event.id} className="right-2 top-2 sm:right-3 sm:top-3" />
      </div>

      <div className="ml-2.5 flex flex-1 flex-col justify-between p-3 pl-5 text-left sm:pb-4 sm:pl-7 sm:pr-4 sm:pt-4">
        <div className="flex flex-wrap items-center justify-start gap-x-3 gap-y-1 text-[10px] text-slate-500 sm:text-xs">
          <span className="inline-flex shrink-0 items-center gap-0.5">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="font-medium text-slate-700">{pseudoRating.toFixed(1)}</span>
          </span>
          {event.category ? <span className="font-normal text-slate-600">{event.category}</span> : null}
          {destinationLabel ? (
            <span className="inline-flex min-w-0 items-center gap-0.5 text-slate-500">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{destinationLabel}</span>
            </span>
          ) : null}
        </div>

        <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-slate-900 transition-colors group-hover:text-primary-600 sm:text-lg">
          {event.title}
        </h3>

        <div className="mt-2 flex flex-wrap items-center justify-start gap-x-3 gap-y-0.5 text-[10px] text-slate-500 sm:text-xs">
          {openDate ? (
            <span className="font-medium text-emerald-600">Билет с открытой датой</span>
          ) : departingSoonMinutes ? (
            <span className="inline-flex animate-pulse items-center gap-1 font-medium text-orange-600">
              <Clock className="h-3 w-3" />
              Через {departingSoonMinutes} мин
            </span>
          ) : sessionMetaLabel ? (
            <span className="font-medium text-primary-600">{sessionMetaLabel}</span>
          ) : null}
          {locationLabel ? <span className="line-clamp-1">{locationLabel}</span> : null}
        </div>

        {highlights.length > 0 ? (
          <p className="mt-1 line-clamp-1 text-[10px] text-slate-600 sm:text-xs">{highlights.join(' • ')}</p>
        ) : null}

        {descriptionText ? (
          <div className="relative mt-2 overflow-hidden">
            <p className="line-clamp-3 text-[10px] leading-[1.35] text-slate-600 sm:text-xs sm:leading-[1.4]">
              {descriptionText}
            </p>
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[0.7em] bg-gradient-to-t from-white to-transparent"
              aria-hidden
            />
          </div>
        ) : null}

        {showSlotPills ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {displaySlotLabels.map((label) => (
              <span
                key={label}
                className="inline-flex h-[30px] min-h-[30px] shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs leading-none text-slate-800"
              >
                {label}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-4 pt-3">
          <span className="flex items-center gap-1 text-xs font-medium text-primary-600 sm:text-sm">
            <Ticket className="h-3.5 w-3.5 shrink-0" />
            Подробнее →
          </span>
          {hasPrice ? (
            <span className="shrink-0 rounded-full bg-primary-600 px-5 py-2 text-base font-bold uppercase tracking-wide text-white shadow-sm sm:px-6 sm:py-2.5 sm:text-lg">
              от {formatPriceRub(event.priceFrom)} ₽
            </span>
          ) : (
            <span className="text-xs text-slate-400">Цена уточняется</span>
          )}
        </div>
      </div>
    </div>
  );
}
