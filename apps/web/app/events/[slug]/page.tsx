import type { Metadata } from 'next';

import { EventCard } from '@/components/EventCard';
import { ExpiredEventSessionNotice } from '@/components/ExpiredEventSessionNotice.client';
import { EventBuyCard, EventHero } from '@/components/EventPage.client';
import { EventPageScheduleNotice } from '@/components/EventPageScheduleNotice';
import { EventPdpBody } from '@/components/EventPdpBody.client';
import { VenuePdpContent } from '@/components/VenuePdpContent.client';
import { EventTags, EventTrustStrip } from '@/components/EventPageSections';
import { JsonLdScripts } from '@/components/JsonLdScripts';
import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import { toEventPageClientPayload } from '@/lib/event-page-client-props';
import {
  buildConcertLead,
  displayEventDescription,
  isConcertLikeEvent,
} from '@/lib/event-description-lead';
import { stripSessionDateLines } from '@/lib/event-description-session-lines';
import { eventHref } from '@/lib/routes';
import { resolveEventPageUrlPolicy } from '@/lib/event-page-url-policy';
import { getTicketPriceRange } from '@/lib/event-page-utils';
import { pageTitle, buildShareMetadata } from '@/lib/seo-meta';
import { resolveSsrOgImage } from '@/server/og-image';
import { buildEventListingMeta, buildEventPageMetaTitle } from '@/lib/seo-event-meta';
import { eventSeoOverride } from '@/lib/event-seo-overrides';
import { buildEventPageJsonLd } from '@/lib/structured-data';
import { pickRepresentativeSession } from '@/lib/event-purchase';
import { safeNotFound, isNextControlFlowError } from '@/lib/safe-not-found';
import {
  getCachedEventAggregateRating,
  loadEventDto,
} from '@/server/cached-event-data';
import { listTopEventSlugsForSsg } from '@/server/top-event-slugs';

/** ISR: regenerate HTML in background at most every 2h (matches EVENT_PAGE_REVALIDATE). */
export const revalidate = 7200;
/** Allow on-demand ISR for slugs not prebuilt (TOP_N SSG; rest fill at runtime). */
export const dynamicParams = true;

type PageProps = {
  params: Promise<{ slug: string }>;
};

function conciseEventLead(value: string): string {
  const normalized = value.replace(/\s+/gu, ' ').trim();
  if (normalized.length <= 110) return normalized.replace(/[.!?…]?$/u, '.');
  const clipped = normalized.slice(0, 110).replace(/\s+\S*$/u, '').trim();
  return clipped.replace(/[.!?…,:;]?$/u, '.');
}

function decodeEventParamSlug(slug: string): string {
  try {
    return decodeURIComponent(String(slug || '').trim());
  } catch {
    return String(slug || '').trim();
  }
}

function EventUnavailablePage({ slug }: { slug: string }) {
  return (
    <SiteLayout>
      <main className="container-page py-16">
        <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
          Событие временно недоступно
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Не удалось загрузить карточку. Обновите страницу через минуту.
        </p>
        <p className="mt-2 text-xs text-slate-400">{slug}</p>
      </main>
    </SiteLayout>
  );
}

/**
 * Prebuild top-N popular/upcoming events (MSK 8Gi). Rest fill via ISR on first hit.
 * Cap: EVENT_SSG_TOP_N (default 40, max 500; 0 = skip event SSG).
 */
export async function generateStaticParams() {
  try {
    const slugs = await listTopEventSlugsForSsg();
    return slugs.map((slug) => ({ slug }));
  } catch (error) {
    console.error('[SSG Error] listTopEventSlugsForSsg failed — empty params:', error);
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeEventParamSlug(slug);
  const loaded = await loadEventDto(decodedSlug);
  if (loaded.kind === 'miss') safeNotFound();
  if (loaded.kind === 'unavailable') {
    return {
      title: pageTitle('Событие временно недоступно'),
      robots: { index: false, follow: false },
    };
  }

  try {
    const event = loaded.payload.event;
    const stableRoute = loaded.payload.eventPageRoute;
    const linkedEventPage = loaded.payload.eventPage;
    const urlPolicy = resolveEventPageUrlPolicy({
      requestedSlug: decodedSlug,
      eventCanonicalPath: event.canonicalPath,
      fallbackPath: eventHref(event),
      eventPageRoute: stableRoute,
      publishedEventPage: linkedEventPage,
      availability: loaded.payload.availability,
    });
    const hasPublishedStablePage = urlPolicy.hasPublishedStablePage;
    const stablePageTitle = String(linkedEventPage?.seoTitle || linkedEventPage?.title || '').trim();
    const path = urlPolicy.canonicalPath;
    const priceRange = getTicketPriceRange(loaded.payload);
    const expansionMeta = buildEventListingMeta({
      eventTitle: event.title,
      cityName: event.city,
      citySlug: event.citySlug,
      sourceCitySlug: event.sourceCitySlug,
      priceFrom: priceRange?.min ?? event.priceFrom ?? loaded.payload.stats?.priceFrom,
    });
    const nextSession = pickRepresentativeSession(loaded.payload.sessions ?? []);
    const disambiguatedTitle = buildEventPageMetaTitle({
      eventTitle: event.title,
      seoTitle: event.seoTitle,
      cityName: event.city,
      venueName: event.venue,
      dateLabel: nextSession?.dateLabel,
      timeLabel: nextSession?.timeLabel,
    });
    const seoOverride = eventSeoOverride(decodedSlug);
    const title = pageTitle(seoOverride?.title || (hasPublishedStablePage ? stablePageTitle || disambiguatedTitle : expansionMeta?.title || disambiguatedTitle));
    const shareTitle = seoOverride
      ? `${seoOverride.title} | Дайбилет`
      : !hasPublishedStablePage && expansionMeta
        ? expansionMeta.title
        : `${title} | Дайбилет`;
    const seoDescription = String(linkedEventPage?.seoDescription || event.seoDescription || '').trim();
    const genericSeo = /^Расписание, цены и билеты на /iu.test(seoDescription);
    const concertLead = isConcertLikeEvent(event) ? buildConcertLead(event) : '';
    const renderedLead = displayEventDescription(event).split(/\n\s*\n/u)[0] || '';
    const eventLead = (genericSeo ? concertLead || renderedLead : stripSessionDateLines(seoDescription) || renderedLead)
      .replace(/\s+/gu, ' ')
      .trim();
    const description =
      (!hasPublishedStablePage && !genericSeo ? expansionMeta?.description : '') ||
      (genericSeo && eventLead
        ? `${conciseEventLead(eventLead)} Расписание, цены и билеты на событие. Покупка через виджет билетной системы.`
        : eventLead) ||
      (!hasPublishedStablePage ? expansionMeta?.description : '') ||
      `${event.title} - билеты на Дайбилет`;

    return {
      title: seoOverride || (!hasPublishedStablePage && expansionMeta)
        ? { absolute: seoOverride ? `${seoOverride.title} | Дайбилет` : expansionMeta?.title || title }
        : title,
      description,
      ...(urlPolicy.noindex
        ? { robots: { index: false, follow: true } }
        : {}),
      alternates: {
        canonical: path,
      },
      ...buildShareMetadata({
        title: shareTitle,
        description,
        path,
        image: await resolveSsrOgImage(stableRoute?.heroImageUrl || linkedEventPage?.heroImageUrl || event.imageUrl),
      }),
    };
  } catch (error) {
    if (isNextControlFlowError(error)) throw error;
    console.warn(
      `[event-metadata] fallback for ${decodedSlug}:`,
      error instanceof Error ? error.message : error,
    );
    return { title: pageTitle('Событие') };
  }
}

export default async function EventDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const decodedSlug = decodeEventParamSlug(slug);
  const loaded = await loadEventDto(decodedSlug);
  if (loaded.kind === 'miss') safeNotFound();
  if (loaded.kind === 'unavailable') {
    return <EventUnavailablePage slug={decodedSlug} />;
  }

  const payload = loaded.payload;
  const { event, related } = payload;
  // Alias slugs stay on this ISR page. NEXT_REDIRECT during static gen becomes HTTP 500.
  // Cyrillic URLs 308 in middleware; metadata canonical covers SEO.
  const clientPayload = toEventPageClientPayload(payload);
  let aggregate = null;
  try {
    aggregate = await getCachedEventAggregateRating(event.id);
  } catch {
    aggregate = null;
  }
  let jsonLdBlocks: Array<Record<string, unknown>> = [];
  try {
    jsonLdBlocks = payload.availability === 'ENDED' || payload.availability === 'NO_UPCOMING'
      ? []
      : buildEventPageJsonLd(payload, { aggregateRating: aggregate });
  } catch (error) {
    console.warn(
      `[event-jsonld] skip for ${decodedSlug}:`,
      error instanceof Error ? error.message : error,
    );
  }

  return (
    <>
      {/* Outside SiteLayout client boundary so crawlers see scripts in View Source */}
      <JsonLdScripts blocks={jsonLdBlocks} idPrefix="event-jsonld" />
      <SiteLayout>
        <EventHero payload={clientPayload} aggregate={aggregate} peers={payload.peerEvents} />
        <ExpiredEventSessionNotice context={clientPayload.requestedSessionContext} />
        <EventPageScheduleNotice
          availability={payload.availability || payload.eventPageRoute?.availability}
          city={event.city || ''}
          citySlug={event.citySlug || ''}
        />

        <div className="container-page py-8 sm:py-10 lg:py-14">
          <div className="grid min-w-0 gap-8 lg:grid-cols-3 lg:gap-12">
            <div className="min-w-0 space-y-6 lg:col-span-2">
              <EventPdpBody event={event} payload={clientPayload} />
              {payload.eventPage
                ? <VenuePdpContent document={{ variant: 'event', content: payload.eventPage.content }} showSummary={false} showSections={false} />
                : <VenuePdpContent document={payload.pdp} />}
              <EventTags event={event} />
              <EventTrustStrip />
            </div>

            <div className="min-w-0 lg:col-span-1">
              <div className="min-w-0 lg:sticky lg:top-[calc(var(--site-header-height)+1.25rem)]" id="buy-card">
                <EventBuyCard payload={clientPayload} />
              </div>
            </div>
          </div>
        </div>

        {related?.length ? (
          <section className="border-t border-slate-200/80 bg-surface-muted section-y">
            <div className="container-page">
              <h2 className="text-2xl font-bold text-graphite">Похожие события</h2>
              <ul className="event-related-grid mt-8">
                {related.slice(0, 6).map((session) => (
                  <li key={`${session.id}-${session.startsAt}`}>
                    <EventCard session={session} suppressPurchaseAnchors />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}
      </SiteLayout>
    </>
  );
}
