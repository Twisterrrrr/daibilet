import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

import { EventCard } from '@/components/EventCard';
import { EventBuyCard, EventHero } from '@/components/EventPage.client';
import { EventPdpBody } from '@/components/EventPdpBody.client';
import { EventTags, EventTrustStrip } from '@/components/EventPageSections';
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
import { isTimeoutError } from '@/server/public-api-client';
import { listTopEventSlugsForSsg } from '@/server/top-event-slugs';

/** ISR: regenerate HTML in background at most every 2h (matches EVENT_PAGE_REVALIDATE). */
export const revalidate = 7200;
/** Allow on-demand ISR for slugs not prebuilt (TOP_N SSG; rest fill at runtime). */
export const dynamicParams = true;

type PageProps = {
  params: Promise<{ slug: string }>;
};

function isProductionBuildPhase(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

/**
 * Soft-fail SSG timeouts so one slow event does not abort `next build`.
 * Page may be recorded as not-found for this build; runtime + dynamicParams
 * + revalidate refill it on demand / next revalidation.
 */
function softFailSsgTimeout(slug: string, error: unknown): never {
  console.warn(
    `[SSG Warning] Soft timeout on /events/${slug} — postponing to runtime.`,
    error instanceof Error ? error.message : error,
  );
  notFound();
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
  try {
    const payload = await getCachedPublicEventDto(slug);
    if (!payload?.event) notFound();

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
    const shareTitle = expansionMeta ? expansionMeta.title : `${title} | Дайбилет`;
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
  } catch (error) {
    if (isProductionBuildPhase() && isTimeoutError(error)) {
      console.warn(`[SSG Warning] Soft timeout in metadata /events/${slug}`);
      return { title: pageTitle('Событие') };
    }
    throw error;
  }
}

export default async function EventDetailPage({ params }: PageProps) {
  const { slug } = await params;
  let payload;
  try {
    payload = await getCachedPublicEventDto(slug);
  } catch (error) {
    if (isProductionBuildPhase() && isTimeoutError(error)) {
      softFailSsgTimeout(slug, error);
    }
    throw error;
  }
  if (!payload?.event) notFound();

  const { event, related } = payload;
  // Soft-404 recovery (STAND_BY TC → live TEP twin etc.): land on canonical slug.
  const canonicalPath = String(event.canonicalPath || '').trim();
  const canonicalSlug = String(event.slug || '').trim();
  if (
    canonicalSlug &&
    canonicalSlug !== slug &&
    canonicalPath.startsWith('/events/')
  ) {
    permanentRedirect(canonicalPath);
  }
  const clientPayload = toEventPageClientPayload(payload);
  let aggregate = null;
  try {
    aggregate = await getCachedEventAggregateRating(event.id);
  } catch {
    aggregate = null;
  }
  const jsonLdBlocks = buildEventPageJsonLd(payload, { aggregateRating: aggregate });

  return (
    <>
      {/* Outside SiteLayout client boundary so crawlers see scripts in View Source */}
      <JsonLdScripts blocks={jsonLdBlocks} idPrefix="event-jsonld" />
      <SiteLayout>
        <EventHero payload={clientPayload} aggregate={aggregate} />

        <div className="container-page py-8 sm:py-10 lg:py-14">
          <div className="grid min-w-0 gap-8 lg:grid-cols-3 lg:gap-12">
            <div className="min-w-0 space-y-6 lg:col-span-2">
              <EventPdpBody event={event} payload={clientPayload} />
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
