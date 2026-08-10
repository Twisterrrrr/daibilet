import * as React from 'react';
import { Clock, MapPin, Star, Ticket } from 'lucide-react';

import { collectCatalogLabels } from '@/lib/catalog-labels';
import { resolveEditorialEventImage } from '@/lib/event-cover-images';
import { resolveEventCardDestinationLabel, resolveEventCardLocationLabel } from '@/lib/event-location';
import { EventFavoriteButton } from '@/components/EventFavoriteButton';
import { LandingPurchaseButton } from '@/components/landing/LandingPurchaseButton';
import { EventImageBadges } from '@/lib/event-card-badges';
import {
  collectDisplaySlotLabels,
  formatEventNextSession,
  formatPriceRub,
  formatShowcasePriceLabel,
  formatShowcaseSessionDate,
  formatShowcaseSessionDateCompact,
  getDepartingSoonMinutes,
  isOpenDate,
  MIN_DISPLAY_PRICE_RUB,
  resolvePseudoRating,
} from '@/lib/event-card-meta';
import { eventHref } from '@/routes';
import type { PublicSession } from '@/types';

type EventCardProps = {
  event: PublicSession;
  compact?: boolean;
  /** Витринная карточка в стиле Lovable (главная, подборки) */
  showcase?: boolean;
  /** Узкая карточка в горизонтальной ленте на главной */
  showcaseRail?: boolean;
  /** Бейдж «Выбор редакции» на каждой карточке ленты */
  editorsPickBadge?: boolean;
  /** На лендинге: кнопка открывает виджет, название ведёт на страницу события */
  landingActions?: boolean;
};

export function EventCard({
  event,
  compact = false,
  showcase = false,
  showcaseRail = false,
  editorsPickBadge = false,
  landingActions = false,
}: EventCardProps) {
  if (showcase || showcaseRail) {
    return <ShowcaseEventCard event={event} rail={showcaseRail} editorsPickBadge={editorsPickBadge} />;
  }
  const [hasImageError, setHasImageError] = React.useState(false);
  const coverImageUrl =
    resolveEditorialEventImage(event.id, event.slug, event.imageUrl) || event.imageUrl || '';
  const showImage = Boolean(coverImageUrl && !hasImageError);
  const detailsHref = eventHref(event);
  const hasPrice = typeof event.priceFrom === 'number' && event.priceFrom >= MIN_DISPLAY_PRICE_RUB;
  const destinationLabel = resolveEventCardDestinationLabel(event);
  const highlights = collectCatalogLabels(event);
  const openDate = isOpenDate(event);
  const departingSoonMinutes = openDate ? null : getDepartingSoonMinutes(event.startsAt);
  const nextSessionLabel = openDate ? null : formatEventNextSession(event);
  const displaySlotLabels = collectDisplaySlotLabels(event);
  const showSlotPills = displaySlotLabels.length > 0;
  const sessionMetaLabel = openDate ? null : nextSessionLabel;
  const pseudoRating = resolvePseudoRating(event.groupKey || event.id);
  const locationLabel = resolveEventCardLocationLabel(event);
  const showSoonBadge = !hasPrice && !openDate && !departingSoonMinutes;
  const cardClassName =
    'group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-slate-200/60';

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
            src={coverImageUrl}
            alt={event.title}
            loading="lazy"
            onError={() => setHasImageError(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : null}

        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

        <EventImageBadges event={event} showSoonBadge={showSoonBadge} />

        {hasPrice ? (
          <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3">
            <span className="rounded-full bg-primary-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm sm:px-4 sm:py-2 sm:text-sm">
              от {formatPriceRub(event.priceFrom)} ₽
            </span>
          </div>
        ) : null}

        <EventFavoriteButton eventId={event.id} className="right-2 top-2 sm:right-3 sm:top-3" />
      </div>

      <div className="flex flex-1 flex-col justify-between p-3 text-left sm:p-4">
        <div className="flex flex-wrap items-center justify-start gap-x-2 gap-y-1 text-[10px] leading-relaxed text-slate-500 sm:text-xs">
          <span className="inline-flex shrink-0 items-center gap-0.5">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400 sm:h-3.5 sm:w-3.5" />
            <span className="font-medium text-slate-700">{pseudoRating.toFixed(1)}</span>
          </span>
          {event.category ? (
            <span className="truncate rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-normal text-slate-600 sm:text-xs">
              {event.category}
            </span>
          ) : null}
          {destinationLabel ? (
            <span className="inline-flex min-w-0 max-w-full items-center gap-0.5 text-slate-500">
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

        <div className="mt-2 flex flex-wrap items-center justify-start gap-x-2 gap-y-0.5 text-left text-[10px] leading-relaxed text-slate-500 sm:gap-x-3 sm:text-xs">
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
          <ul className="mt-2 space-y-0.5 text-[10px] leading-relaxed text-slate-600 sm:text-xs">
            {highlights.map((highlight) => (
              <li key={highlight} className="flex gap-1.5">
                <span className="text-primary-500">•</span>
                <span className="line-clamp-1">{highlight}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {showSlotPills ? (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
            {displaySlotLabels.map((label) => (
              <span
                key={label}
                className="inline-flex h-6 min-h-6 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white px-2.5 text-[10px] font-medium leading-none text-slate-800"
              >
                {label}
              </span>
            ))}
          </div>
        ) : null}

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
    <div className={`relative ${cardClassName}`}>
      <a
        href={detailsHref}
        className="absolute inset-0 z-[1] rounded-xl"
        aria-label={`Событие: ${event.title}`}
      />
      {body}
    </div>
  );
}

function ShowcaseEventCard({
  event,
  rail = false,
  editorsPickBadge = false,
}: {
  event: PublicSession;
  rail?: boolean;
  editorsPickBadge?: boolean;
}) {
  const [hasImageError, setHasImageError] = React.useState(false);
  const coverImageUrl =
    resolveEditorialEventImage(event.id, event.slug, event.imageUrl) || event.imageUrl || '';
  const showImage = Boolean(coverImageUrl && !hasImageError);
  const detailsHref = eventHref(event);
  const hasPrice = typeof event.priceFrom === 'number' && event.priceFrom >= MIN_DISPLAY_PRICE_RUB;
  const pseudoRating = resolvePseudoRating(event.groupKey || event.id);
  const cityLabel = resolveEventCardDestinationLabel(event);
  const dateLabel = rail ? formatShowcaseSessionDateCompact(event) : formatShowcaseSessionDate(event);
  const locationLabel = resolveEventCardLocationLabel(event);
  const venueLine = [locationLabel, cityLabel].filter(Boolean).join(' · ');
  const categoryLabel = event.category?.trim() || null;

  return (
    <div
      className={`group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-slate-200/60 ${
        rail ? 'min-h-[340px]' : ''
      }`}
    >
      <a
        href={detailsHref}
        className="absolute inset-0 z-[1] rounded-xl"
        aria-label={`Событие: ${event.title}`}
      />
      <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-slate-100">
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
            src={coverImageUrl}
            alt={event.title}
            loading="lazy"
            onError={() => setHasImageError(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : null}

        <EventImageBadges
          event={event}
          rail={rail}
          recommendVariant={rail ? 'compact' : 'text'}
          editorsPick={editorsPickBadge}
        />

        <EventFavoriteButton eventId={event.id} className={rail ? 'right-2 top-2' : 'right-2 top-2 sm:right-3 sm:top-3'} />

        <div className={`absolute bottom-2 right-2 ${rail ? 'sm:bottom-3 sm:right-3' : 'sm:bottom-3 sm:right-3'}`}>
          <span
            className={`rounded-full bg-primary-600 font-bold text-white shadow-sm ${
              rail
                ? 'px-3 py-1.5 text-xs tracking-wide sm:px-4 sm:py-2 sm:text-sm'
                : 'px-3 py-1.5 text-xs uppercase tracking-wide sm:px-4 sm:py-2 sm:text-sm'
            }`}
          >
            {hasPrice ? formatShowcasePriceLabel(event.priceFrom) : 'Скоро'}
          </span>
        </div>
      </div>

      <div className={`flex min-h-0 flex-1 flex-col text-left ${rail ? 'gap-1.5 p-3' : 'gap-2 p-3 sm:p-4'}`}>
        {rail ? (
          <>
            <div className="flex w-full flex-wrap items-center justify-start gap-x-2 gap-y-1 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span className="font-medium text-slate-700">{pseudoRating.toFixed(1)}</span>
              </span>
              {categoryLabel ? <span className="font-normal text-slate-600">{categoryLabel}</span> : null}
            </div>
            <p className="text-[11px] leading-snug text-slate-500">{dateLabel}</p>
          </>
        ) : (
          <div className="flex w-full items-start justify-between gap-2 text-[10px] text-slate-500 sm:text-xs">
            <div className="flex min-w-0 flex-wrap items-center justify-start gap-x-2 gap-y-1">
              <span className="inline-flex shrink-0 items-center gap-0.5">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400 sm:h-3.5 sm:w-3.5" />
                <span className="font-medium text-slate-700">{pseudoRating.toFixed(1)}</span>
              </span>
              {categoryLabel ? (
                <span className="truncate font-normal text-slate-600">{categoryLabel}</span>
              ) : null}
            </div>
            <span className="shrink-0 text-right font-medium text-slate-500">{dateLabel}</span>
          </div>
        )}
        <h3
          className={`font-display font-bold leading-snug text-slate-900 group-hover:text-primary-600 ${
            rail ? 'line-clamp-3 text-sm' : 'line-clamp-2 text-sm sm:text-base'
          }`}
        >
          {event.title}
        </h3>
        {venueLine ? (
          <p className={`mt-auto text-slate-500 ${rail ? 'line-clamp-2 text-[11px] leading-snug' : 'truncate text-xs sm:text-sm'}`}>
            {venueLine}
          </p>
        ) : null}
      </div>
    </div>
  );
}
