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
import { buildEventListingMeta } from '@/lib/seo-event-meta';
import { buildEventPageJsonLd } from '@/lib/structured-data';
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
  const title = pageTitle(expansionMeta?.title || event.seoTitle || event.title);
  const shareTitle = expansionMeta
    ? expansionMeta.title
    : event.seoTitle?.includes('Дайбилет')
      ? String(event.seoTitle)
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

      <div className="container-page py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <EventDescription event={event} />
            <EventQuickInfo event={event} />
            <EventTags event={event} />
            <EventTrustStrip />
            <ReviewSection eventId={event.id} eventSlug={event.slug} />
          </div>

          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-20" id="buy-card">
              <EventBuyCard payload={clientPayload} />
            </div>
          </div>
        </div>
      </div>

      {related?.length ? (
        <section className="border-t border-slate-200 bg-slate-50 py-12">
          <div className="container-page">
            <h2 className="text-2xl font-bold text-slate-900">Похожие события</h2>
            <ul className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
