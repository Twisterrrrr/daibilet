import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { EventCard } from '@/components/EventCard';
import { EventBuyCard, EventHero } from '@/components/EventPage.client';
import { EventDescription, EventQuickInfo, EventTags, EventTrustStrip } from '@/components/EventPageSections';
import { ReviewSection } from '@/components/ReviewSection';
import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import { toEventPageClientPayload } from '@/lib/event-page-client-props';
import { eventHref } from '@/lib/routes';
import { getTicketPriceRange } from '@/lib/event-page-utils';
import { pageTitle, buildShareMetadata } from '@/lib/seo-meta';
import { buildEventListingMeta, buildEventPageMetaTitle } from '@/lib/seo-event-meta';
import { buildEventPageJsonLd } from '@/lib/structured-data';
import { pickRepresentativeSession } from '@/lib/event-purchase';
import { buildPublicEventDto } from '@daibilet/backend/public-read';
import { prisma } from '@/lib/db';
import { shouldEmitAggregateRating } from '@/lib/review-rating';

export const revalidate = 300;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const payload = await buildPublicEventDto(decodeURIComponent(slug));
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
  const payload = await buildPublicEventDto(decodeURIComponent(slug));
  if (!payload?.event) notFound();

  const { event, related } = payload;
  const clientPayload = toEventPageClientPayload(payload);

  let aggregate: { ratingValue: number; reviewCount: number } | null = null;
  try {
    const approved = await prisma.review.findMany({
      where: { eventId: event.id, status: 'APPROVED' },
      select: { rating: true },
    });
    const reviewCount = approved.length;
    const avgRating =
      reviewCount > 0
        ? Math.round((approved.reduce((sum, row) => sum + row.rating, 0) / reviewCount) * 10) / 10
        : 0;
    if (shouldEmitAggregateRating(reviewCount, avgRating)) {
      aggregate = { ratingValue: avgRating, reviewCount };
    }
  } catch {
    // Migration not applied yet / DB unavailable — keep Event JSON-LD without AggregateRating.
  }

  const jsonLdBlocks = buildEventPageJsonLd(payload, { aggregateRating: aggregate });

  return (
    <SiteLayout>
      {jsonLdBlocks.map((block, index) => (
        <script
          key={`event-jsonld-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
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
  );
}
