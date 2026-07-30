import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { EventCard } from '@/components/EventCard';
import { EventBuyCard, EventHero } from '@/components/EventPage.client';
import { EventDescription, EventQuickInfo, EventTags, EventTrustStrip } from '@/components/EventPageSections';
import { ReviewSection } from '@/components/ReviewSection';
import { JsonLdScripts } from '@/components/JsonLdScripts';
import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import { toEventPageClientPayload } from '@/lib/event-page-client-props';
import { eventHref } from '@/lib/routes';
import { getTicketPriceRange } from '@/lib/event-page-utils';
import { pageTitle, buildShareMetadata } from '@/lib/seo-meta';
import { buildEventListingMeta, buildEventPageMetaTitle } from '@/lib/seo-event-meta';
import { buildEventPageJsonLd } from '@/lib/structured-data';
import { pickRepresentativeSession } from '@/lib/event-purchase';
import {
  getCachedEventAggregateRating,
  getCachedPublicEventDto,
} from '@/server/cached-event-data';
import { listTopEventSlugsForSsg } from '@/server/top-event-slugs';

export const revalidate = 300;
/** Allow on-demand ISR for slugs not prebuilt. */
export const dynamicParams = true;

type PageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * Prebuild top-N popular/upcoming events (MSK 8Gi). Rest fill via ISR on first hit.
 * Cap: EVENT_SSG_TOP_N (default 200, max 500).
 */
export async function generateStaticParams() {
  const slugs = await listTopEventSlugsForSsg();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const payload = await getCachedPublicEventDto(slug);
  if (!payload?.event) return { title: pageTitle('Событие не найдено') };

  const event = payload.event;
  const path = event.canonicalPath || eventHref(event);
  const priceRange = getTicketPriceRange(payload);
  const expansionMeta = buildEventListingMeta({
    eventTitle: event.title,
    cityName: event.city,
    citySlug: event.citySlug,
    sourceCitySlug: event.sourceCitySlug,
    priceFrom: priceRange?.min ?? event.priceFrom ?? payload.stats?.priceFrom,
  });
  const nextSession = pickRepresentativeSession(payload.sessions ?? []);
  const disambiguatedTitle = buildEventPageMetaTitle({
    eventTitle: event.title,
    seoTitle: event.seoTitle,
    cityName: event.city,
    venueName: event.venue,
    dateLabel: nextSession?.dateLabel,
    timeLabel: nextSession?.timeLabel,
  });
  const title = pageTitle(expansionMeta?.title || disambiguatedTitle);
  const shareTitle = expansionMeta
    ? expansionMeta.title
    : `${title} | Дайбилет`;
  const description =
    expansionMeta?.description ||
    event.seoDescription ||
    event.description ||
    `${event.title} - билеты на Дайбилет`;

  return {
    title: expansionMeta ? { absolute: expansionMeta.title } : title,
    description,
    alternates: {
      canonical: path,
    },
    ...buildShareMetadata({
      title: shareTitle,
      description,
      path,
      image: event.imageUrl,
    }),
  };
}

export default async function EventDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const payload = await getCachedPublicEventDto(slug);
  if (!payload?.event) notFound();

  const { event, related } = payload;
  const clientPayload = toEventPageClientPayload(payload);
  const aggregate = await getCachedEventAggregateRating(event.id);
  const jsonLdBlocks = buildEventPageJsonLd(payload, { aggregateRating: aggregate });

  return (
    <>
      {/* Outside SiteLayout client boundary so crawlers see scripts in View Source */}
      <JsonLdScripts blocks={jsonLdBlocks} idPrefix="event-jsonld" />
      <SiteLayout>
        <EventHero payload={clientPayload} />

        <div className="container-page py-10 sm:py-12 lg:py-14">
          <div className="grid gap-10 lg:grid-cols-3 lg:gap-12">
            <div className="space-y-10 lg:col-span-2">
              <EventDescription event={event} />
              <EventQuickInfo event={event} />
              <EventTags event={event} />
              <EventTrustStrip />
              <ReviewSection eventId={event.id} eventSlug={event.slug} />
            </div>

            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-[calc(var(--site-header-height)+1.25rem)]" id="buy-card">
                <EventBuyCard payload={clientPayload} />
              </div>
            </div>
          </div>
        </div>

        {related?.length ? (
          <section className="border-t border-slate-200/80 bg-surface-muted section-y">
            <div className="container-page">
              <h2 className="text-2xl font-bold text-graphite">Похожие события</h2>
              <ul className="mt-8 grid gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
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
