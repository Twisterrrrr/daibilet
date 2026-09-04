'use client';

import * as React from 'react';
import Link from 'next/link';
import { Calendar, ChevronRight, MapPin, Percent, Shield, Users } from 'lucide-react';

import type { PublicEventPageDto } from '@daibilet/contracts/public';
import { AddToDayRouteButton } from '@/components/AddToDayRouteButton.client';
import { EventPageCitySync } from '@/components/EventPageCitySync.client';
import { EventRatingBadge } from '@/components/EventPdpChrome.client';
import {
  compareSessionsByStartsAt,
  expandSessionPurchaseVariants,
  extractTcEventIdFromSession,
  isSessionPurchaseBlocked,
  pickDefaultSessionDayKey,
  pickRepresentativeSession,
  resolveTcPurchaseTarget,
} from '@/lib/event-purchase';
import {
  formatAgeLimit,
  formatBuyCardPrice,
  formatBuyCardPriceHint,
  formatCategoryPrice,
  formatHeroBuyButtonPrice,
  formatPriceRub,
  formatVacantSeats,
  getTicketOldPrice,
  getTicketPriceRange,
  buildGroupedTicketCategories,
  FLEXIBLE_SCHEDULE_LABEL,
  isFlexibleScheduleSession,
  scrollToBuyCard,
} from '@/lib/event-page-utils';
import { dayRouteItemFromEvent } from '@/lib/day-route-from-place';
import { formatPublicTitle } from '@/lib/format-public-title';
import { splitLongTitleAtBreak } from '@/lib/split-long-title';
import { buildEventBreadcrumbs } from '@/lib/structured-data';
import { resolveEventHeroObjectPosition } from '@/lib/event-image-focus';
import { venueHref } from '@/lib/routes';
import { formatStreetAddress } from '@/lib/address';
import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { CheckoutModalButton } from '@/components/CheckoutModal.client';
import { EventVenueTrigger } from '@/components/EventVenueModal.client';
import { trackSelectTickets } from '@/lib/catalog-analytics';
import {
  getTeplohodWidgetIds,
  resolveTeplohodCheckoutUrl,
} from '@/components/TeplohodWidget.client';
import {
  normalizeTcPurchaseUrl,
  TcOptionBuyButton,
  TcSessionSlot,
  TcWidgetButton,
} from '@/components/TcWidget.client';

type EventSession = PublicEventPageDto['sessions'][number] & {
  dateLabel?: string | null;
  timeLabel?: string | null;
};

/** Buy card: nearest upcoming slots only - not the full day dump. */
const EVENT_PAGE_NEAREST_SLOTS = 5;

export function EventBuyCard({ payload }: { payload: PublicEventPageDto }) {
  const { event } = payload;
  const sessions = payload.sessions ?? [];
  const offers = payload.offers ?? [];
  const teplohod = getTeplohodWidgetIds(event);
  const primaryOffer = offers.find((offer) => offer.active !== false) || offers[0] || null;
  const priceRange = getTicketPriceRange(payload);
  const oldPrice = getTicketOldPrice(payload, priceRange);
  const ticketCategories = buildGroupedTicketCategories(payload);
  const purchaseOptions = payload.purchaseOptions ?? [];
  const showMultiPurchase = purchaseOptions.length >= 2;
  const priceHint =
    priceRange && !showMultiPurchase && ticketCategories.length === 0
      ? formatBuyCardPriceHint(priceRange)
      : null;
  const scheduleSessions = [...(sessions as EventSession[]).flatMap((session) => expandSessionPurchaseVariants(session))]
    .sort(compareSessionsByStartsAt)
    .slice(0, EVENT_PAGE_NEAREST_SLOTS);
  const allFlexible =
    scheduleSessions.length > 0 &&
    scheduleSessions.every((session) => isFlexibleScheduleSession(session));
  const { tcEventId, purchaseUrl, isTcWidget, purchaseTargets } = resolveTcPurchaseTarget(
    event,
    sessions,
    primaryOffer,
  );
  const isTepWidget = Boolean(teplohod);
  const tepCheckoutUrl = teplohod
    ? resolveTeplohodCheckoutUrl({
        purchaseUrl: purchaseUrl || event.purchaseUrl || event.widgetUrl,
        tepEventId: teplohod.tepEventId,
        tepWidgetId: teplohod.tepWidgetId,
      }) ||
      purchaseUrl ||
      event.purchaseUrl ||
      event.widgetUrl ||
      null
    : null;
  const buyButtonClass = 'btn-primary w-full py-3.5 text-base';
  const nextSession = pickRepresentativeSession(sessions as EventSession[]);
  const dayRouteVenue = dayRouteItemFromEvent({
    id: event.id,
    slug: event.slug,
    title: event.title,
    city: event.city,
    cityId: event.cityId,
    citySlug: event.citySlug,
    venueId: event.venueId,
    venueSlug: event.venueSlug,
    venue: event.venue,
    venueKind: event.venueKind,
    venueAddress: event.venueAddress,
    venueLatitude: event.venueLatitude,
    venueLongitude: event.venueLongitude,
    startsAt: nextSession?.startsAt,
    dateLabel: nextSession?.dateLabel,
    timeLabel: nextSession?.timeLabel,
    imageUrl: event.imageUrl,
  });

  return (
    <div className="min-w-0 w-full overflow-hidden rounded-card border border-slate-200 bg-white p-4 shadow-card sm:p-6 lg:p-7">
      {priceRange ? (
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="break-words text-2xl font-bold tracking-tight text-graphite sm:text-3xl lg:text-4xl">
              {formatBuyCardPrice(priceRange)}
            </span>
            {oldPrice ? (
              <span className="text-base text-graphite-muted line-through decoration-slate-400">
                {formatPriceRub(oldPrice)}
              </span>
            ) : null}
            <span className="text-sm text-graphite-muted">/ чел.</span>
          </div>
          {priceHint ? <p className="mt-1 text-xs text-graphite-muted">{priceHint}</p> : null}
        </div>
      ) : (
        <div>
          <p className="text-lg font-semibold text-graphite-muted">Цена уточняется</p>
          <p className="mt-1 text-sm leading-relaxed text-graphite-muted">
            Актуальные тарифы появятся при покупке в виджете организатора.
          </p>
        </div>
      )}

      {showMultiPurchase ? (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-graphite-muted">
            Варианты билетов
          </h2>
          <ul className="space-y-2">
            {purchaseOptions.map((option) => (
              <li
                key={option.id}
                className="flex items-start justify-between gap-3 rounded-xl bg-surface-muted px-3.5 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-graphite">{option.title}</p>
                  {option.description ? (
                    <p className="mt-1 text-xs leading-relaxed text-graphite-muted">{option.description}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {typeof option.priceFrom === 'number' ? (
                    <span className="text-sm font-bold text-graphite">{formatPriceRub(option.priceFrom)}</span>
                  ) : null}
                  {option.externalId ? (
                    <TcOptionBuyButton
                      tcEventId={String(option.externalId)}
                      purchaseUrl={option.purchaseUrl || option.widgetUrl}
                    />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs leading-relaxed text-graphite-muted">
            Нажмите «Купить» напротив нужного варианта - откроется виджет оплаты.
          </p>
        </div>
      ) : (
        <>
          {ticketCategories.length > 0 ? (
            <div className="mt-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-graphite-muted">
                Категории билетов
              </h2>
              <ul className="space-y-2.5">
                {ticketCategories.map((row) => (
                  <li key={row.key}>
                    <div className="flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-graphite">{row.name}</span>
                        {row.description ? (
                          <p className="mt-0.5 text-xs leading-relaxed text-graphite-muted">{row.description}</p>
                        ) : null}
                      </div>
                      <span className="shrink-0 font-medium text-graphite">
                        {formatCategoryPrice(row.minPrice, row.maxPrice)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : priceRange && priceRange.min !== priceRange.max ? (
            <p className="mt-4 text-sm text-graphite-muted">
              Расшифровка тарифов откроется при оплате: взрослый, детский и другие категории.
            </p>
          ) : null}

          {scheduleSessions.length > 0 ? (
            allFlexible ? (
              <div className="mt-6 rounded-xl bg-surface-muted px-3.5 py-3">
                <p className="text-sm font-medium text-graphite">{FLEXIBLE_SCHEDULE_LABEL}</p>
                <p className="mt-1 text-xs leading-relaxed text-graphite-muted">
                  Конкретный день и время выбираете при покупке - приходить в системную дату из каталога не нужно.
                </p>
              </div>
            ) : (
              <SessionDayStrip
                sessions={scheduleSessions}
                isTcWidget={isTcWidget && !isTepWidget}
                tcEventId={tcEventId}
              />
            )
          ) : null}

          <div className="mt-6">
            {isTepWidget && tepCheckoutUrl ? (
              <CheckoutModalButton
                checkoutUrl={tepCheckoutUrl}
                label="Купить билет"
                className={buyButtonClass}
                onOpen={() =>
                  trackSelectTickets({
                    eventId: String(teplohod?.tepEventId || event.id),
                    provider: 'teplohod',
                    source: 'event_buy_card',
                  })
                }
              />
            ) : isTcWidget && tcEventId ? (
              <TcWidgetButton
                tcEventId={tcEventId}
                purchaseUrl={purchaseUrl}
                purchaseTargets={purchaseTargets}
                label="Купить билет"
                wide
              />
            ) : purchaseUrl ? (
              <a
                href={normalizeTcPurchaseUrl(purchaseUrl) || purchaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buyButtonClass}
              >
                Купить билет
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-200 px-6 py-3.5 text-base font-medium text-slate-400"
              >
                Билеты недоступны
              </button>
            )}
          </div>
        </>
      )}

      {dayRouteVenue ? (
        <div className="mt-4">
          <AddToDayRouteButton intent="day" className="w-full !rounded-xl" venue={dayRouteVenue} />
        </div>
      ) : null}

      <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-surface-muted px-3 py-2.5 text-center">
        <Shield className="h-4 w-4 shrink-0 text-graphite-muted" strokeWidth={1.75} />
        <span className="text-xs text-graphite-muted">
          Безопасная покупка через виджет
        </span>
      </div>
    </div>
  );
}

function sessionDayKey(session: EventSession): string {
  if (session.startsAt) {
    const date = new Date(session.startsAt);
    if (!Number.isNaN(date.getTime())) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
  }
  return String(session.dateLabel || session.id).trim() || session.id;
}

function SessionDayStrip({
  sessions,
  isTcWidget,
  tcEventId,
}: {
  sessions: EventSession[];
  isTcWidget: boolean;
  tcEventId: string | null;
}) {
  const days = React.useMemo(() => {
    const map = new Map<string, { key: string; label: string; sessions: EventSession[] }>();
    for (const session of sessions) {
      const key = sessionDayKey(session);
      const existing = map.get(key);
      if (existing) {
        existing.sessions.push(session);
        continue;
      }
      map.set(key, {
        key,
        label: session.dateLabel || key,
        sessions: [session],
      });
    }
    return [...map.values()];
  }, [sessions]);

  const defaultDayKey = React.useMemo(() => pickDefaultSessionDayKey(days), [days]);
  const [selectedDay, setSelectedDay] = React.useState(defaultDayKey);
  const [userPickedDay, setUserPickedDay] = React.useState(false);

  React.useEffect(() => {
    if (userPickedDay) {
      if (!days.some((day) => day.key === selectedDay)) {
        setSelectedDay(defaultDayKey);
        setUserPickedDay(false);
      }
      return;
    }
    setSelectedDay(defaultDayKey);
  }, [days, defaultDayKey, selectedDay, userPickedDay]);

  const daySessions = days.find((day) => day.key === selectedDay)?.sessions || sessions;

  return (
    <div className="mt-6 min-w-0">
      {days.length > 1 ? (
        <div className="relative -mx-4 sm:-mx-6 lg:-mx-7">
          <div
            role="tablist"
            aria-label="Дни"
            className="horizontal-snap-row flex max-w-full gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1 pr-10 [scrollbar-width:none] sm:px-6 sm:pr-12 lg:px-7 [&::-webkit-scrollbar]:hidden"
          >
            {days.map((day) => {
              const active = day.key === selectedDay;
              const dayOpen = day.sessions.some((session) => !isSessionPurchaseBlocked(session));
              return (
                <button
                  key={day.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setUserPickedDay(true);
                    setSelectedDay(day.key);
                  }}
                  className={`shrink-0 snap-start rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${
                    active
                      ? 'bg-graphite text-white'
                      : 'bg-surface-muted text-graphite-muted hover:bg-slate-200/80 hover:text-graphite'
                  } ${!dayOpen ? 'opacity-70' : ''}`}
                >
                  <span className="block whitespace-nowrap">{day.label}</span>
                  <span className={`mt-0.5 block text-[10px] font-medium ${active ? 'text-white/70' : 'text-graphite-muted/80'}`}>
                    {dayOpen
                      ? `${day.sessions.length} ${day.sessions.length === 1 ? 'сеанс' : 'сеанса'}`
                      : 'закрыто'}
                  </span>
                </button>
              );
            })}
            <span className="w-3 shrink-0" aria-hidden="true" />
          </div>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent sm:w-12"
            aria-hidden="true"
          />
        </div>
      ) : null}

      {isTcWidget ? (
        <p className="mb-2 mt-3 text-[11px] text-graphite-muted">Нажмите на сеанс, чтобы купить билет</p>
      ) : (
        <p className="mb-2 mt-3 text-[11px] font-medium uppercase tracking-wider text-graphite-muted">Время</p>
      )}
      <div className="min-w-0 space-y-1.5">
        {daySessions.map((session) => {
          const blocked = isSessionPurchaseBlocked(session);
          if (isTcWidget && !blocked) {
            return (
              <TcSessionSlot
                key={`${session.id}-${session.startsAt}`}
                tcEventId={extractTcEventIdFromSession(session) || tcEventId || ''}
                session={session}
              />
            );
          }
          return (
            <StaticSessionRow
              key={`${session.id}-${session.startsAt}`}
              session={session}
              blocked={blocked}
            />
          );
        })}
      </div>
    </div>
  );
}

function StaticSessionRow({
  session,
  blocked = false,
}: {
  session: EventSession;
  blocked?: boolean;
}) {
  const flexibleSchedule = isFlexibleScheduleSession(session);
  const weekday = session.dateLabel?.split(',')[0]?.trim() || '-';
  const closedLabel =
    session.vacant === 0 ? 'Распродано' : blocked ? 'Продажи закрыты' : null;

  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl bg-surface-muted px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        {!flexibleSchedule ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-primary-700 shadow-sm">
            {weekday}
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-graphite">
            {flexibleSchedule ? FLEXIBLE_SCHEDULE_LABEL : session.timeLabel || session.dateLabel || '-'}
          </p>
          {session.timeLabel && session.dateLabel && !flexibleSchedule ? (
            <p className="truncate text-xs text-graphite-muted">{session.dateLabel}</p>
          ) : null}
        </div>
      </div>
      {closedLabel ? (
        <span className="shrink-0 text-xs font-medium text-graphite-muted">{closedLabel}</span>
      ) : typeof session.vacant === 'number' && session.vacant > 0 ? (
        <span className="shrink-0 text-xs font-medium text-graphite-muted">
          {formatVacantSeats(session.vacant)}
        </span>
      ) : null}
    </div>
  );
}

export function EventHeroBuyButton({
  payload,
  priceLabel,
  wide = false,
}: {
  payload: PublicEventPageDto;
  priceLabel: string;
  wide?: boolean;
}) {
  const { event } = payload;
  const sessions = payload.sessions ?? [];
  const offers = payload.offers ?? [];
  const trimmedPrice = priceLabel.trim();
  const label = trimmedPrice
    ? `Купить билет - ${trimmedPrice}`
    : 'Купить билет';
  const purchaseOptions = payload.purchaseOptions ?? [];
  const showMultiPurchase = purchaseOptions.length >= 2;
  const teplohod = getTeplohodWidgetIds(event);
  const primaryOffer = offers.find((offer) => offer.active !== false) || offers[0] || null;
  const { tcEventId, purchaseUrl, isTcWidget, purchaseTargets } = resolveTcPurchaseTarget(
    event,
    sessions,
    primaryOffer,
  );
  const heroClass = `btn-primary min-h-11 px-6 py-3.5 text-base font-semibold sm:min-h-12 sm:px-7 sm:py-3 sm:text-lg ${wide ? 'w-full' : ''}`;
  const tepCheckoutUrl = teplohod
    ? resolveTeplohodCheckoutUrl({
        purchaseUrl: purchaseUrl || event.purchaseUrl || event.widgetUrl,
        tepEventId: teplohod.tepEventId,
        tepWidgetId: teplohod.tepWidgetId,
      }) ||
      purchaseUrl ||
      event.purchaseUrl ||
      event.widgetUrl ||
      null
    : null;

  if (showMultiPurchase) {
    return (
      <button type="button" onClick={scrollToBuyCard} className={heroClass}>
        {label}
      </button>
    );
  }

  // TC native widget before TEP modal: avoid iframe chrome around ticketscloud UI.
  if (isTcWidget && tcEventId && !teplohod) {
    return (
      <TcWidgetButton
        tcEventId={tcEventId}
        purchaseUrl={purchaseUrl}
        purchaseTargets={purchaseTargets}
        label={label}
        wide={wide}
        variant="hero"
      />
    );
  }

  if (tepCheckoutUrl) {
    return (
      <CheckoutModalButton
        checkoutUrl={tepCheckoutUrl}
        label={label}
        className={heroClass}
        onOpen={() =>
          trackSelectTickets({
            eventId: String(teplohod?.tepEventId || event.id),
            provider: 'teplohod',
            source: 'event_hero_buy',
          })
        }
      />
    );
  }

  if (purchaseUrl) {
    const href = normalizeTcPurchaseUrl(purchaseUrl) || purchaseUrl;
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={heroClass}>
        {label}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={scrollToBuyCard}
      className={`btn-primary min-h-10 px-5 py-3 text-base font-semibold sm:px-6 sm:py-2.5 ${wide ? 'w-full' : ''}`}
    >
      {label}
    </button>
  );
}

export function EventHero({
  payload,
  aggregate = null,
}: {
  payload: PublicEventPageDto;
  aggregate?: { ratingValue: number; reviewCount: number } | null;
}) {
  const { event, stats } = payload;
  // Header follows event city (page context beats global filter).
  const ageLimit = formatAgeLimit(event.ageLimit);
  const priceRange = getTicketPriceRange(payload);
  const oldPrice = getTicketOldPrice(payload, priceRange);
  const fallbackPrice = formatPriceRub(stats.priceFrom ?? event.priceFrom);
  const priceLabel = priceRange ? formatHeroBuyButtonPrice(priceRange) : fallbackPrice ? `от ${fallbackPrice}` : '';
  const heroImage = String(event.imageUrl || '').trim();
  const heroObjectPosition = resolveEventHeroObjectPosition({
    slug: event.slug,
    sourceSlug: event.sourceSlug,
    externalId: event.externalId,
    id: event.id,
  });
  const nextSession = pickRepresentativeSession((payload.sessions ?? []) as EventSession[]);
  const canOpenVenueModal = Boolean(event.venue && (event.venueId || event.venueSlug));
  const venuePageHref = canOpenVenueModal
    ? venueHref({
        id: event.venueId || event.venueSlug || event.venue,
        slug: event.venueSlug,
        name: event.venue,
        type: event.venueKind,
      })
    : null;
  const breadcrumbs = buildEventBreadcrumbs(event);
  const placeLabel = event.venue || event.city || null;
  const venueAddressRaw = String(event.venueAddress || '').trim();
  const venueStreetAddress =
    formatStreetAddress(venueAddressRaw, { city: event.city }) || venueAddressRaw;
  // Skip venue/place chip when it duplicates the address line in the same overlay.
  const placeDuplicatesAddress =
    Boolean(placeLabel && venueStreetAddress) &&
    venueStreetAddress.toLocaleLowerCase('ru').includes(String(placeLabel).toLocaleLowerCase('ru'));
  const solidChipClassName =
    'inline-flex max-w-full items-center gap-1 rounded-full bg-slate-950/75 px-2.5 py-1 text-[11px] font-medium text-white';
  const solidChipLinkClassName = `${solidChipClassName} cursor-pointer transition hover:bg-slate-950/90 hover:underline hover:decoration-white/50 hover:underline-offset-2`;

  const heroTitle = formatPublicTitle(String(event.seoH1 || event.title || '').trim());
  const titleSplit = splitLongTitleAtBreak(heroTitle);
  const longHeroTitle = Boolean(titleSplit) || heroTitle.length > 48;
  const nearestLabel = nextSession
    ? isFlexibleScheduleSession(nextSession)
      ? FLEXIBLE_SCHEDULE_LABEL
      : `Ближайший: ${[nextSession.dateLabel, nextSession.timeLabel].filter(Boolean).join(', ')}`
    : null;
  const trailCrumbs = breadcrumbs.length > 1 ? breadcrumbs.slice(0, -1) : breadcrumbs;
  const currentCrumb = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 1] : null;

  return (
    <div
      className={`relative isolate grid w-full min-w-0 overflow-hidden bg-slate-900 aspect-[3/4] md:aspect-auto ${
        longHeroTitle
          ? 'md:min-h-[22rem] lg:min-h-[28rem]'
          : 'md:min-h-80 lg:min-h-[420px]'
      }`}
    >
      <EventPageCitySync city={event.city} />
      <SafeImage
        src={heroImage || null}
        alt={formatPublicTitle(event.title)}
        fill
        priority
        sizes={IMAGE_SIZES.eventHero}
        style={{ objectPosition: heroObjectPosition }}
        className="object-cover object-[center_20%] opacity-80"
        fallback={
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary-600 to-primary-900">
            <span className="text-8xl opacity-30">🎭</span>
          </div>
        }
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/45 to-slate-900/25" />

      <div className="container-page absolute inset-0 z-10 flex min-w-0 flex-col justify-end pb-5 pt-20 md:pb-8 md:pt-24">
        {/* 1. Breadcrumbs without event title (last crumb sr-only for a11y; JSON-LD stays full). */}
        <nav aria-label="Хлебные крошки" className="mb-2 flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-white/70">
          {trailCrumbs.map((crumb, index) => (
            <span key={`${crumb.path}:${index}`} className="inline-flex shrink-0 items-center gap-1.5">
              {index > 0 ? <ChevronRight className="h-3.5 w-3.5" aria-hidden /> : null}
              <Link href={crumb.path} className="transition hover:text-white">
                {crumb.name}
              </Link>
            </span>
          ))}
          {currentCrumb ? <span className="sr-only">{currentCrumb.name}</span> : null}
        </nav>

        <div className="flex min-w-0 items-end justify-between gap-4">
          <div className="min-w-0 max-w-3xl">
            {/* 2. Category / type - readable, not full-width giant caps */}
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              {event.category ? (
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">
                  {event.category}
                </p>
              ) : null}
              {aggregate ? (
                <span className="hidden md:inline-flex">
                  <EventRatingBadge ratingValue={aggregate.ratingValue} reviewCount={aggregate.reviewCount} />
                </span>
              ) : null}
            </div>

            {/* 3. Title */}
            <h1
              className={`font-bold leading-tight text-white break-normal ${
                longHeroTitle
                  ? 'text-xl sm:text-3xl lg:text-4xl'
                  : 'text-2xl sm:text-3xl lg:text-4xl'
              }`}
            >
              {titleSplit ? (
                <>
                  {titleSplit.lead}
                  {titleSplit.mark}
                  <br />
                  {titleSplit.tail}
                </>
              ) : (
                heroTitle
              )}
            </h1>

            {/* 4. Location + age */}
            {(placeLabel && !placeDuplicatesAddress) || ageLimit || oldPrice ? (
              <div className="mt-3 flex min-w-0 flex-wrap gap-1.5">
                {placeLabel && !placeDuplicatesAddress ? (
                  venuePageHref ? (
                    <Link href={venuePageHref} className={solidChipLinkClassName}>
                      <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                      <span className="truncate">{placeLabel}</span>
                    </Link>
                  ) : (
                    <span className={solidChipClassName}>
                      <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                      <span className="truncate">{placeLabel}</span>
                    </span>
                  )
                ) : null}
                {ageLimit ? (
                  <span className={solidChipClassName}>
                    <Users className="h-3 w-3" strokeWidth={1.75} />
                    {ageLimit}
                  </span>
                ) : null}
                {oldPrice ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/95 px-2.5 py-1 text-[11px] font-semibold text-slate-900">
                    <Percent className="h-3 w-3" strokeWidth={1.75} />
                    Скидка
                  </span>
                ) : null}
              </div>
            ) : null}

            {/* 5. Price min-max range (not only «от») */}
            {priceRange || fallbackPrice ? (
              <div className="mt-3 flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="break-words text-2xl font-bold text-white sm:text-3xl">
                  {priceRange ? formatBuyCardPrice(priceRange) : `от ${fallbackPrice}`}
                </span>
                {oldPrice ? (
                  <span className="text-sm text-white/55 line-through">{formatPriceRub(oldPrice)}</span>
                ) : null}
              </div>
            ) : null}

            {/* 6. Nearest slot */}
            {nearestLabel ? (
              <div className="mt-3 flex min-w-0 items-center gap-1.5 text-sm text-white/85 sm:mt-4">
                <Calendar className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span className="min-w-0">{nearestLabel}</span>
              </div>
            ) : null}

            {/* 7. Street + house, own left-aligned line (not the full index address). */}
            {venueStreetAddress ? (
              canOpenVenueModal ? (
                <EventVenueTrigger
                  event={event}
                  className={`flex w-full min-w-0 items-start justify-start gap-1.5 text-left text-sm text-white/85 underline decoration-white/30 underline-offset-2 hover:text-white ${
                    nearestLabel ? 'mt-1.5' : 'mt-3 sm:mt-4'
                  }`}
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
                  <span className="min-w-0 break-words">{venueStreetAddress}</span>
                </EventVenueTrigger>
              ) : (
                <span
                  className={`flex w-full min-w-0 items-start justify-start gap-1.5 text-left text-sm text-white/85 ${
                    nearestLabel ? 'mt-1.5' : 'mt-3 sm:mt-4'
                  }`}
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
                  <span className="min-w-0 break-words">{venueStreetAddress}</span>
                </span>
              )
            ) : null}
          </div>

          {/* Sticky bar covers mobile; buy CTA only where sticky is hidden */}
          {priceLabel ? (
            <div className="hidden shrink-0 lg:block">
              <EventHeroBuyButton payload={payload} priceLabel={priceLabel} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
