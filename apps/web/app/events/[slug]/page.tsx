import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';

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
import { safeNotFound } from '@/lib/safe-not-found';
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
    const path = event.canonicalPath || eventHref(event);
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
  // Soft-404 recovery (STAND_BY TC → live TEP twin etc.): land on canonical slug.
  const canonicalPath = String(event.canonicalPath || '').trim();
  const canonicalSlug = String(event.slug || '').trim();
  if (
    canonicalSlug &&
    canonicalSlug !== decodedSlug &&
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
  let jsonLdBlocks: Array<Record<string, unknown>> = [];
  try {
    jsonLdBlocks = buildEventPageJsonLd(payload, { aggregateRating: aggregate });
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
