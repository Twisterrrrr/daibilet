'use client';

import Link from 'next/link';
import { Calendar, ChevronRight, MapPin, Shield, Users } from 'lucide-react';
import { useState } from 'react';

import type { PublicEventPageDto } from '@daibilet/contracts/public';
import {
  extractTcEventIdFromSession,
  listPurchasableSessionVariants,
  pickRepresentativeSession,
  resolveTcPurchaseTarget,
} from '@/lib/event-purchase';
import {
  formatAgeLimit,
  formatBuyCardPrice,
  formatCategoryPrice,
  formatPriceRub,
  formatVacantSeats,
  getTicketPriceRange,
  buildGroupedTicketCategories,
  FLEXIBLE_SCHEDULE_LABEL,
  isFlexibleScheduleSession,
  scrollToBuyCard,
} from '@/lib/event-page-utils';
import { cityHref, venueHref } from '@/lib/routes';
import { getTeplohodWidgetIds, openTeplohodWidget, TeplohodWidgetEmbed } from '@/components/TeplohodWidget.client';
import { normalizeTcPurchaseUrl, TcSessionSlot, TcWidgetButton } from '@/components/TcWidget.client';

type EventSession = PublicEventPageDto['sessions'][number] & {
  dateLabel?: string | null;
  timeLabel?: string | null;
};

export function EventBuyCard({ payload }: { payload: PublicEventPageDto }) {
  const { event } = payload;
  const sessions = payload.sessions ?? [];
  const offers = payload.offers ?? [];
  const teplohod = getTeplohodWidgetIds(event);
  const primaryOffer = offers.find((offer) => offer.active !== false) || offers[0] || null;
  const priceRange = getTicketPriceRange(payload);
  const ticketCategories = buildGroupedTicketCategories(payload);
  const visibleSessions = listPurchasableSessionVariants(sessions as EventSession[]).slice(0, 5);
  const { tcEventId, purchaseUrl, isTcWidget, purchaseTargets } = resolveTcPurchaseTarget(
    event,
    sessions,
    primaryOffer,
  );
  const offerSource = primaryOffer?.sourceCode || event.purchaseProvider || event.sourceCode;
  const isTepWidget = Boolean(teplohod);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/50">
      {priceRange ? (
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-slate-900">{formatBuyCardPrice(priceRange)}</span>
          <span className="text-sm text-slate-400">/ чел.</span>
        </div>
      ) : (
        <p className="text-lg font-semibold text-slate-600">Цена уточняется</p>
      )}

      {ticketCategories.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Категории билетов</h3>
          <ul className="mt-2.5 space-y-2">
            {ticketCategories.map((row) => (
              <li key={row.key}>
                <div className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-slate-800">{row.name}</span>
                    {row.description ? (
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{row.description}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 font-medium text-slate-900">
                    {formatCategoryPrice(row.minPrice, row.maxPrice)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : priceRange && priceRange.min !== priceRange.max ? (
        <p className="mt-3 text-sm text-slate-500">Полный список категорий — в виджете при покупке.</p>
      ) : null}

      {visibleSessions.length > 0 ? (
        <div className="mt-5">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Calendar className="h-3.5 w-3.5" />
            Ближайшие сеансы
          </h3>
          {isTcWidget && !isTepWidget ? (
            <p className="mt-1 text-[11px] text-slate-400">Нажмите на сеанс для покупки</p>
          ) : null}
          <div className="mt-2.5 space-y-1.5">
            {visibleSessions.map((session) =>
              isTcWidget && !isTepWidget ? (
                <TcSessionSlot
                  key={`${session.id}-${session.startsAt}`}
                  tcEventId={extractTcEventIdFromSession(session) || tcEventId || ''}
                  session={session}
                />
              ) : (
                <StaticSessionRow key={`${session.id}-${session.startsAt}`} session={session} />
              ),
            )}
          </div>
        </div>
      ) : null}

      <div className="mt-5">
        {isTepWidget && teplohod ? (
          <TeplohodWidgetEmbed tepEventId={teplohod.tepEventId} tepWidgetId={teplohod.tepWidgetId} />
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
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3.5 text-base font-medium text-white transition hover:bg-primary-700"
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

      <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
        <Shield className="h-4 w-4 text-emerald-500" />
        <span className="text-xs text-slate-500">
          Безопасная оплата в виджете{' '}
          {isTepWidget || String(offerSource || '').toUpperCase().includes('TEPLOHOD')
            ? 'teplohod.info'
            : isTcWidget || String(offerSource || '').toUpperCase().includes('TC')
              ? 'Ticketscloud'
              : 'билетной системы организатора'}
        </span>
      </div>
    </div>
  );
}

function StaticSessionRow({ session }: { session: EventSession }) {
  const flexibleSchedule = isFlexibleScheduleSession(session);
  const weekday = session.dateLabel?.split(',')[0]?.trim() || '—';

  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
      <div className="flex items-center gap-3">
        {!flexibleSchedule ? (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 text-xs font-bold text-primary-700">
            {weekday}
          </div>
        ) : null}
        <div>
          <p className="text-sm font-medium text-slate-900">
            {flexibleSchedule ? FLEXIBLE_SCHEDULE_LABEL : session.dateLabel || '—'}
          </p>
          {session.timeLabel && !flexibleSchedule ? (
            <p className="text-xs text-slate-500">{session.timeLabel}</p>
          ) : null}
        </div>
      </div>
      {typeof session.vacant === 'number' && session.vacant > 0 ? (
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
          {formatVacantSeats(session.vacant)}
        </span>
      ) : session.vacant === 0 ? (
        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-500">Распродано</span>
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
  const normalizedPrice = priceLabel.replace(/^от\s+/i, '').trim();
  const label = normalizedPrice ? `Купить билет — от ${normalizedPrice}` : 'Купить билет';
  const teplohod = getTeplohodWidgetIds(event);
  const primaryOffer = offers.find((offer) => offer.active !== false) || offers[0] || null;
  const { tcEventId, purchaseUrl, isTcWidget, purchaseTargets } = resolveTcPurchaseTarget(
    event,
    sessions,
    primaryOffer,
  );

  if (isTcWidget && tcEventId) {
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

  if (teplohod) {
    return (
      <button
        type="button"
        onClick={() => {
          scrollToBuyCard();
          window.setTimeout(() => openTeplohodWidget(), 250);
        }}
        className={`inline-flex min-h-10 items-center justify-center rounded-xl bg-amber-500 px-5 py-3 text-base font-semibold text-white shadow-md shadow-amber-700/30 transition hover:bg-amber-600 active:bg-amber-700 sm:px-6 sm:py-2.5 ${wide ? 'w-full' : ''}`}
      >
        {label}
      </button>
    );
  }

  if (purchaseUrl) {
    const href = normalizeTcPurchaseUrl(purchaseUrl) || purchaseUrl;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex min-h-10 items-center justify-center rounded-xl bg-amber-500 px-5 py-3 text-base font-semibold text-white shadow-md shadow-amber-700/30 transition hover:bg-amber-600 active:bg-amber-700 sm:px-6 sm:py-2.5 ${wide ? 'w-full' : ''}`}
      >
        {label}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={scrollToBuyCard}
      className={`inline-flex min-h-10 items-center justify-center rounded-xl bg-amber-500 px-5 py-3 text-base font-semibold text-white shadow-md shadow-amber-700/30 transition hover:bg-amber-600 active:bg-amber-700 sm:px-6 sm:py-2.5 ${wide ? 'w-full' : ''}`}
    >
      {label}
    </button>
  );
}

export function EventHero({ payload }: { payload: PublicEventPageDto }) {
  const { event, stats } = payload;
  const ageLimit = formatAgeLimit(event.ageLimit);
  const priceRange = getTicketPriceRange(payload);
  const priceLabel = priceRange ? formatBuyCardPrice(priceRange) : formatPriceRub(stats.priceFrom ?? event.priceFrom) || '';
  const [hasImageError, setHasImageError] = useState(false);
  const heroImage = String(event.imageUrl || '').trim();
  const nextSession = pickRepresentativeSession((payload.sessions ?? []) as EventSession[]);
  const cityLink = event.citySlug || event.city ? cityHref({ name: event.city, slug: event.citySlug, sourceSlug: event.sourceCitySlug }) : null;
  const venueLink = event.venue
    ? venueHref({ id: event.venueId || event.venueSlug || event.venue, slug: event.venueSlug, name: event.venue, type: event.venueKind })
    : null;

  return (
    <div className="relative">
      <div className="min-h-[calc(100vh-6rem)] overflow-hidden bg-slate-900 sm:min-h-0 sm:h-80 lg:h-[420px]">
        {heroImage && !hasImageError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroImage}
            alt={event.title}
            className="absolute inset-0 h-full w-full object-cover object-top opacity-80 lg:object-[center_30%]"
            loading="eager"
            onError={() => setHasImageError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary-600 to-primary-900">
            <span className="text-8xl opacity-30">🎭</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
      </div>

      <div className="container-page absolute inset-x-0 bottom-0 pb-6 sm:pb-8">
        <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-sm text-white/70">
          <Link href="/events" className="transition hover:text-white">
            События
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          {cityLink ? (
            <>
              <Link href={cityLink} className="transition hover:text-white">
                {event.city}
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
            </>
          ) : null}
          {venueLink && event.venue ? (
            <>
              <Link href={venueLink} className="transition hover:text-white">
                {event.venue}
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
            </>
          ) : null}
          <span className="text-white/90">{event.category}</span>
        </nav>

        <div className="flex items-end justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                {event.category}
              </span>
              {ageLimit ? (
                <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
                  {ageLimit}
                </span>
              ) : null}
            </div>
            <h1 className="mt-2 text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl">
              {event.seoH1 || event.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-white/80">
              {ageLimit ? (
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {ageLimit}
                </span>
              ) : null}
              {event.city || event.venue ? (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {venueLink ? (
                    <Link href={venueLink} className="underline decoration-white/30 underline-offset-2 hover:text-white">
                      {event.venue || event.city}
                    </Link>
                  ) : (
                    event.city
                  )}
                </span>
              ) : null}
              {nextSession ? (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {isFlexibleScheduleSession(nextSession) || !nextSession.startsAt
                    ? 'Ближайший рейс — в виджете'
                    : `Ближайший: ${[nextSession.dateLabel, nextSession.timeLabel].filter(Boolean).join(', ')}`}
                </span>
              ) : null}
            </div>

            {priceLabel ? (
              <div className="mt-4 sm:hidden">
                <EventHeroBuyButton payload={payload} priceLabel={priceLabel} wide />
              </div>
            ) : null}
          </div>

          {priceLabel ? (
            <div className="hidden sm:block">
              <EventHeroBuyButton payload={payload} priceLabel={priceLabel} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
