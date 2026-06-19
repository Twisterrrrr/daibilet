import * as React from 'react';
import { ArrowLeft, CalendarDays, MapPin, Ticket } from 'lucide-react';

import { EventCard } from '@/components/EventCard';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { TeplohodWidgetEmbed, getTeplohodWidgetIds } from '@/components/TeplohodWidget';
import { formatMoney, formatNumber, publicData } from '@/data';
import { eventHref, eventSlug } from '@/routes';
import type { PublicEvent, PublicEventPage, PublicSession } from '@/types';

const API_BASE_URL =
  ((import.meta as ImportMeta & { env?: { VITE_DAIBILET_API_URL?: string } }).env?.VITE_DAIBILET_API_URL as string | undefined) ||
  'http://127.0.0.1:4000';
const MIN_DISPLAY_PRICE_RUB = 100;

export function EventPage({ slug }: { slug: string }) {
  const [payload, setPayload] = React.useState<PublicEventPage | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState('');

  React.useEffect(() => {
    let isDisposed = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    setIsLoading(true);

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
      <Header cityLabel={payload?.event.city || 'Все города'} search={query} onSearch={setQuery} onSection={navigateHome} />
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
            <section className="container-page grid gap-6 py-7 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0">
                <EventDescription event={payload.event} />
                <TicketPrices payload={payload} />
                <ScheduleTable payload={payload} />
                <RelatedEvents payload={payload} />
              </div>
              <aside className="grid content-start gap-4">
                <EventFacts event={payload.event} />
                <LandingLinks payload={payload} />
              </aside>
            </section>
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
    venueAddress: null,
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
  const price = stats.priceFrom ?? event.priceFrom;

  return (
    <section className="border-b border-slate-200 bg-slate-950 text-white">
      <div className="container-page grid gap-8 py-9 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end lg:py-12">
        <div>
          <button type="button" onClick={() => navigateHome('events')} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            К каталогу
          </button>
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">{event.category}</span>
            {ageLimit ? <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">{ageLimit}</span> : null}
          </div>
          <h1 className="max-w-4xl text-3xl font-bold tracking-tight sm:text-5xl">{event.seoH1 || event.title}</h1>
          <div className="mt-5 flex flex-wrap gap-2">
            {event.citySlug ? (
              <a href={`/cities/${event.citySlug}`} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-white/85 transition hover:bg-white/18 hover:text-white">
                <MapPin className="h-4 w-4" />
                {eventDestinationLabel(event)}
              </a>
            ) : null}
            {event.venueSlug ? (
              <a href={`/venues/${event.venueSlug}`} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-white/85 transition hover:bg-white/18 hover:text-white">
                <CalendarDays className="h-4 w-4" />
                {event.venue}
              </a>
            ) : null}
          </div>
        </div>
        <div className="rounded-xl bg-white/10 p-4">
          <div className="text-sm text-white/60">Билеты</div>
          <div className="mt-1 text-3xl font-bold">{formatMoney(price)}</div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-white/10 p-3">
              <div className="text-xl font-bold">{formatNumber(event.sessionCount || stats.sessions)}</div>
              <div className="text-white/60">сеансов</div>
            </div>
            <div className="rounded-lg bg-white/10 p-3">
              <div className="text-xl font-bold">{stats.vacant == null ? '-' : formatNumber(stats.vacant)}</div>
              <div className="text-white/60">мест</div>
            </div>
          </div>
          <BuyLink event={event} url={event.purchaseUrl} label="Купить билет" wide mode="embed" />
        </div>
      </div>
    </section>
  );
}

function EventDescription({ event }: { event: PublicEvent }) {
  const description = cleanDisplayText(event.description);
  if (!description) return null;

  return (
    <section className="mb-5 rounded-xl bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.07)]">
      <h2 className="text-lg font-semibold text-slate-950">О событии</h2>
      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{description}</p>
    </section>
  );
}

function TicketPrices({ payload }: { payload: PublicEventPage }) {
  const prices = buildTicketPriceRows(payload);
  if (!prices.length) return null;

  return (
    <section className="mb-5 rounded-xl bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.07)]">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Билеты и цены</h2>
          <p className="text-sm text-slate-500">Показываем доступные категории от поставщика. Финальная покупка и наличие открываются в виджете.</p>
        </div>
        {payload.stats.priceFrom ? <div className="text-sm font-semibold text-primary-700">{formatMoney(payload.stats.priceFrom)}</div> : null}
      </div>
      <div className="mt-4 grid gap-2">
        {prices.map((price) => (
          <div key={price.key} className="grid gap-3 rounded-lg bg-slate-50 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-900">{price.title}</div>
              <div className="mt-0.5 text-xs leading-5 text-slate-500">
                {[price.description, price.source].filter(Boolean).join(' · ')}
              </div>
            </div>
            <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
              <div className="text-sm font-semibold text-slate-950">{formatMoney(price.priceRub)}</div>
              {price.purchaseUrl ? <BuyLink event={payload.event} url={price.purchaseUrl} label="Выбрать" mode="anchor" /> : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function buildTicketPriceRows(payload: PublicEventPage) {
  if (Array.isArray(payload.ticketPrices) && payload.ticketPrices.length) {
    return payload.ticketPrices
      .filter((price) => typeof price.priceRub === 'number' && price.priceRub >= MIN_DISPLAY_PRICE_RUB)
      .map((price) => ({
        key: price.key,
        title: price.title,
        priceRub: price.priceRub,
        source: price.source || null,
        description: price.description || null,
        purchaseUrl: price.purchaseUrl || payload.event.purchaseUrl || null,
      }));
  }

  const eventTitle = normalizeTextKey(payload.event.title);
  const rows = payload.offers
    .filter((offer) => offer.active !== false && typeof offer.priceRub === 'number' && offer.priceRub >= MIN_DISPLAY_PRICE_RUB)
    .map((offer) => {
      const rawTitle = cleanDisplayText(offer.title) || '';
      const title = normalizeTicketTitle(rawTitle, eventTitle);
      return {
        key: `${title}:${offer.priceRub}:${offer.sourceCode}`,
        title,
        priceRub: offer.priceRub,
        source: sourceLabel(offer.sourceCode),
        description: 'Покупка открывается в виджете билетной системы.',
        purchaseUrl: offer.widgetUrl || offer.deeplinkUrl || payload.event.purchaseUrl || null,
      };
    });

  if (!rows.length && payload.stats.priceFrom) {
    rows.push({
      key: `fallback:${payload.stats.priceFrom}`,
      title: 'Билет',
      priceRub: payload.stats.priceFrom,
      source: null,
      description: 'Точная категория билета уточняется в виджете поставщика.',
      purchaseUrl: payload.event.purchaseUrl || null,
    });
  }

  const unique = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const key = `${normalizeTextKey(row.title)}:${row.priceRub}`;
    if (!unique.has(key)) unique.set(key, row);
  }

  return Array.from(unique.values()).sort((a, b) => (a.priceRub || 0) - (b.priceRub || 0)).slice(0, 8);
}

function normalizeTicketTitle(rawTitle: string, eventTitleKey: string) {
  const titleKey = normalizeTextKey(rawTitle);
  if (!titleKey || titleKey === eventTitleKey) return 'Билет';
  if (titleKey === 'widget' || titleKey.includes('ticketscloud widget')) return 'Билет';
  return rawTitle;
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

function eventDestinationLabel(event: PublicEvent) {
  if (event.destinationType === 'region' && event.destination) return event.destination;
  return event.city;
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

function normalizeTextKey(value?: string | null) {
  return cleanDisplayText(value).toLowerCase().replace(/\s+/g, ' ');
}

function ScheduleTable({ payload }: { payload: PublicEventPage }) {
  const visibleSessions = payload.sessions.slice(0, 5);
  const totalSessions = payload.stats.sessions || payload.sessions.length;
  const hiddenCount = Math.max(0, totalSessions - visibleSessions.length);

  return (
    <section className="rounded-xl bg-white shadow-[0_10px_30px_rgba(15,23,42,0.07)]">
      <div className="border-b border-slate-100 p-4">
        <h2 className="text-lg font-semibold text-slate-950">Ближайшие сеансы</h2>
        <p className="mt-1 text-sm text-slate-500">Показываем ближайшие пять. Остальные даты и время доступны в виджете билетной системы.</p>
      </div>
      <div className="overflow-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
              <th className="px-4 py-3 font-semibold">Дата</th>
              <th className="px-4 py-3 font-semibold">Время</th>
              <th className="px-4 py-3 font-semibold">Цена</th>
              <th className="px-4 py-3 font-semibold">Места</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {visibleSessions.map((session) => (
              <tr key={session.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-950">{session.dateLabel || 'Открытая дата'}</td>
                <td className="px-4 py-3 text-slate-600">{session.timeLabel || '-'}</td>
                <td className="px-4 py-3 font-semibold text-slate-950">{formatMoney(session.priceFrom ?? payload.event.priceFrom)}</td>
                <td className="px-4 py-3 text-slate-600">{session.vacant ?? '-'}</td>
                <td className="px-4 py-3">
                  <BuyLink event={payload.event} url={session.purchaseUrl || payload.event.purchaseUrl} label="Купить" mode="anchor" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!payload.sessions.length ? <div className="p-6 text-sm text-slate-500">Расписание пока не загружено.</div> : null}
        {hiddenCount > 0 ? (
          <div className="border-t border-slate-100 p-4 text-sm text-slate-500">
            Еще {formatNumber(hiddenCount)} сеансов доступны после перехода к покупке.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function EventFacts({ event }: { event: PublicEvent }) {
  return (
    <section className="rounded-xl bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.07)]">
      <h3 className="text-sm font-semibold text-slate-950">Где проходит</h3>
      <div className="mt-3 grid gap-3 text-sm">
        {event.citySlug ? (
          <a href={`/cities/${event.citySlug}`} className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 hover:bg-primary-50">
            <MapPin className="mt-0.5 h-4 w-4 text-primary-600" />
            <span>
              {eventDestinationLabel(event)}
              {event.destinationType === 'region' && event.city ? <span className="block text-xs text-slate-500">{event.city}</span> : null}
            </span>
          </a>
        ) : null}
        {event.venueSlug ? (
          <a href={`/venues/${event.venueSlug}`} className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 hover:bg-primary-50">
            <CalendarDays className="mt-0.5 h-4 w-4 text-primary-600" />
            <span>{event.venue}{event.venueAddress ? ` · ${event.venueAddress}` : ''}</span>
          </a>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {event.tags.slice(0, 8).map((tag) => (
          <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{tag}</span>
        ))}
      </div>
    </section>
  );
}

function LandingLinks({ payload }: { payload: PublicEventPage }) {
  if (!payload.landings.length) return null;

  return (
    <section className="rounded-xl bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.07)]">
      <h3 className="text-sm font-semibold text-slate-950">Подборки</h3>
      <div className="mt-3 grid gap-3">
        {payload.landings.map((landing) => (
          <a key={landing.slug} href={`/landings/${landing.slug}`} className="rounded-lg bg-slate-50 p-3 transition hover:bg-primary-50/70">
            <div className="text-sm font-semibold text-slate-950">{landing.title}</div>
            <div className="mt-1 text-xs text-slate-500">{landing.subtitle}</div>
          </a>
        ))}
      </div>
    </section>
  );
}

function RelatedEvents({ payload }: { payload: PublicEventPage }) {
  if (!payload.related.length) return null;

  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold text-slate-950">Похожие события</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {payload.related.slice(0, 6).map((event) => (
          <EventCard key={`${event.id}:${event.startsAt}`} event={event} compact />
        ))}
      </div>
    </section>
  );
}

function BuyLink({
  event,
  url,
  label,
  wide = false,
  mode = 'link',
}: {
  event?: PublicEvent;
  url?: string | null;
  label: string;
  wide?: boolean;
  mode?: 'link' | 'anchor' | 'embed';
}) {
  const teplohod = event ? getTeplohodWidgetIds(event) : null;
  if (teplohod && mode === 'embed') {
    return <TeplohodWidgetEmbed tepEventId={teplohod.tepEventId} tepWidgetId={teplohod.tepWidgetId} />;
  }

  if (teplohod && mode === 'anchor') {
    return (
      <a href="#teplohod-widget" className={`${wide ? 'mt-4 w-full' : ''} inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700`}>
        <Ticket className="h-4 w-4" />
        {label}
      </a>
    );
  }

  if (!url) {
    return (
      <span className={`mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-white/10 px-4 text-sm font-semibold text-white/50 ${wide ? 'w-full' : ''}`}>
        Нет ссылки
      </span>
    );
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" className={`${wide ? 'mt-4 w-full' : ''} inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700`}>
      <Ticket className="h-4 w-4" />
      {label}
    </a>
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
  window.location.href = section === 'top' ? '/' : `/#${section}`;
}
