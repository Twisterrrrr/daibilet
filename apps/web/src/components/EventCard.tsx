'use client';

import Link from 'next/link';
import { Clock, MapPin, Star, Ticket, Users } from 'lucide-react';

import { EventFavoriteButton } from '@/components/EventFavoriteButton.client';
import {
  CatalogPurchaseAnchors,
  CatalogPurchaseChip,
  useCatalogPurchase,
} from '@/components/CatalogPurchaseTrigger.client';
import { LandingPurchaseButton } from '@/components/landing/LandingPurchaseButton.client';
import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import type { PublicCatalogListItemDto, PublicSessionDto } from '@daibilet/contracts/public';
import { collectCatalogLabels, extractDurationLabel } from '@/lib/catalog-labels';
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
import { resolveEventCardObjectPosition } from '@/lib/event-image-focus';
import { resolveEventCardDestinationLabel, resolveEventCardLocationLabel } from '@/lib/event-location';
import { formatMoneyRange } from '@/lib/format';
import { eventHref } from '@/lib/routes';

const SLOT_CHIP_CLASS =
  'inline-btn inline-flex h-6 min-h-6 shrink-0 items-center justify-center rounded-md bg-surface-muted px-2.5 text-ui-xs font-medium leading-none text-graphite-muted';

const SLOT_CHIP_PURCHASE_CLASS =
  'transition hover:bg-primary/10 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

const DETAILS_LINK_CLASS =
  'relative z-[2] inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-ui-xs font-semibold text-white transition hover:bg-primary-700 sm:text-ui-sm';

const TITLE_LINK_CLASS =
  'relative z-[2] line-clamp-3 font-display text-ui-sm font-bold leading-snug text-graphite transition-colors hover:text-primary-600 sm:text-base';

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
  const imageObjectPosition = resolveEventCardObjectPosition({
    slug: session.slug,
    sourceSlug: 'sourceSlug' in session ? session.sourceSlug : undefined,
    id: session.id,
  });
  const hasPrice = typeof session.priceFrom === 'number' && session.priceFrom >= MIN_DISPLAY_PRICE_RUB;
  const destinationLabel = resolveEventCardDestinationLabel(session);
  const highlights = collectCatalogLabels(session, 2);
  const openDate = isOpenDate(session);
  const departingSoonMinutes = openDate ? null : getDepartingSoonMinutes(session.startsAt);
  const nextSessionLabel = openDate ? null : formatEventNextSession(session);
  const displaySlotLabels = collectDisplaySlotLabels(session);
  const showSlotPills = displaySlotLabels.length > 0;
  const sessionMetaLabel = openDate ? null : nextSessionLabel;
  const pseudoRating = resolvePseudoRating(session.groupKey || session.id);
  const locationLabel = resolveEventCardLocationLabel(session);
  const durationLabel = extractDurationLabel(session.tags);
  const ageLabel = session.ageLimit?.trim() || null;
  const showSoonBadge = !hasPrice && !openDate && !departingSoonMinutes;
  const priceFooterLabel = formatMoneyRange(session.priceFrom, session.priceTo);
  const purchase = useCatalogPurchase(session);
  // Catalog list: no hidden widget DOM. Purchase UX lives on event page / landing CTA.
  const showPurchaseWidgets = landingActions && !suppressPurchaseAnchors && purchase.purchaseEnabled;

  const cardBody = (
    <>
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-muted">
        {landingActions ? (
          <Link href={href} className="absolute inset-0 z-[1]" aria-label={`Страница события: ${session.title}`} />
        ) : null}
        <SafeImage
          src={session.imageUrl}
          alt={session.title}
          fill
          sizes={IMAGE_SIZES.eventCard}
          style={{ objectPosition: imageObjectPosition }}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-surface-muted">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 shadow-sm">
                <div className="h-3.5 w-3.5 rotate-45 rounded-[6px] border border-slate-300/90 bg-slate-200/90" />
              </div>
            </div>
          }
        />

        <EventImageBadges event={session} showSoonBadge={showSoonBadge} />
        <EventFavoriteButton eventId={session.id} className="right-2 top-2 sm:right-3 sm:top-3" />
      </div>

      <div className={`flex flex-1 flex-col gap-3 ${compact ? 'p-4' : 'p-4 sm:p-5'}`}>
        <h2>
          <Link href={href} className={TITLE_LINK_CLASS}>
            {session.title}
          </Link>
        </h2>

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
            <span className="event-card-meta max-w-full">
              <MapPin className="event-card-meta-icon" />
              <span className="truncate">{destinationLabel}</span>
            </span>
          ) : null}
        </div>

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

        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-ui-xs text-graphite-muted">
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
          ) : (
            <span>
              {session.dateLabel}
              {session.timeLabel ? ` · ${session.timeLabel}` : ''}
            </span>
          )}
          {locationLabel ? <span className="line-clamp-1">{locationLabel}</span> : null}
        </div>

        {showSlotPills ? (
          <div className="flex flex-wrap items-start gap-1.5">
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
            teplohodEventId={purchase.teplohodEventId}
            teplohodWrapperId={purchase.teplohodWrapperId}
            tcEventId={purchase.tcEventId}
            tcToken={purchase.tcToken}
            tcPurchaseUrl={purchase.tcPurchaseUrl}
            tcTriggerRef={purchase.tcTriggerRef}
          />
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          {landingActions ? (
            <LandingPurchaseButton
              session={session}
              label={hasPrice ? `Купить от ${formatPriceRub(session.priceFrom)} ₽` : 'Купить'}
              className="relative z-[2] inline-flex w-full items-center justify-center rounded-xl bg-primary-600 px-3 py-2.5 text-ui-sm font-semibold text-white hover:bg-primary-700"
            />
          ) : (
            <>
              <span className="text-ui-sm font-bold text-graphite sm:text-base">{priceFooterLabel}</span>
              <Link href={href} className={DETAILS_LINK_CLASS}>
                <Ticket className="h-3.5 w-3.5" strokeWidth={1.75} />
                Подробнее
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );

  if (landingActions) {
    return <article className="event-card">{cardBody}</article>;
  }

  return (
    <article className="event-card">
      <Link href={href} className="absolute inset-0 z-[1] rounded-card" aria-label={`Событие: ${session.title}`} />
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
  const imageObjectPosition = resolveEventCardObjectPosition({
    slug: session.slug,
    sourceSlug: 'sourceSlug' in session ? session.sourceSlug : undefined,
    id: session.id,
  });
  const hasPrice = typeof session.priceFrom === 'number' && session.priceFrom >= MIN_DISPLAY_PRICE_RUB;
  const pseudoRating = resolvePseudoRating(session.groupKey || session.id);
  const cityLabel = resolveEventCardDestinationLabel(session);
  const dateLabel = rail ? formatShowcaseSessionDateCompact(session) : formatShowcaseSessionDate(session);
  const locationLabel = resolveEventCardLocationLabel(session);
  const venueLine = [locationLabel, cityLabel].filter(Boolean).join(' · ');
  const categoryLabel = session.category?.trim() || null;
  const durationLabel = extractDurationLabel(session.tags);
  const priceLabel = hasPrice ? formatShowcasePriceLabel(session.priceFrom) : 'Скоро';

  return (
    <article className={`event-card ${rail ? 'min-h-[340px]' : ''}`}>
      <Link href={href} className="absolute inset-0 z-[1] rounded-card" aria-label={`Событие: ${session.title}`} />
      <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-surface-muted">
        <SafeImage
          src={session.imageUrl}
          alt={session.title}
          fill
          sizes={IMAGE_SIZES.eventCard}
          style={{ objectPosition: imageObjectPosition }}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-surface-muted text-3xl text-graphite-muted">
              ·
            </div>
          }
        />

        <EventImageBadges event={session} rail={rail} editorsPick={editorsPickBadge} />
        <EventFavoriteButton eventId={session.id} className="right-2 top-2 sm:right-3 sm:top-3" />
      </div>

      <div className={`flex min-h-0 flex-1 flex-col gap-3 text-left ${rail ? 'p-4' : 'p-4 sm:p-5'}`}>
        <h3 className={`font-display font-bold leading-snug text-graphite ${rail ? 'line-clamp-3 text-ui-sm' : 'line-clamp-3 text-ui-sm sm:text-base'}`}>
          <Link href={href} className={`${TITLE_LINK_CLASS}`}>
            {session.title}
          </Link>
        </h3>

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
          {categoryLabel ? (
            <span className="rounded-md bg-surface-muted px-2 py-0.5 text-ui-xs font-medium text-graphite-muted">
              {categoryLabel}
            </span>
          ) : null}
        </div>

        <p className="event-card-meta">
          <Clock className="event-card-meta-icon" />
          <span>{dateLabel}</span>
        </p>

        {venueLine ? (
          <p className={`mt-auto event-card-meta ${rail ? 'line-clamp-2' : 'truncate'}`}>
            <MapPin className="event-card-meta-icon" />
            <span>{venueLine}</span>
          </p>
        ) : (
          <div className="mt-auto" />
        )}

        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="text-ui-sm font-bold text-graphite">{priceLabel}</span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-ui-xs font-semibold text-white sm:text-ui-sm">
            <Ticket className="h-3.5 w-3.5" strokeWidth={1.75} />
            Подробнее
          </span>
        </div>
      </div>
    </article>
  );
}
