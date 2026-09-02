'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Clock, MapPin, Ticket } from 'lucide-react';

import { EventFavoriteButton } from '@/components/EventFavoriteButton.client';
import { AddToDayRouteButton } from '@/components/AddToDayRouteButton.client';
import {
  CatalogPurchaseAnchors,
  CatalogPurchaseChip,
  useCatalogPurchase,
} from '@/components/CatalogPurchaseTrigger.client';
import { LandingPurchaseButton } from '@/components/landing/LandingPurchaseButton.client';
import { IMAGE_SIZES, CardSafeImage } from '@/components/SafeImage.client';
import type { PublicCatalogListItemDto, PublicSessionDto } from '@daibilet/contracts/public';
import { extractDurationLabel } from '@/lib/catalog-labels';
import { LandingCardBadgeRow } from '@/components/landing/LandingCardBadgeRow';
import { EventImageBadges } from '@/lib/event-card-badges';
import { deriveLandingCardBadges } from '@/lib/landing-card-badges';
import {
  collectAllDisplaySlotLabels,
  COMPACT_MOBILE_SLOT_LIMIT,
  CATALOG_DISPLAY_SLOT_LIMIT,
  formatCoverDateBadge,
  formatEventNextSession,
  formatPriceRub,
  formatShowcasePriceLabel,
  formatShowcaseSessionDate,
  formatShowcaseSessionDateCompact,
  getDepartingSoonMinutes,
  isOpenDate,
  MIN_DISPLAY_PRICE_RUB,
  WIDE_DISPLAY_SLOT_LIMIT,
} from '@/lib/event-card-meta';
import { resolveEventCardObjectPosition } from '@/lib/event-image-focus';
import { resolveEventCardFallbackImage, resolveEventCardPrimaryImage } from '@/lib/event-card-image';
import {
  resolveEventCardDestinationLabel,
  resolveEventCardLocationLabel,
  resolveHubAfficheLocationLine,
} from '@/lib/event-location';
import { dayRouteItemFromEvent } from '@/lib/day-route-from-place';
import { formatMoneyRange, formatPriceFrom } from '@/lib/format';
import { formatAgeLimit } from '@/lib/event-page-utils';
import { trackProductCardClick } from '@/lib/catalog-analytics';
import { formatPublicTitle } from '@/lib/format-public-title';
import { eventHref } from '@/lib/routes';

const SLOT_CHIP_CLASS =
  'inline-btn inline-flex h-6 min-h-6 shrink-0 items-center justify-center rounded-md bg-surface-muted px-2.5 text-ui-xs font-medium leading-none text-graphite-muted';

const SLOT_CHIP_PURCHASE_CLASS =
  'transition hover:bg-primary/10 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

const DETAILS_LINK_CLASS =
  'event-card__buy-btn relative z-[2] inline-flex min-h-8 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold sm:min-h-9 sm:px-3.5 sm:text-sm';

/** Rail / city-hub cards: wider horizontal padding so label is not flush to pill edges. */
const SHOWCASE_BUY_CTA_CLASS =
  'event-card__buy-btn inline-flex shrink-0 items-center justify-center gap-0.5 whitespace-nowrap rounded-lg px-2.5 py-[5px] text-[11px] font-semibold leading-none';

const TITLE_LINK_CLASS =
  'relative z-[2] font-display text-ui-sm font-bold leading-snug text-graphite transition-colors hover:text-primary-600 sm:text-base';

const SLOT_MORE_CHIP_CLASS = `${SLOT_CHIP_CLASS} text-graphite-muted`;

type CatalogCardSession = PublicSessionDto | PublicCatalogListItemDto;

type EventCardProps = {
  session: CatalogCardSession;
  compact?: boolean;
  showcaseRail?: boolean;
  /** City hub context: city already known - drop category·city and address noise. */
  cityHub?: boolean;
  editorsPickBadge?: boolean;
  landingActions?: boolean;
  /** LCP: eager load + priority for first visible catalog cards. */
  imagePriority?: boolean;
  /** Скрыть скрытые anchor-виджеты (каталог-слоты) — на странице события в related. */
  suppressPurchaseAnchors?: boolean;
};

export function EventCard({
  session,
  compact = false,
  showcaseRail = false,
  cityHub = false,
  editorsPickBadge = false,
  landingActions = false,
  suppressPurchaseAnchors = true,
  imagePriority = false,
}: EventCardProps) {
  if (showcaseRail || editorsPickBadge) {
    return (
      <ShowcaseEventCard
        session={session}
        rail={showcaseRail}
        cityHub={cityHub}
        editorsPickBadge={editorsPickBadge}
        imagePriority={imagePriority}
      />
    );
  }

  const href = eventHref(session);
  const imageObjectPosition = resolveEventCardObjectPosition({
    slug: session.slug,
    sourceSlug: 'sourceSlug' in session ? session.sourceSlug : undefined,
    id: session.id,
  });
  const imagePrimarySrc = resolveEventCardPrimaryImage(session);
  const imageFallbackSrc = resolveEventCardFallbackImage(session);
  const emptyImageFallback = (
    <div className="flex h-full w-full items-center justify-center bg-surface-muted">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 shadow-sm">
        <div className="h-3.5 w-3.5 rotate-45 rounded-[6px] border border-slate-300/90 bg-slate-200/90" />
      </div>
    </div>
  );
  const priceValue =
    typeof session.priceFrom === 'number' && session.priceFrom >= MIN_DISPLAY_PRICE_RUB
      ? session.priceFrom
      : null;
  const hasPrice = priceValue != null;
  const priceTo =
    'priceTo' in session && typeof session.priceTo === 'number' ? session.priceTo : null;
  const priceRangeLabel = hasPrice ? formatMoneyRange(priceValue, priceTo) : null;
  const openDate = isOpenDate(session);
  const departingSoonMinutes = openDate ? null : getDepartingSoonMinutes(session.startsAt);
  const nextSessionLabel = openDate ? null : formatEventNextSession(session);
  const allSlotLabels = collectAllDisplaySlotLabels(session);
  const showSlotPills = allSlotLabels.length > 0;
  const sessionMetaLabel = openDate ? null : nextSessionLabel;
  // List DTO has no real rating / visit counts - never invent ★ 4.9.
  const landingBadges = landingActions ? deriveLandingCardBadges(session) : [];
  const cityLabel = resolveEventCardDestinationLabel(session);
  const rawLocation = resolveEventCardLocationLabel(session);
  const locationLabel =
    rawLocation && cityLabel && rawLocation.trim().toLowerCase() === cityLabel.trim().toLowerCase()
      ? null
      : rawLocation;
  const durationLabel = extractDurationLabel(session.tags);
  const ageLabel = formatAgeLimit(session.ageLimit);
  const showCategory = Boolean(session.category && !landingActions);
  // Missing display price (<100 / null) is not "soon" - event can still be on sale.
  const showSoonBadge = false;
  const purchase = useCatalogPurchase(session);
  const displayTitle = formatPublicTitle(session.title);
  const showPurchaseWidgets = landingActions && !suppressPurchaseAnchors && purchase.purchaseEnabled;
  const dayRouteVenue = dayRouteItemFromEvent({
    id: session.id,
    slug: session.slug,
    title: session.title,
    city: session.city,
    cityId: 'cityId' in session ? session.cityId : undefined,
    citySlug: session.citySlug,
    venueId: 'venueId' in session ? session.venueId : undefined,
    venueSlug: session.venueSlug,
    venue: session.venue,
    venueKind: session.venueKind,
    venueAddress: session.venueAddress,
    venueLatitude: 'venueLatitude' in session ? (session as { venueLatitude?: number | null }).venueLatitude : undefined,
    venueLongitude:
      'venueLongitude' in session ? (session as { venueLongitude?: number | null }).venueLongitude : undefined,
    startsAt: session.startsAt,
    dateLabel: session.dateLabel,
    timeLabel: session.timeLabel,
    imageUrl: session.imageUrl,
  });

  const cardBody = (
    <>
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-muted">
        {landingActions ? (
          <Link
            href={href}
            className="absolute inset-0 z-[1]"
            aria-label={`Страница события: ${displayTitle}`}
            onClick={() =>
              trackProductCardClick({
                eventId: session.id,
                slug: session.slug,
                source: 'landing_card',
              })
            }
          />
        ) : null}
        <CardSafeImage
          src={imagePrimarySrc}
          alt={displayTitle}
          fill
          sizes={IMAGE_SIZES.eventCard}
          priority={imagePriority}
          loading={imagePriority ? undefined : 'lazy'}
          style={{ objectPosition: imageObjectPosition }}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          fallback={
            imageFallbackSrc && imageFallbackSrc !== imagePrimarySrc ? (
              <CardSafeImage
                src={imageFallbackSrc}
                alt={displayTitle}
                fill
                sizes={IMAGE_SIZES.eventCard}
                className="object-cover"
                fallback={emptyImageFallback}
              />
            ) : (
              emptyImageFallback
            )
          }
        />

        <EventImageBadges event={session} showSoonBadge={showSoonBadge} hideRelativeCoverDate />
        <EventFavoriteButton eventId={session.id} className="right-2 top-2 sm:right-3 sm:top-3" />
        {!landingActions && dayRouteVenue ? (
          <AddToDayRouteButton
            intent="day"
            compact
            variant="overlay"
            className="!absolute !z-[3] !bottom-2 !right-2 !min-h-8 !gap-1 !px-2.5 !py-1.5 !text-[11px] sm:!bottom-3 sm:!right-3"
            venue={dayRouteVenue}
          />
        ) : null}
      </div>

      <div className={`flex flex-1 flex-col ${compact ? 'gap-2 p-3.5 sm:gap-2.5 sm:p-4' : 'gap-2.5 p-4'}`}>
        {/* Category left, duration + age right — one row, no extra duration line. */}
        {showCategory || ageLabel || durationLabel ? (
          <div className="flex w-full items-center justify-between gap-2">
            {showCategory ? (
              <p className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-graphite-muted sm:text-[11px]">
                {session.category}
              </p>
            ) : (
              <span className="min-w-0" />
            )}
            <span className="inline-flex shrink-0 items-center gap-2 text-[10px] font-semibold tabular-nums text-graphite-muted sm:text-[11px]">
              {durationLabel ? (
                <span className="inline-flex items-center gap-1" title="Длительность">
                  <Clock className="event-card-meta-icon" />
                  <span>{durationLabel}</span>
                </span>
              ) : null}
              {ageLabel ? (
                <span title="Возрастное ограничение">{ageLabel}</span>
              ) : null}
            </span>
          </div>
        ) : null}

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
            {displayTitle}
          </Link>
        </h2>

        {landingBadges.length > 0 ? <LandingCardBadgeRow badges={landingBadges} /> : null}

        {/* Primary schedule line */}
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-ui-xs sm:text-ui-sm">
            {openDate ? (
              <span className="font-semibold text-success">Билет с открытой датой</span>
            ) : departingSoonMinutes ? (
              <span className="inline-flex items-center gap-1 font-semibold text-urgency">
                <Clock className="event-card-meta-icon" />
                Скоро начало · через {departingSoonMinutes} мин
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

        {/* Catalog cards: no alt slots (confusing). Landing purchase chips only. */}
        {showSlotPills && landingActions ? (
          <EventCardSlotChips
            session={session}
            labels={allSlotLabels}
            narrow={compact}
            showPurchaseWidgets={showPurchaseWidgets}
            onOpenPurchase={purchase.openPurchase}
          />
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

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          {landingActions ? (
            <LandingPurchaseButton
              session={session}
              label={hasPrice ? `Купить от ${formatPriceRub(session.priceFrom)} ₽` : 'Купить'}
              className="event-card__buy-btn relative z-[2] inline-flex w-full items-center justify-center rounded-xl px-3 py-2.5 text-ui-sm font-semibold"
            />
          ) : (
            <>
              {priceRangeLabel ? (
                <span className="relative z-[2] min-w-0 flex-1 whitespace-nowrap text-left text-base font-extrabold tabular-nums tracking-tight text-primary-700 sm:text-xl">
                  {priceRangeLabel}
                </span>
              ) : (
                <span />
              )}
              <Link
                href={href}
                className={`${DETAILS_LINK_CLASS} max-sm:hidden`}
                onClick={() =>
                  trackProductCardClick({
                    eventId: session.id,
                    slug: session.slug,
                    source: 'event_card_cta',
                  })
                }
              >
                <Ticket className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                Купить
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
        className="absolute inset-0 z-[1] rounded-2xl"
        aria-label={`Событие: ${displayTitle}`}
        onClick={onCardNavigate}
      />
      {cardBody}
    </article>
  );
}

function EventCardSlotChips({
  session,
  labels,
  narrow,
  showPurchaseWidgets,
  onOpenPurchase,
}: {
  session: CatalogCardSession;
  labels: string[];
  narrow: boolean;
  showPurchaseWidgets: boolean;
  onOpenPurchase: (slotLabel: string) => void;
}) {
  const renderChip = (label: string) => {
    const chipClass = `${SLOT_CHIP_CLASS}${showPurchaseWidgets ? ` ${SLOT_CHIP_PURCHASE_CLASS}` : ''}`;
    if (showPurchaseWidgets) {
      return (
        <CatalogPurchaseChip
          key={label}
          session={session}
          label={label}
          className={chipClass}
          onOpen={onOpenPurchase}
        >
          {label}
        </CatalogPurchaseChip>
      );
    }
    return (
      <span key={label} className={chipClass}>
        {label}
      </span>
    );
  };

  /** 2-up grid: fill L→R; odd remainder / single stay in left column (same inset as left of a pair). */
  const renderSlotGrid = (sliceLabels: string[], moreCount: number, className: string) => {
    const items: Array<{ key: string; node: ReactNode }> = sliceLabels.map((label) => ({
      key: label,
      node: renderChip(label),
    }));
    if (moreCount > 0) {
      items.push({
        key: `__more_${moreCount}`,
        node: <span className={SLOT_MORE_CHIP_CLASS}>ещё {moreCount}</span>,
      });
    }
    return (
      <div className={`grid grid-cols-2 gap-1.5 ${className}`}>
        {items.map((item) => (
          <div key={item.key} className="flex justify-center">
            {item.node}
          </div>
        ))}
      </div>
    );
  };

  if (narrow) {
    const mobileLabels = labels.slice(0, COMPACT_MOBILE_SLOT_LIMIT);
    const mobileMore = Math.max(0, labels.length - COMPACT_MOBILE_SLOT_LIMIT);
    const gridLabels = labels.slice(0, CATALOG_DISPLAY_SLOT_LIMIT);
    const gridMore = Math.max(0, labels.length - CATALOG_DISPLAY_SLOT_LIMIT);

    return (
      <>
        {renderSlotGrid(mobileLabels, mobileMore, 'sm:hidden')}
        {renderSlotGrid(gridLabels, gridMore, 'hidden sm:grid')}
      </>
    );
  }

  const wideLabels = labels.slice(0, WIDE_DISPLAY_SLOT_LIMIT);
  const wideMore = Math.max(0, labels.length - WIDE_DISPLAY_SLOT_LIMIT);

  return (
    <div className="flex flex-nowrap items-center gap-1.5 overflow-hidden">
      {wideLabels.map((label) => renderChip(label))}
      {wideMore > 0 ? <span className={SLOT_MORE_CHIP_CLASS}>ещё {wideMore}</span> : null}
    </div>
  );
}

function normalizeCardLabel(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Venue/pier for showcase cards - never city alone and never a title duplicate. */
function resolveShowcaseLocationLine(session: CatalogCardSession, cityLabel: string | null): string | null {
  const locationLabel = resolveEventCardLocationLabel(session);
  if (!locationLabel) return null;
  const locationNorm = normalizeCardLabel(locationLabel);
  if (!locationNorm) return null;
  if (cityLabel && locationNorm === normalizeCardLabel(cityLabel)) return null;
  if (locationNorm === normalizeCardLabel(session.title)) return null;
  return locationLabel;
}

function ShowcaseEventCard({
  session,
  rail = false,
  cityHub = false,
  editorsPickBadge = false,
  imagePriority = false,
}: {
  session: CatalogCardSession;
  rail?: boolean;
  cityHub?: boolean;
  editorsPickBadge?: boolean;
  imagePriority?: boolean;
}) {
  const href = eventHref(session);
  const imageObjectPosition = resolveEventCardObjectPosition({
    slug: session.slug,
    sourceSlug: 'sourceSlug' in session ? session.sourceSlug : undefined,
    id: session.id,
  });
  const imagePrimarySrc = resolveEventCardPrimaryImage(session);
  const imageFallbackSrc = resolveEventCardFallbackImage(session);
  const emptyImageFallback = (
    <div className="flex h-full w-full items-center justify-center bg-surface-muted text-3xl text-graphite-muted">
      ·
    </div>
  );
  const hasPrice = typeof session.priceFrom === 'number' && session.priceFrom >= MIN_DISPLAY_PRICE_RUB;
  const dateLabel = rail ? formatShowcaseSessionDateCompact(session) : formatShowcaseSessionDate(session);
  const cityLabel = resolveEventCardDestinationLabel(session) || null;
  const locationLine = cityHub
    ? resolveHubAfficheLocationLine(session)
    : resolveShowcaseLocationLine(session, cityLabel);
  const categoryLabel = cityHub ? null : session.category?.trim() || null;
  const showCityMeta = !cityHub && Boolean(categoryLabel || cityLabel);
  const priceLabel = hasPrice
    ? cityHub
      ? formatPriceFrom(session.priceFrom)
      : formatShowcasePriceLabel(session.priceFrom, 'priceTo' in session ? session.priceTo : null)
    : null;
  const coverDateBadge = formatCoverDateBadge(session);
  const imageSizes = cityHub ? IMAGE_SIZES.affichePoster : IMAGE_SIZES.eventCard;
  const displayTitle = formatPublicTitle(session.title);

  return (
    <article className="group event-card">
      <Link
        href={href}
        className="absolute inset-0 z-[1] rounded-2xl"
        aria-label={`Событие: ${displayTitle}`}
        onClick={() =>
          trackProductCardClick({
            eventId: session.id,
            slug: session.slug,
            source: rail ? 'showcase_rail' : 'showcase_card',
          })
        }
      />
      <div
        className={`relative w-full shrink-0 overflow-hidden bg-surface-muted ${
          cityHub ? 'aspect-[3/4]' : 'aspect-[16/9]'
        }`}
      >
        <CardSafeImage
          src={imagePrimarySrc}
          alt={displayTitle}
          fill
          sizes={imageSizes}
          priority={imagePriority}
          loading={imagePriority ? undefined : 'lazy'}
          style={{ objectPosition: imageObjectPosition }}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          fallback={
            imageFallbackSrc && imageFallbackSrc !== imagePrimarySrc ? (
              <CardSafeImage
                src={imageFallbackSrc}
                alt={displayTitle}
                fill
                sizes={imageSizes}
                className="object-cover"
                fallback={emptyImageFallback}
              />
            ) : (
              emptyImageFallback
            )
          }
        />

        <EventImageBadges
          event={session}
          rail={rail || cityHub}
          editorsPick={cityHub ? false : editorsPickBadge}
          dateOnly={cityHub}
        />
        {cityHub ? null : (
          <EventFavoriteButton eventId={session.id} className="right-2 top-2 sm:right-3 sm:top-3" />
        )}
      </div>

      <div
        className={`flex min-h-0 flex-1 flex-col text-left ${
          cityHub || rail ? 'gap-1.5 p-3' : 'gap-2 p-4 sm:p-5'
        }`}
      >
        <h3
          className={`font-display font-bold leading-snug text-graphite ${
            rail || cityHub ? 'line-clamp-2 text-ui-sm' : 'line-clamp-2 text-ui-sm sm:text-base'
          }`}
        >
          <Link
            href={href}
            className="relative z-[2] transition-colors hover:text-primary-600"
          >
            {displayTitle}
          </Link>
        </h3>

        {showCityMeta ? (
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
            {categoryLabel ? (
              <span className="rounded-md bg-surface-muted px-2 py-0.5 text-ui-xs font-medium text-graphite-muted">
                {categoryLabel}
              </span>
            ) : null}
            {cityLabel ? (
              <>
                {categoryLabel ? (
                  <span className="text-ui-xs text-graphite-muted" aria-hidden>
                    ·
                  </span>
                ) : null}
                <span className="truncate text-ui-xs text-graphite-muted">{cityLabel}</span>
              </>
            ) : null}
          </div>
        ) : null}

        <div className="flex min-w-0 flex-col gap-0.5">
          {!cityHub || !coverDateBadge ? (
            <p className="event-card-meta">
              <Clock className="event-card-meta-icon" />
              <span className="truncate font-medium text-graphite">{dateLabel}</span>
            </p>
          ) : null}
          {locationLine ? (
            <p className={`event-card-meta ${cityHub ? 'text-graphite-muted' : ''}`}>
              <MapPin className="event-card-meta-icon shrink-0" />
              <span className="truncate">{locationLine}</span>
            </p>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between gap-1.5 pt-1">
          {priceLabel ? (
            <span className="min-w-0 flex-1 whitespace-nowrap text-ui-sm font-extrabold tracking-tight text-graphite">
              {priceLabel}
            </span>
          ) : (
            <span />
          )}
          <span className={SHOWCASE_BUY_CTA_CLASS}>
            <Ticket className="h-3 w-3 shrink-0" strokeWidth={1.75} />
            Купить билет
          </span>
        </div>
      </div>
    </article>
  );
}
