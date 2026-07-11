'use client';

import Link from 'next/link';
import { Clock, MapPin, Star, Ticket } from 'lucide-react';
import { useState } from 'react';

import { EventFavoriteButton } from '@/components/EventFavoriteButton.client';
import type { PublicSessionDto } from '@daibilet/contracts/public';
import { collectCatalogLabels } from '@/lib/catalog-labels';
import { EventImageBadges } from '@/lib/event-card-badges';
import {
  collectDisplaySlotLabels,
  collectDisplaySlotTimes,
  formatEventNextSession,
  formatListDescription,
  getDepartingSoonMinutes,
  hasMultipleCatalogSlots,
  isEventSessionToday,
  isOpenDate,
  MIN_DISPLAY_PRICE_RUB,
  resolvePseudoRating,
} from '@/lib/event-card-meta';
import { resolveEventCardDestinationLabel, resolveEventCardLocationLabel } from '@/lib/event-location';
import { formatMoneyRange } from '@/lib/format';
import { eventHref, sessionVenueHref } from '@/lib/routes';

export function EventCardHorizontal({ session }: { session: PublicSessionDto }) {
  const [hasImageError, setHasImageError] = useState(false);
  const showImage = Boolean(session.imageUrl && !hasImageError);
  const href = eventHref(session);
  const hasPrice = typeof session.priceFrom === 'number' && session.priceFrom >= MIN_DISPLAY_PRICE_RUB;
  const highlights = collectCatalogLabels(session).slice(0, 3);
  const openDate = isOpenDate(session);
  const departingSoonMinutes = openDate ? null : getDepartingSoonMinutes(session.startsAt);
  const nextSessionLabel = openDate ? null : formatEventNextSession(session);
  const isToday = isEventSessionToday(session);
  const multipleSlots = hasMultipleCatalogSlots(session);
  const displaySlotLabels = multipleSlots ? collectDisplaySlotLabels(session) : [];
  const displaySlots = collectDisplaySlotTimes(session, { todayOnly: isToday && !multipleSlots });
  const showSlotPills = multipleSlots ? displaySlotLabels.length > 1 : isToday && displaySlots.length > 0;
  const sessionMetaLabel = openDate
    ? null
    : multipleSlots && displaySlotLabels.length > 1
      ? `${displaySlotLabels.length} ближайших даты`
      : isToday && displaySlots.length > 0
        ? displaySlots.length === 1
          ? `Сегодня, ${displaySlots[0]}`
          : 'Сегодня'
        : nextSessionLabel;
  const descriptionText = formatListDescription(session.description);
  const pseudoRating = resolvePseudoRating(session.groupKey || session.id);
  const destinationLabel = resolveEventCardDestinationLabel(session);
  const locationLabel = resolveEventCardLocationLabel(session);
  const priceLabel = formatMoneyRange(session.priceFrom, session.priceTo);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60 sm:flex-row">
      <Link href={href} className="absolute inset-0 z-[1] rounded-xl" aria-label={`Событие: ${session.title}`} />
      <div className="relative aspect-video w-full shrink-0 bg-slate-100 sm:min-w-[20rem] sm:w-80">
        {!showImage ? (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.imageUrl || ''}
            alt={session.title}
            loading="lazy"
            onError={() => setHasImageError(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        )}
        <EventImageBadges event={session} rail recommendVariant="compact" />
        {hasPrice ? (
          <span className="absolute bottom-2 right-2 rounded-full bg-primary-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm sm:bottom-3 sm:right-3">
            {formatMoneyRange(session.priceFrom, session.priceTo)}
          </span>
        ) : null}
        <EventFavoriteButton eventId={session.id} className="right-2 top-2 sm:right-3 sm:top-3" />
      </div>

      <div className="flex flex-1 flex-col justify-between p-3 pl-5 sm:p-4 sm:pl-7">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500 sm:text-xs">
          <span className="inline-flex items-center gap-0.5">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="font-medium text-slate-700">{pseudoRating.toFixed(1)}</span>
          </span>
          {session.category ? <span>{session.category}</span> : null}
          {destinationLabel ? (
            <span className="inline-flex min-w-0 items-center gap-0.5">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{destinationLabel}</span>
            </span>
          ) : null}
        </div>

        <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-primary-600 sm:text-lg">
          {session.title}
        </h3>

        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-500 sm:text-xs">
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
          {locationLabel ? (
            sessionVenueHref(session) ? (
              <Link
                href={sessionVenueHref(session)!}
                className="relative z-[2] line-clamp-1 hover:text-primary-600"
                onClick={(event) => event.stopPropagation()}
              >
                {locationLabel}
              </Link>
            ) : (
              <span className="line-clamp-1">{locationLabel}</span>
            )
          ) : null}
        </div>

        {highlights.length > 0 ? (
          <p className="mt-1 line-clamp-1 text-[10px] text-slate-600 sm:text-xs">{highlights.join(' • ')}</p>
        ) : null}
        {descriptionText ? <p className="mt-2 line-clamp-3 text-[10px] text-slate-600 sm:text-xs">{descriptionText}</p> : null}
        {showSlotPills ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {(multipleSlots ? displaySlotLabels : displaySlots).map((label) => (
              <span key={label} className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-800">
                {label}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-4 pt-3">
          <span className="flex items-center gap-1 text-xs font-medium text-primary-600 sm:text-sm">
            <Ticket className="h-3.5 w-3.5" />
            Подробнее →
          </span>
          <span className="shrink-0 text-sm font-bold text-slate-900 sm:text-base">{priceLabel}</span>
        </div>
      </div>
    </article>
  );
}
