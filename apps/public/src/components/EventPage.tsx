import * as React from 'react';
import { Calendar, ChevronRight, Clock, MapPin, Shield, Users } from 'lucide-react';

import { EventCard } from '@/components/EventCard';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { TeplohodWidgetEmbed, getTeplohodWidgetIds } from '@/components/TeplohodWidget';
import {
  TcSessionSlot,
  TcWidgetButton,
  expandSessionPurchaseVariants,
  extractTcEventIdFromSession,
  listPurchasableSessionVariants,
  pickPurchasableTcSession,
  pickRepresentativeSession,
  resolveTcPurchaseTarget,
} from '@/components/TcWidget';
import { formatStreetAddress } from '@/lib/address';
import { resolveEventCardDestinationLabel, resolveEventCardLocationLabel } from '@/lib/event-location';
import { FLEXIBLE_SCHEDULE_LABEL, isFlexibleScheduleSession } from '@/lib/event-card-meta';
import { formatVacantSeats } from '@/lib/pluralize';
import { landingPageHref } from '@/lib/landing-slugs';
import { formatNumber, publicData } from '@/data';
import { readCachedEventPage, writeCachedEventPage } from '@/lib/event-page-cache';
import { eventHref, eventSlug } from '@/routes';
import type { PublicEvent, PublicEventPage, PublicSession } from '@/types';

const API_BASE_URL =
  ((import.meta as ImportMeta & { env?: { VITE_DAIBILET_API_URL?: string } }).env?.VITE_DAIBILET_API_URL as string | undefined) ||
  'http://127.0.0.1:4000';
const MIN_DISPLAY_PRICE_RUB = 100;

export function EventPage({ slug }: { slug: string }) {
  const [payload, setPayload] = React.useState<PublicEventPage | null>(() => readCachedEventPage(slug));
  const [isLoading, setIsLoading] = React.useState(() => !readCachedEventPage(slug));
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isDisposed = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    const cached = readCachedEventPage(slug);

    if (cached) {
      setPayload(cached);
      applyEventMeta(cached.event);
      replaceOpaqueEventUrl(cached.event);
      setError(null);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    fetch(`${API_BASE_URL}/api/public/events/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error('event not found');
        return response.json() as Promise<PublicEventPage | null>;
      })
      .then((data) => {
        if (!data) throw new Error('event not found');
        if (isDisposed) return;
        writeCachedEventPage(slug, data);
        setPayload(data);
        applyEventMeta(data.event);
        replaceOpaqueEventUrl(data.event);
        setError(null);
      })
      .catch(() => {
        if (isDisposed) return;
        const fallbackPayload = buildStaticEventPage(slug);
        if (fallbackPayload) {
          setPayload(fallbackPayload);
          applyEventMeta(fallbackPayload.event);
          replaceOpaqueEventUrl(fallbackPayload.event);
          setError(null);
          return;
        }

        setError('Событие не найдено или backend сейчас недоступен.');
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (!isDisposed) setIsLoading(false);
      });

    return () => {
      isDisposed = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [slug]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header cityLabel={payload?.event.city || 'Все города'} onSection={navigateHome} searchCity={payload?.event.city} />
      <main>
        {isLoading ? (
          <section className="container-page py-12">
            <div className="rounded-xl border border-slate-200 p-6 text-sm text-slate-500">Загружаем событие...</div>
          </section>
        ) : null}
        {error ? (
          <section className="container-page py-12">
            <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-sm font-medium text-red-700">{error}</div>
          </section>
        ) : null}
        {payload && !error ? (
          <>
            <EventHero payload={payload} />
            <div className="container-page py-8">
              <div className="grid gap-8 lg:grid-cols-3">
                <div className="space-y-8 lg:col-span-2">
                  <EventDescription event={payload.event} />
                  <QuickInfo event={payload.event} />
                  <EventTags event={payload.event} />
                  <div className="lg:hidden" id="buy-card">
                    <BuyCard payload={payload} />
                  </div>
                  <LandingLinks payload={payload} />
                </div>
                <div className="hidden lg:col-span-1 lg:block">
                  <div className="sticky top-20" id="buy-card-desktop">
                    <BuyCard payload={payload} />
                  </div>
                </div>
              </div>
            </div>
            <RelatedEventsSection payload={payload} />
          </>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}

function buildStaticEventPage(slugOrId: string): PublicEventPage | null {
  const requested = String(slugOrId || '').trim();
  const session = publicData.sessions.find((item) => item.id === requested || item.slug === requested || eventSlug(item) === requested);
  if (!session) return null;

  const canonicalKey = staticSessionGroupKey(session);
  const sessions = publicData.sessions
    .filter((item) => staticSessionGroupKey(item) === canonicalKey)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const canonicalSession = sessions[0] || session;
  const priceValues = sessions.map((item) => item.priceFrom).filter((price): price is number => Number.isFinite(price) && Number(price) >= MIN_DISPLAY_PRICE_RUB);
  const vacantValues = sessions.map((item) => item.vacant).filter((vacant): vacant is number => Number.isFinite(vacant));
  const landings = publicData.landings
    .filter((landing) => session.landingSlugs.includes(landing.slug))
    .map((landing) => ({
      slug: landing.slug,
      title: landing.title,
      subtitle: landing.subtitle,
      chips: landing.chips,
    }));

  return {
    generatedAt: publicData.generatedAt,
    event: {
      ...sessionToPublicEvent(canonicalSession),
      sessionCount: sessions.length,
      groupEventIds: sessions.map((item) => item.id),
    },
    sessions: sessions.map((item) => ({
      id: item.id,
      eventId: item.id,
      startsAt: item.startsAt,
      endsAt: null,
      dateLabel: item.dateLabel,
      timeLabel: item.timeLabel,
      timeBucket: item.timeBucket,
      sourceStatus: null,
      priceFrom: item.priceFrom,
      vacant: item.vacant,
      purchaseUrl: item.purchaseUrl,
      purchaseReady: Boolean(item.purchaseUrl),
      purchaseUrlSource: item.purchaseUrl ? 'fallback' : null,
    })),
    offers: session.purchaseUrl
      ? [
          {
            id: `${session.id}:fallback-offer`,
            sourceCode: session.offerSourceCode || 'TICKETSCLOUD',
            title: session.offerTitle || session.title,
            priceRub: session.priceFrom,
            widgetUrl: session.widgetUrl,
            deeplinkUrl: session.deeplinkUrl,
            active: true,
          },
        ]
      : [],
    related: publicData.sessions
      .filter((item) => item.id !== session.id && (item.city === session.city || item.category === session.category))
      .slice(0, 6),
    landings,
    stats: {
      sessions: sessions.length,
      priceFrom: priceValues.length ? Math.min(...priceValues) : session.priceFrom,
      vacant: vacantValues.length ? Math.min(...vacantValues) : session.vacant,
    },
  };
}

function staticSessionGroupKey(session: PublicSession): string {
  return [session.title, session.city, session.venue].map((value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')).join('|');
}

function sessionToPublicEvent(session: PublicSession): PublicEvent {
  return {
    id: session.id,
    slug: eventSlug(session),
    sourceSlug: session.sourceSlug,
    sourceCode: session.offerSourceCode || null,
    externalId: null,
    widgetProvider: sourceLabel(session.offerSourceCode)?.includes('Teplohod') ? 'TEPLOHOD' : null,
    widgetPayload: null,
    title: session.title,
    description: null,
    imageUrl: session.imageUrl,
    category: session.category,
    tags: session.tags,
    city: session.city,
    cityId: session.cityId,
    citySlug: session.citySlug,
    sourceCitySlug: session.sourceCitySlug,
    venueId: session.venueId,
    venueSlug: session.venueSlug,
    venue: session.venue,
    venueAddress: session.venueAddress ?? null,
    venueKind: session.venueKind,
    ageLimit: null,
    priceFrom: session.priceFrom,
    vacant: session.vacant,
    eventType: 'fallback',
    landingSlugs: session.landingSlugs,
    purchaseUrl: session.purchaseUrl,
    widgetUrl: session.widgetUrl,
    deeplinkUrl: session.deeplinkUrl,
    purchaseReady: Boolean(session.purchaseUrl),
    purchaseMode: session.purchaseUrl ? 'widget' : null,
    purchaseProvider: session.offerSourceCode || null,
    purchaseUrlSource: session.purchaseUrl ? 'fallback' : null,
    seoH1: session.title,
    seoTitle: `${session.title} | Дайбилет`,
    seoDescription: `${session.title}: расписание, цена и покупка билета через билетную систему.`,
    canonicalPath: eventHref(session),
    isIndexable: true,
  };
}

function EventHero({ payload }: { payload: PublicEventPage }) {
  const { event, stats } = payload;
  const ageLimit = formatAgeLimit(event.ageLimit);
  const priceRange = getTicketPriceRange(payload);
  const priceLabel = priceRange ? formatBuyCardPrice(priceRange) : formatPriceRub(stats.priceFrom ?? event.priceFrom);
  const locationLabel = resolveEventCardLocationLabel(event);
  const [hasImageError, setHasImageError] = React.useState(false);
  const heroImage = String(event.imageUrl || '').trim();
  const nextSession =
    pickPurchasableTcSession(
      payload.sessions.flatMap((session) => expandSessionPurchaseVariants(session)).filter((session) => {
        if (!session.startsAt) return true;
        const date = new Date(session.startsAt);
        return !Number.isNaN(date.getTime()) && date > new Date();
      }),
    ) ||
    pickRepresentativeSession(payload.sessions) ||
    payload.sessions[0];

  return (
    <div className="relative">
      <div className="min-h-[calc(100vh-6rem)] overflow-hidden bg-slate-900 sm:min-h-0 sm:h-80 lg:h-[420px]">
        {heroImage && !hasImageError ? (
          <img
            src={heroImage}
            alt={event.title}
            className="absolute inset-0 h-full w-full object-cover object-top opacity-80 lg:object-[center_30%]"
            loading="eager"
            decoding="async"
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
          <a href="/events" className="transition hover:text-white">
            События
          </a>
          <ChevronRight className="h-3.5 w-3.5" />
          {event.citySlug ? (
            <>
              <a href={`/cities/${event.citySlug}`} className="transition hover:text-white">
                {resolveEventCardDestinationLabel(event)}
              </a>
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
              {locationLabel ? (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {locationLabel}
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
                <HeroBuyButton payload={payload} priceLabel={priceLabel} wide />
              </div>
            ) : null}
          </div>

          {priceLabel ? (
            <div className="hidden sm:block">
              <HeroBuyButton payload={payload} priceLabel={priceLabel} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function HeroBuyButton({
  payload,
  priceLabel,
  wide = false,
}: {
  payload: PublicEventPage;
  priceLabel: string;
  wide?: boolean;
}) {
  const { event, sessions } = payload;
  const label = `Купить билет — от ${priceLabel}`;
  const teplohod = getTeplohodWidgetIds(event);
  const primaryOffer = payload.offers.find((offer) => offer.active !== false) || payload.offers[0] || null;
  const { tcEventId, purchaseUrl, isTcWidget, purchaseTargets } = resolveTcPurchaseTarget(event, sessions, primaryOffer);
  const isTepWidget = Boolean(teplohod);

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

  if (isTepWidget) {
    return (
      <button
        type="button"
        onClick={() => openTeplohodWidget()}
        className={`inline-flex min-h-10 items-center justify-center rounded-xl bg-amber-500 px-5 py-3 text-base font-semibold text-white shadow-md shadow-amber-700/30 transition hover:bg-amber-600 active:bg-amber-700 sm:px-6 sm:py-2.5 ${wide ? 'w-full' : ''}`}
      >
        {label}
      </button>
    );
  }

  if (purchaseUrl) {
    return (
      <a
        href={purchaseUrl}
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

function scrollToBuyCard() {
  const el = document.getElementById('buy-card') || document.getElementById('buy-card-desktop');
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openTeplohodWidget() {
  scrollToBuyCard();

  const tryClick = (attempt = 0) => {
    const button = document.querySelector<HTMLElement>('#teplohod-widget .ti-tickets-event-tickets-buy');
    if (button) {
      button.click();
      return;
    }
    if (attempt < 24) window.setTimeout(() => tryClick(attempt + 1), 150);
  };

  window.setTimeout(() => tryClick(), 250);
}

function EventDescription({ event }: { event: PublicEvent }) {
  const description = String(event.description || '').trim();
  if (!description) return null;
  const hasHtml = /<[a-z][\s\S]*>/i.test(description);
  const textClassName = 'mt-4 max-w-none text-sm leading-7 text-slate-600';
  const paragraphClassName = 'm-0';

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900">О событии</h2>
      {hasHtml ? (
        <div
          className={`${textClassName} [&_li+li]:mt-2 [&_p+p]:mt-5 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5`}
          dangerouslySetInnerHTML={{ __html: sanitizeEventHtml(description) }}
        />
      ) : (
        <div className={`${textClassName} space-y-5`}>
          {splitDescriptionParagraphs(description).map((paragraph, index) => (
            <p key={index} className={paragraphClassName}>
              {paragraph}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function splitDescriptionParagraphs(text: string): string[] {
  const normalized = text.replace(/\r\n?/g, '\n').trim();
  const byBlankLine = normalized
    .split(/\n\s*\n+/)
    .map((part) => cleanDisplayText(part))
    .filter(Boolean);
  if (byBlankLine.length > 1) return byBlankLine;

  const byLine = normalized
    .split(/\n+/)
    .map((part) => cleanDisplayText(part))
    .filter(Boolean);
  if (byLine.length > 1) return byLine;

  const single = cleanDisplayText(normalized);
  return single ? [single] : [];
}

function QuickInfo({ event }: { event: PublicEvent }) {
  const address = resolveEventCardLocationLabel(event);
  const ageLimit = formatAgeLimit(event.ageLimit);
  if (!address && !ageLimit) return null;

  return (
    <>
      <div className="space-y-2 sm:hidden">
        {address ? (
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <MapPin className="h-4 w-4 text-primary-500" />
            <div>
              <span className="text-xs text-slate-500">Адрес</span>
              <p className="text-sm font-medium text-slate-900">{address}</p>
            </div>
          </div>
        ) : null}
        {ageLimit ? (
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Users className="h-4 w-4 text-primary-500" />
            <div>
              <span className="text-xs text-slate-500">Возраст</span>
              <p className="text-sm font-medium text-slate-900">{ageLimit}</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3">
        {address ? (
          <div className="rounded-xl border border-slate-200 bg-white p-3.5">
            <MapPin className="h-5 w-5 text-primary-500" />
            <p className="mt-1.5 text-xs text-slate-500">Адрес</p>
            <p className="line-clamp-2 text-sm font-medium text-slate-900">{address}</p>
          </div>
        ) : null}
        {event.citySlug ? (
          <a href={`/cities/${event.citySlug}`} className="rounded-xl border border-slate-200 bg-white p-3.5 transition hover:border-primary-200 hover:bg-primary-50/40">
            <Clock className="h-5 w-5 text-primary-500" />
            <p className="mt-1.5 text-xs text-slate-500">Город</p>
            <p className="text-sm font-medium text-slate-900">{resolveEventCardDestinationLabel(event)}</p>
          </a>
        ) : null}
        {ageLimit ? (
          <div className="rounded-xl border border-slate-200 bg-white p-3.5">
            <Users className="h-5 w-5 text-primary-500" />
            <p className="mt-1.5 text-xs text-slate-500">Возраст</p>
            <p className="text-sm font-medium text-slate-900">{ageLimit}</p>
          </div>
        ) : null}
      </div>
    </>
  );
}

function EventTags({ event }: { event: PublicEvent }) {
  if (!event.tags.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {event.tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function BuyCard({ payload }: { payload: PublicEventPage }) {
  const { event, sessions } = payload;
  const teplohod = getTeplohodWidgetIds(event);
  const primaryOffer = payload.offers.find((offer) => offer.active !== false) || payload.offers[0] || null;
  const priceRange = getTicketPriceRange(payload);
  const ticketCategories = buildGroupedTicketCategories(payload);
  const visibleSessions = listPurchasableSessionVariants(sessions).slice(0, 5);
  const { tcEventId, purchaseUrl, isTcWidget, purchaseTargets } = resolveTcPurchaseTarget(event, sessions, primaryOffer);
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
                  <span className="shrink-0 font-medium text-slate-900">{formatCategoryPrice(row.minPrice, row.maxPrice)}</span>
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
                <TcSessionSlot key={session.id} tcEventId={extractTcEventIdFromSession(session) || tcEventId || ''} session={session} />
              ) : (
                <StaticSessionRow key={session.id} session={session} />
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
            href={purchaseUrl}
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
          Безопасная оплата через{' '}
          {isTepWidget || String(offerSource || '').toUpperCase().includes('TEPLOHOD')
            ? 'teplohod.info'
            : isTcWidget || String(offerSource || '').toUpperCase().includes('TC')
              ? 'Ticketscloud'
              : 'Дайбилет'}
        </span>
      </div>
    </div>
  );
}

function StaticSessionRow({
  session,
}: {
  session: PublicEventPage['sessions'][number];
}) {
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
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">{formatVacantSeats(session.vacant)}</span>
      ) : session.vacant === 0 ? (
        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-500">Распродано</span>
      ) : null}
    </div>
  );
}

function buildGroupedTicketCategories(payload: PublicEventPage) {
  const order: string[] = [];
  const groupSortOrder = new Map<string, number>();
  const groups = new Map<string, { key: string; name: string; description: string | null; minPrice: number; maxPrice: number }>();

  for (const item of collectRawTicketPrices(payload)) {
    const { name, description } = parseTicketCategory(item);
    const key = `${name}|${description || ''}`.toLowerCase().replace(/\s+/g, ' ');
    const itemOrder = item.sortOrder ?? 9999;
    const existing = groups.get(key);
    if (!existing) {
      order.push(key);
      groups.set(key, { key, name, description, minPrice: item.priceRub, maxPrice: item.priceRub });
      groupSortOrder.set(key, itemOrder);
      continue;
    }
    existing.minPrice = Math.min(existing.minPrice, item.priceRub);
    existing.maxPrice = Math.max(existing.maxPrice, item.priceRub);
    groupSortOrder.set(key, Math.min(groupSortOrder.get(key) ?? 9999, itemOrder));
  }

  return order
    .map((key) => groups.get(key)!)
    .sort((a, b) => (groupSortOrder.get(a.key) ?? 9999) - (groupSortOrder.get(b.key) ?? 9999));
}

function parseTicketCategory(item: { title: string; description?: string | null; priceRub: number }) {
  const parts = splitTitlePartsWithoutWeekdays(item.title);
  const name = parts[0] || 'Билет';
  const parsedDescription = parts.length > 1 ? parts.slice(1).join(', ') : null;
  const apiDescription = cleanDisplayText(item.description);
  const description =
    parsedDescription || (apiDescription && !isGenericTicketDescription(apiDescription) ? apiDescription : null);

  return { name, description };
}

function isGenericTicketDescription(value?: string | null) {
  const text = cleanDisplayText(value).toLowerCase();
  if (!text) return true;
  if (text.includes('покупка открывается в виджете')) return true;
  if (text.includes('уточняется в виджете')) return true;
  if (text.includes('минимальная доступная цена')) return true;
  return false;
}

function collectRawTicketPrices(payload: PublicEventPage) {
  if (Array.isArray(payload.ticketPrices) && payload.ticketPrices.length) {
    return payload.ticketPrices
      .filter((price) => typeof price.priceRub === 'number' && price.priceRub >= MIN_DISPLAY_PRICE_RUB)
      .map((price) => ({
        title: cleanDisplayText(price.title) || 'Билет',
        description: cleanDisplayText(price.description) || null,
        priceRub: price.priceRub as number,
        sortOrder: price.sortOrder ?? null,
      }));
  }

  const eventTitleKey = cleanDisplayText(payload.event.title).toLowerCase().replace(/\s+/g, ' ');
  return payload.offers
    .filter((offer) => offer.active !== false && typeof offer.priceRub === 'number' && offer.priceRub >= MIN_DISPLAY_PRICE_RUB)
    .map((offer, index) => {
      const rawTitle = cleanDisplayText(offer.title) || '';
      const titleKey = rawTitle.toLowerCase().replace(/\s+/g, ' ');
      const title =
        !titleKey || titleKey === eventTitleKey || titleKey === 'widget' || titleKey.includes('ticketscloud widget')
          ? 'Билет'
          : rawTitle;
      const sortOrder = typeof offer.sortOrder === 'number' ? offer.sortOrder : index;
      return { title, description: null, priceRub: offer.priceRub as number, sortOrder };
    })
    .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
}

function splitTitlePartsWithoutWeekdays(title: string) {
  const parts = title.split(',').map((part) => part.trim()).filter(Boolean);
  const weekdayToken = /^(?:ПН|ВТ|СР|ЧТ|ПТ|СБ|ВС)$/iu;
  const weekdayRange = /^(?:ПН|ВТ|СР|ЧТ|ПТ|СБ|ВС)(?:\s*[,—–\-]\s*(?:ПН|ВТ|СР|ЧТ|ПТ|СБ|ВС))+$/iu;

  while (parts.length > 1) {
    const last = parts[parts.length - 1];
    if (weekdayToken.test(last) || weekdayRange.test(last)) {
      parts.pop();
      continue;
    }
    break;
  }

  return parts;
}

function formatCategoryPrice(minPrice: number, maxPrice: number) {
  if (minPrice === maxPrice) return formatPriceRub(minPrice);
  return `${formatPriceRub(minPrice)} – ${formatPriceRub(maxPrice)}`;
}

function getTicketPriceRange(payload: PublicEventPage): { min: number; max: number } | null {
  const values: number[] = [];

  if (Array.isArray(payload.ticketPrices) && payload.ticketPrices.length) {
    for (const price of payload.ticketPrices) {
      if (typeof price.priceRub === 'number' && price.priceRub >= MIN_DISPLAY_PRICE_RUB) values.push(price.priceRub);
    }
  } else {
    for (const offer of payload.offers) {
      if (offer.active !== false && typeof offer.priceRub === 'number' && offer.priceRub >= MIN_DISPLAY_PRICE_RUB) {
        values.push(offer.priceRub);
      }
    }
    if (typeof payload.stats.priceFrom === 'number' && payload.stats.priceFrom >= MIN_DISPLAY_PRICE_RUB) {
      values.push(payload.stats.priceFrom);
    }
    if (typeof payload.event.priceFrom === 'number' && payload.event.priceFrom >= MIN_DISPLAY_PRICE_RUB) {
      values.push(payload.event.priceFrom);
    }
  }

  if (!values.length) return null;
  return { min: Math.min(...values), max: Math.max(...values) };
}

function formatBuyCardPrice(range: { min: number; max: number }) {
  if (range.min === range.max) return `от ${formatPriceRub(range.min)}`;
  return `${formatPriceRub(range.min)} – ${formatPriceRub(range.max)}`;
}

function sourceLabel(sourceCode?: string | null) {
  const normalized = String(sourceCode || '').toUpperCase();
  if (normalized.includes('TC') || normalized.includes('TICKETSCLOUD')) return 'Ticketscloud';
  if (normalized.includes('TEPLOHOD')) return 'Teplohod.info';
  return normalized || null;
}

function formatAgeLimit(value?: string | null) {
  const text = String(value || '').trim();
  if (!text) return null;
  if (/^\d+$/.test(text)) return `${text}+`;
  return text;
}

function formatPriceRub(value?: number | null) {
  if (!value || value <= 0) return null;
  return `${formatNumber(Math.round(value))} ₽`;
}

function cleanDisplayText(value?: string | null) {
  return String(value || '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function sanitizeEventHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '');
}

function LandingLinks({ payload }: { payload: PublicEventPage }) {
  if (!payload.landings.length) return null;

  return (
    <section>
      <h2 className="text-lg font-bold text-slate-900">Подборки</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {payload.landings.map((landing) => (
          <a key={landing.slug} href={landingPageHref(landing.slug)} className="rounded-xl border border-slate-200 bg-white p-3.5 transition hover:border-primary-200 hover:bg-primary-50/40">
            <div className="text-sm font-semibold text-slate-950">{landing.title}</div>
            <div className="mt-1 text-xs text-slate-500">{landing.subtitle}</div>
          </a>
        ))}
      </div>
    </section>
  );
}

function RelatedEventsSection({ payload }: { payload: PublicEventPage }) {
  if (!payload.related.length) return null;

  return (
    <section className="border-t border-slate-100 bg-slate-50 py-12">
      <div className="container-page">
        <h2 className="text-xl font-bold text-slate-900">Похожие события в {payload.event.city}</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 min-[361px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
          {payload.related.slice(0, 8).map((event) => (
            <EventCard key={`${event.id}:${event.startsAt}`} event={event} compact />
          ))}
        </div>
      </div>
    </section>
  );
}

function replaceOpaqueEventUrl(event: PublicEvent) {
  const canonicalPath = event.canonicalPath || eventHref(event);
  if (window.location.pathname !== canonicalPath) {
    window.history.replaceState(null, '', canonicalPath);
  }
}

function applyEventMeta(event: PublicEvent) {
  document.title = event.seoTitle || `${event.title} | Дайбилет`;
  setMeta('description', event.seoDescription || event.description || event.title);
  setMeta('robots', event.isIndexable === false ? 'noindex,follow' : 'index,follow');
}

function setMeta(name: string, content: string) {
  let element = document.querySelector(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('name', name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function navigateHome(section: string) {
  if (section === 'events') {
    window.location.href = '/events';
    return;
  }
  if (section === 'cities' || section === 'destinations') {
    window.location.href = '/cities';
    return;
  }
  if (section === 'blog') {
    window.location.href = '/blog';
    return;
  }
  if (section === 'landings') {
    window.location.href = '/podborki';
    return;
  }
  window.location.href = section === 'top' ? '/' : `/#${section}`;
}
