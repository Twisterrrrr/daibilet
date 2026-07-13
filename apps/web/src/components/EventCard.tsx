'use client';

import Link from 'next/link';
import { Clock, MapPin, Star, Ticket } from 'lucide-react';
import { useState } from 'react';

import { EventFavoriteButton } from '@/components/EventFavoriteButton.client';
import {
  CatalogPurchaseAnchors,
  CatalogPurchaseChip,
  useCatalogPurchase,
} from '@/components/CatalogPurchaseTrigger.client';
import { LandingPurchaseButton } from '@/components/landing/LandingPurchaseButton.client';
import type { PublicCatalogListItemDto, PublicSessionDto } from '@daibilet/contracts/public';
import { collectCatalogLabels } from '@/lib/catalog-labels';
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
import { resolveEventCardDestinationLabel, resolveEventCardLocationLabel } from '@/lib/event-location';
import { formatMoneyRange, formatPriceFrom } from '@/lib/format';
import { eventHref } from '@/lib/routes';

const SLOT_CHIP_CLASS =
  'inline-btn inline-flex h-6 min-h-6 shrink-0 items-center justify-center rounded-full bg-slate-100 px-2.5 text-[10px] font-medium leading-none text-slate-700';

const SLOT_CHIP_PURCHASE_CLASS =
  'transition hover:bg-primary/10 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

const DETAILS_LINK_CLASS =
  'relative z-[2] inline-flex items-center gap-1 text-[10px] font-medium text-primary-600 transition hover:text-primary-700 sm:text-xs';

const TITLE_LINK_CLASS =
  'relative z-[2] line-clamp-4 text-sm font-semibold leading-relaxed text-slate-900 transition-colors hover:text-primary-600 sm:text-base';

type CatalogCardSession = PublicSessionDto | PublicCatalogListItemDto;

type EventCardProps = {
  session: CatalogCardSession;
  compact?: boolean;
  showcaseRail?: boolean;
  editorsPickBadge?: boolean;
  landingActions?: boolean;
  /** Скрыть скрытые anchor-виджеты (каталог-слоты) — на странице события в related. */
  suppressPurchaseAnchors?: boolean;
};

export function EventCard({
  session,
  compact = false,
  showcaseRail = false,
  editorsPickBadge = false,
  landingActions = false,
  suppressPurchaseAnchors = true,
}: EventCardProps) {
  if (showcaseRail || editorsPickBadge) {
    return <ShowcaseEventCard session={session} rail={showcaseRail} editorsPickBadge={editorsPickBadge} />;
  }

  const href = eventHref(session);
  const [hasImageError, setHasImageError] = useState(false);
  const showImage = Boolean(session.imageUrl && !hasImageError);
  const hasPrice = typeof session.priceFrom === 'number' && session.priceFrom >= MIN_DISPLAY_PRICE_RUB;
  const destinationLabel = resolveEventCardDestinationLabel(session);
  const highlights = collectCatalogLabels(session);
  const openDate = isOpenDate(session);
  const departingSoonMinutes = openDate ? null : getDepartingSoonMinutes(session.startsAt);
  const nextSessionLabel = openDate ? null : formatEventNextSession(session);
  const displaySlotLabels = collectDisplaySlotLabels(session);
  const showSlotPills = displaySlotLabels.length > 0;
  const sessionMetaLabel = openDate ? null : nextSessionLabel;
  const pseudoRating = resolvePseudoRating(session.groupKey || session.id);
  const locationLabel = resolveEventCardLocationLabel(session);
  const showSoonBadge = !hasPrice && !openDate && !departingSoonMinutes;
  const priceBadgeLabel = formatPriceFrom(session.priceFrom);
  const priceFooterLabel = formatMoneyRange(session.priceFrom, session.priceTo);
  const purchase = useCatalogPurchase(session);
  // Catalog list: no hidden widget DOM. Purchase UX lives on event page / landing CTA.
  const showPurchaseWidgets = landingActions && !suppressPurchaseAnchors && purchase.purchaseEnabled;

  const cardClassName =
    'group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-slate-200/60';

  const cardBody = (
    <>
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
        {landingActions ? (
          <Link href={href} className="absolute inset-0 z-[1] rounded-t-xl" aria-label={`Страница события: ${session.title}`} />
        ) : null}
        {!showImage ? (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300/80 bg-white/60 shadow-sm">
              <div className="h-3.5 w-3.5 rotate-45 rounded-[6px] border border-slate-300/90 bg-slate-200/90" />
            </div>
          </div>
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

        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <EventImageBadges event={session} showSoonBadge={showSoonBadge} />
        <EventFavoriteButton eventId={session.id} className="right-2 top-2 sm:right-3 sm:top-3" />

        {hasPrice ? (
          <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3">
            <span className="rounded-full bg-primary-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm sm:px-4 sm:py-2 sm:text-sm">
              {priceBadgeLabel}
            </span>
          </div>
        ) : null}
      </div>

      <div className={`flex flex-1 flex-col ${compact ? 'p-3' : 'p-3 sm:p-4'}`}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-500 sm:text-xs">
          <span className="inline-flex shrink-0 items-center gap-0.5">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400 sm:h-3.5 sm:w-3.5" />
            <span className="font-medium text-slate-700">{pseudoRating.toFixed(1)}</span>
          </span>
          {session.category ? (
            <span className="truncate rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-normal text-slate-600 sm:text-xs">
              {session.category}
            </span>
          ) : null}
          {destinationLabel ? (
            <span className="inline-flex min-w-0 max-w-full items-center gap-0.5 text-slate-500">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{destinationLabel}</span>
            </span>
          ) : null}
        </div>

        <h2 className="mt-2">
          <Link href={href} className={TITLE_LINK_CLASS}>
            {session.title}
          </Link>
        </h2>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500 sm:gap-x-3 sm:text-xs">
          {openDate ? (
            <span className="font-medium text-emerald-600">Билет с открытой датой</span>
          ) : departingSoonMinutes ? (
            <span className="inline-flex animate-pulse items-center gap-1 font-medium text-orange-600">
              <Clock className="h-3 w-3" />
              Через {departingSoonMinutes} мин
            </span>
          ) : sessionMetaLabel ? (
            <span className="font-medium text-primary-600">{sessionMetaLabel}</span>
          ) : (
            <span>
              {session.dateLabel}
              {session.timeLabel ? ` · ${session.timeLabel}` : ''}
            </span>
          )}
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
          <div className="mt-2 flex flex-wrap items-start gap-1.5">
            {displaySlotLabels.map((label) =>
              showPurchaseWidgets ? (
                <CatalogPurchaseChip
                  key={label}
                  session={session}
                  label={label}
                  className={`${SLOT_CHIP_CLASS} ${SLOT_CHIP_PURCHASE_CLASS}`}
                  onOpen={purchase.openPurchase}
                >
                  {label}
                </CatalogPurchaseChip>
              ) : (
                <span key={label} className={SLOT_CHIP_CLASS}>
                  {label}
                </span>
              ),
            )}
          </div>
        ) : null}

        {showPurchaseWidgets ? (
          <CatalogPurchaseAnchors
            session={session}
            teplohod={purchase.teplohod}
            teplohodWrapperId={purchase.teplohodWrapperId}
            tcEventId={purchase.tcEventId}
            tcToken={purchase.tcToken}
            tcTriggerRef={purchase.tcTriggerRef}
          />
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          {landingActions ? (
            <LandingPurchaseButton
              session={session}
              label={hasPrice ? `Купить от ${formatPriceRub(session.priceFrom)} ₽` : 'Купить'}
              className="relative z-[2] inline-flex w-full items-center justify-center rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700 sm:text-sm"
            />
          ) : (
            <>
              <span className="text-sm font-semibold text-slate-900">{priceFooterLabel}</span>
              <Link href={href} className={DETAILS_LINK_CLASS}>
                <Ticket className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                Подробнее →
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );

  if (landingActions) {
    return <article className={`relative ${cardClassName}`}>{cardBody}</article>;
  }

  return (
    <article className={`relative ${cardClassName}`}>
      <Link href={href} className="absolute inset-0 z-[1] rounded-xl" aria-label={`Событие: ${session.title}`} />
      {cardBody}
    </article>
  );
}

function ShowcaseEventCard({
  session,
  rail = false,
  editorsPickBadge = false,
}: {
  session: CatalogCardSession;
  rail?: boolean;
  editorsPickBadge?: boolean;
}) {
  const href = eventHref(session);
  const [hasImageError, setHasImageError] = useState(false);
  const showImage = Boolean(session.imageUrl && !hasImageError);
  const hasPrice = typeof session.priceFrom === 'number' && session.priceFrom >= MIN_DISPLAY_PRICE_RUB;
  const pseudoRating = resolvePseudoRating(session.groupKey || session.id);
  const cityLabel = resolveEventCardDestinationLabel(session);
  const dateLabel = rail ? formatShowcaseSessionDateCompact(session) : formatShowcaseSessionDate(session);
  const locationLabel = resolveEventCardLocationLabel(session);
  const venueLine = [locationLabel, cityLabel].filter(Boolean).join(' · ');
  const categoryLabel = session.category?.trim() || null;

  return (
    <article
      className={`group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-slate-200/60 ${
        rail ? 'min-h-[340px]' : ''
      }`}
    >
      <Link href={href} className="absolute inset-0 z-[1] rounded-xl" aria-label={`Событие: ${session.title}`} />
      <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-slate-100">
        {!showImage ? (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-3xl">
            🎫
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.imageUrl || ''}
            alt={session.title}
            loading="lazy"
            onError={() => setHasImageError(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}

        <EventImageBadges event={session} rail={rail} editorsPick={editorsPickBadge} />
        <EventFavoriteButton eventId={session.id} className="right-2 top-2 sm:right-3 sm:top-3" />

        <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3">
          <span className="rounded-full bg-primary-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm sm:px-4 sm:py-2 sm:text-sm">
            {hasPrice ? formatShowcasePriceLabel(session.priceFrom) : 'Скоро'}
          </span>
        </div>
      </div>

      <div className={`flex min-h-0 flex-1 flex-col text-left ${rail ? 'gap-1.5 p-3' : 'gap-2 p-3 sm:p-4'}`}>
        {rail ? (
          <>
            <div className="flex w-full flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
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
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="inline-flex shrink-0 items-center gap-0.5">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400 sm:h-3.5 sm:w-3.5" />
                <span className="font-medium text-slate-700">{pseudoRating.toFixed(1)}</span>
              </span>
              {categoryLabel ? <span className="truncate font-normal text-slate-600">{categoryLabel}</span> : null}
            </div>
            <span className="shrink-0 text-right font-medium text-slate-500">{dateLabel}</span>
          </div>
        )}
        <h3
          className={`font-display font-bold leading-snug ${
            rail ? 'line-clamp-4 text-sm' : 'line-clamp-4 text-sm sm:text-base'
          }`}
        >
          <Link href={href} className={`${TITLE_LINK_CLASS} font-display font-bold`}>
            {session.title}
          </Link>
        </h3>
        {venueLine ? (
          <p className={`mt-auto text-slate-500 ${rail ? 'line-clamp-2 text-[11px] leading-snug' : 'truncate text-xs sm:text-sm'}`}>
            {venueLine}
          </p>
        ) : null}
      </div>
    </article>
  );
}
