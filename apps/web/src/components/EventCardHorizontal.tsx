'use client';

import Link from 'next/link';
import { Clock, MapPin, Star, Ticket, Users } from 'lucide-react';

import { EventFavoriteButton } from '@/components/EventFavoriteButton.client';
import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import type { PublicCatalogListItemDto, PublicSessionDto } from '@daibilet/contracts/public';
import { collectCatalogLabels, extractDurationLabel } from '@/lib/catalog-labels';
import { EventImageBadges } from '@/lib/event-card-badges';
import {
  collectDisplaySlotLabels,
  formatEventNextSession,
  formatListDescription,
  getDepartingSoonMinutes,
  isOpenDate,
  MIN_DISPLAY_PRICE_RUB,
  resolvePseudoRating,
} from '@/lib/event-card-meta';
import { resolveEventCardObjectPosition } from '@/lib/event-image-focus';
import {
  resolveEventCardDestinationLabel,
  resolveEventCardLocationLabel,
  resolveEventCardPinLines,
} from '@/lib/event-location';
import { formatMoneyRange } from '@/lib/format';
import { eventHref, sessionVenueHref } from '@/lib/routes';

const SLOT_CHIP_CLASS =
  'inline-btn inline-flex h-6 min-h-6 shrink-0 items-center justify-center rounded-md bg-surface-muted px-2.5 text-ui-xs font-medium leading-none text-graphite-muted';

export function EventCardHorizontal({ session }: { session: PublicCatalogListItemDto | PublicSessionDto }) {
  const href = eventHref(session);
  const imageObjectPosition = resolveEventCardObjectPosition({
    slug: session.slug,
    sourceSlug: 'sourceSlug' in session ? session.sourceSlug : undefined,
    id: session.id,
  });
  const hasPrice = typeof session.priceFrom === 'number' && session.priceFrom >= MIN_DISPLAY_PRICE_RUB;
  const highlights = collectCatalogLabels(session).slice(0, 2);
  const openDate = isOpenDate(session);
  const departingSoonMinutes = openDate ? null : getDepartingSoonMinutes(session.startsAt);
  const nextSessionLabel = openDate ? null : formatEventNextSession(session);
  const displaySlotLabels = collectDisplaySlotLabels(session);
  const showSlotPills = displaySlotLabels.length > 0;
  const sessionMetaLabel = openDate ? null : nextSessionLabel;
  const descriptionText = formatListDescription(session.description);
  const pseudoRating = resolvePseudoRating(session.groupKey || session.id);
  const destinationLabel = resolveEventCardDestinationLabel(session);
  const locationLabel = resolveEventCardLocationLabel(session);
  const pinLines = resolveEventCardPinLines(session);
  const pinPrimary = pinLines.primary || locationLabel;
  const durationLabel = extractDurationLabel(session.tags);
  const ageLabel = session.ageLimit?.trim() || null;
  const priceFooterLabel = formatMoneyRange(session.priceFrom, session.priceTo);
  const venueHref = sessionVenueHref(session);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-card bg-white shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover sm:flex-row">
      <Link href={href} className="absolute inset-0 z-[1] rounded-card" aria-label={`Событие: ${session.title}`} />
      <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-surface-muted sm:min-w-[20rem] sm:w-80 sm:aspect-auto sm:self-stretch">
        <SafeImage
          src={session.imageUrl}
          alt={session.title}
          fill
          sizes={IMAGE_SIZES.eventCardHorizontal}
          style={{ objectPosition: imageObjectPosition }}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          fallback={<div className="flex h-full w-full items-center justify-center bg-surface-muted" />}
        />
        <EventImageBadges event={session} rail recommendVariant="compact" />
        <EventFavoriteButton eventId={session.id} className="right-2 top-2 sm:right-3 sm:top-3" />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5 sm:pl-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="event-card-meta">
            <Star className="event-card-meta-icon" />
            <span className="font-medium text-graphite">{pseudoRating.toFixed(1)}</span>
          </span>
          {durationLabel ? (
            <span className="event-card-meta">
              <Clock className="event-card-meta-icon" />
              <span className="truncate">{durationLabel}</span>
            </span>
          ) : null}
          {ageLabel ? (
            <span className="event-card-meta">
              <Users className="event-card-meta-icon" />
              <span className="truncate">{ageLabel}</span>
            </span>
          ) : null}
          {destinationLabel ? (
            <span className="event-card-meta min-w-0">
              <MapPin className="event-card-meta-icon" />
              <span className="truncate">{destinationLabel}</span>
            </span>
          ) : null}
        </div>

        <h3 className="line-clamp-3 font-display text-ui-sm font-bold leading-snug text-graphite sm:text-lg">
          <Link href={href} className="relative z-[2] transition-colors hover:text-primary-600">
            {session.title}
          </Link>
        </h3>

        {(session.category || highlights.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {session.category ? (
              <span className="rounded-md bg-surface-muted px-2 py-0.5 text-ui-xs font-medium text-graphite-muted">
                {session.category}
              </span>
            ) : null}
            {highlights.map((label) => (
              <span key={label} className="rounded-md bg-surface-muted px-2 py-0.5 text-ui-xs font-medium text-graphite-muted">
                {label}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-ui-xs text-graphite-muted">
          {openDate ? (
            <span className="font-medium text-success">Билет с открытой датой</span>
          ) : departingSoonMinutes ? (
            <span className="inline-flex items-center gap-1 font-medium text-urgency">
              <Clock className="event-card-meta-icon" />
              Через {departingSoonMinutes} мин
            </span>
          ) : sessionMetaLabel ? (
            <span className="inline-flex items-center gap-1 font-medium text-graphite">
              <Clock className="event-card-meta-icon" />
              {sessionMetaLabel}
            </span>
          ) : null}
          {pinPrimary ? (
            venueHref ? (
              <Link
                href={venueHref}
                className="relative z-[2] min-w-0 hover:text-primary-600"
                onClick={(event) => event.stopPropagation()}
              >
                <span className="line-clamp-1">{pinPrimary}</span>
                {pinLines.secondary ? (
                  <span className="mt-0.5 block line-clamp-1">{pinLines.secondary}</span>
                ) : null}
              </Link>
            ) : (
              <span className="min-w-0">
                <span className="line-clamp-1">{pinPrimary}</span>
                {pinLines.secondary ? (
                  <span className="mt-0.5 block line-clamp-1">{pinLines.secondary}</span>
                ) : null}
              </span>
            )
          ) : null}
        </div>

        {descriptionText ? <p className="line-clamp-2 text-ui-xs text-graphite-muted sm:text-ui-sm">{descriptionText}</p> : null}
        {showSlotPills ? (
          <div className="flex flex-wrap items-start gap-1.5">
            {displaySlotLabels.map((label) => (
              <span key={label} className={SLOT_CHIP_CLASS}>
                {label}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-4 pt-1">
          <span className="shrink-0 text-ui-sm font-bold text-graphite sm:text-base">
            {hasPrice ? priceFooterLabel : 'Скоро'}
          </span>
          <Link
            href={href}
            className="relative z-[2] inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-ui-xs font-semibold text-white transition hover:bg-primary-700 sm:text-ui-sm"
          >
            <Ticket className="h-3.5 w-3.5" strokeWidth={1.75} />
            Подробнее
          </Link>
        </div>
      </div>
    </article>
  );
}
