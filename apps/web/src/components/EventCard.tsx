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
import { LandingCardBadgeRow } from '@/components/landing/LandingCardBadgeRow';
import { EventImageBadges } from '@/lib/event-card-badges';
import { deriveLandingCardBadges } from '@/lib/landing-card-badges';
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
import {
  resolveEventCardDestinationLabel,
  resolveEventCardLocationLabel,
  resolveEventCardPinLines,
} from '@/lib/event-location';
import { formatPriceFrom } from '@/lib/format';
import { trackProductCardClick } from '@/lib/catalog-analytics';
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
  const highlights = collectCatalogLabels(session, 1);
  const openDate = isOpenDate(session);
  const departingSoonMinutes = openDate ? null : getDepartingSoonMinutes(session.startsAt);
  const nextSessionLabel = openDate ? null : formatEventNextSession(session);
  const displaySlotLabels = collectDisplaySlotLabels(session);
  const showSlotPills = displaySlotLabels.length > 0;
  const sessionMetaLabel = openDate ? null : nextSessionLabel;
  // Landings: no fake ★ - only real micro-badges from tags/subcategories/title.
  const pseudoRating = landingActions ? null : resolvePseudoRating(session.groupKey || session.id);
  const landingBadges = landingActions ? deriveLandingCardBadges(session) : [];
  const locationLabel = resolveEventCardLocationLabel(session);
  const durationLabel = extractDurationLabel(session.tags);
  const ageLabel = session.ageLimit?.trim() || null;
  const showSoonBadge = !hasPrice && !openDate && !departingSoonMinutes;
  const priceFooterLabel = formatPriceFrom(session.priceFrom);
  const purchase = useCatalogPurchase(session);
  // Catalog list: no hidden widget DOM. Purchase UX lives on event page / landing CTA.
  const showPurchaseWidgets = landingActions && !suppressPurchaseAnchors && purchase.purchaseEnabled;

  const cardBody = (
    <>
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-muted">
        {landingActions ? (
          <Link
            href={href}
            className="absolute inset-0 z-[1]"
            aria-label={`Страница события: ${session.title}`}
            onClick={() =>
              trackProductCardClick({
                eventId: session.id,
                slug: session.slug,
                source: 'landing_card',
              })
            }
          />
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

      <div className={`flex flex-1 flex-col ${compact ? 'gap-2.5 p-3.5 sm:gap-3 sm:p-4' : 'gap-3 p-4 sm:p-5'}`}>
        <h2>
          <Link
            href={href}
            className={TITLE_LINK_CLASS}
            onClick={() =>
              trackProductCardClick({
                eventId: session.id,
                slug: session.slug,
                source: landingActions ? 'landing_card_title' : 'event_card_title',
              })
            }
          >
            {session.title}
          </Link>
        </h2>

        {/* Desktop / landing: full meta. Mobile catalog: keep light - avoid rating+duration+city wall. */}
        <div
          className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 ${
            compact && !landingActions ? 'hidden sm:flex' : ''
          }`}
        >
          {pseudoRating != null ? (
            <span className="event-card-meta">
              <Star className="event-card-meta-icon" />
              <span className="font-medium text-graphite">{pseudoRating.toFixed(1)}</span>
            </span>
          ) : null}
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

        {landingBadges.length > 0 ? (
          <LandingCardBadgeRow badges={landingBadges} />
        ) : (session.category || highlights.length > 0) ? (
          <div
            className={`flex flex-wrap items-center gap-1.5 ${
              compact && !landingActions ? 'hidden sm:flex' : ''
            }`}
          >
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
        ) : null}

        {/* Primary schedule line */}
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-ui-xs sm:text-ui-sm">
            {openDate ? (
              <span className="font-semibold text-success">Билет с открытой датой</span>
            ) : departingSoonMinutes ? (
              <span className="inline-flex items-center gap-1 font-semibold text-urgency">
                <Clock className="event-card-meta-icon" />
                Через {departingSoonMinutes} мин
              </span>
            ) : sessionMetaLabel ? (
              <span className="inline-flex items-center gap-1 font-semibold text-graphite">
                <Clock className="event-card-meta-icon" />
                {sessionMetaLabel}
              </span>
            ) : (
              <span className="font-semibold text-graphite">
                {session.dateLabel}
                {session.timeLabel ? `, ${session.timeLabel}` : ''}
              </span>
            )}
            {durationLabel && compact && !landingActions ? (
              <span className="text-graphite-muted sm:hidden">· {durationLabel}</span>
            ) : null}
          </div>
          {locationLabel ? (
            <p className="line-clamp-1 text-ui-xs text-graphite-muted">
              <span className="inline-flex max-w-full items-center gap-1">
                <MapPin className="event-card-meta-icon shrink-0" />
                <span className="truncate">{locationLabel}</span>
              </span>
            </p>
          ) : null}
        </div>

        {showSlotPills ? (
          <div className="flex flex-wrap items-start gap-1.5">
            {(compact && !landingActions ? displaySlotLabels.slice(0, 2) : displaySlotLabels).map((label) =>
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
              <Link
                href={href}
                className={DETAILS_LINK_CLASS}
                onClick={() =>
                  trackProductCardClick({
                    eventId: session.id,
                    slug: session.slug,
                    source: 'event_card_cta',
                  })
                }
              >
                <Ticket className="h-3.5 w-3.5" strokeWidth={1.75} />
                Купить билет
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );

  if (landingActions) {
    return <article className="group event-card">{cardBody}</article>;
  }

  const onCardNavigate = () => {
    trackProductCardClick({
      eventId: session.id,
      slug: session.slug,
      source: 'event_card',
    });
  };

  return (
    <article className="group event-card">
      <Link
        href={href}
        className="absolute inset-0 z-[1] rounded-card"
        aria-label={`Событие: ${session.title}`}
        onClick={onCardNavigate}
      />
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
  const dateLabel = rail ? formatShowcaseSessionDateCompact(session) : formatShowcaseSessionDate(session);
  const pinLines = resolveEventCardPinLines(session);
  const categoryLabel = session.category?.trim() || null;
  const durationLabel = extractDurationLabel(session.tags);
  const priceLabel = hasPrice ? formatShowcasePriceLabel(session.priceFrom) : 'Скоро';

  return (
    <article className={`group event-card ${rail ? 'min-h-[340px]' : ''}`}>
      <Link
        href={href}
        className="absolute inset-0 z-[1] rounded-card"
        aria-label={`Событие: ${session.title}`}
        onClick={() =>
          trackProductCardClick({
            eventId: session.id,
            slug: session.slug,
            source: rail ? 'showcase_rail' : 'showcase_card',
          })
        }
      />
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

        {pinLines.primary ? (
          <div className={`mt-auto flex items-start gap-1.5 text-ui-xs text-graphite-muted ${rail ? '' : 'min-w-0'}`}>
            <MapPin className="event-card-meta-icon mt-0.5" />
            <div className="min-w-0">
              <p className={rail ? 'line-clamp-2' : 'truncate'}>{pinLines.primary}</p>
              {pinLines.secondary ? (
                <p className={`mt-0.5 ${rail ? 'line-clamp-1' : 'truncate'}`}>{pinLines.secondary}</p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mt-auto" />
        )}

        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="text-ui-sm font-bold text-graphite">{priceLabel}</span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-ui-xs font-semibold text-white sm:text-ui-sm">
            <Ticket className="h-3.5 w-3.5" strokeWidth={1.75} />
            Купить билет
          </span>
        </div>
      </div>
    </article>
  );
}
