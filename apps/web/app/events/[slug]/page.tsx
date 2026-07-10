import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { EventCard } from '@/components/EventCard';
import { EventBuyCard, EventHero } from '@/components/EventPage.client';
import { EventDescription, EventQuickInfo, EventTags } from '@/components/EventPageSections';
import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import { eventHref } from '@/lib/routes';
import { buildPublicEventDto } from '@daibilet/backend/public-read';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const payload = await buildPublicEventDto(decodeURIComponent(slug));
  if (!payload?.event) return { title: 'Событие не найдено | Дайбилет' };

  const event = payload.event;
  return {
    title: event.seoTitle || `${event.title} | Дайбилет`,
    description: event.seoDescription || event.description || `${event.title} — билеты на Дайбилет`,
    alternates: {
      canonical: event.canonicalPath || eventHref(event),
    },
    openGraph: {
      title: event.seoTitle || event.title,
      description: event.seoDescription || event.description || undefined,
      images: event.imageUrl ? [{ url: event.imageUrl }] : undefined,
    },
  };
}

export default async function EventDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const payload = await buildPublicEventDto(decodeURIComponent(slug));
  if (!payload?.event) notFound();

  const { event, related } = payload;

  return (
    <SiteLayout>
      <EventHero payload={payload} />

      <div className="container-page py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <EventDescription event={event} />
            <EventQuickInfo event={event} />
            <EventTags event={event} />
            <div className="lg:hidden" id="buy-card">
              <EventBuyCard payload={payload} />
            </div>
          </div>

          <div className="hidden lg:col-span-1 lg:block">
            <div className="sticky top-20" id="buy-card-desktop">
              <EventBuyCard payload={payload} />
            </div>
          </div>
        </div>
      </div>

      {related.length ? (
        <section className="border-t border-slate-200 bg-slate-50 py-12">
          <div className="container-page">
            <h2 className="text-2xl font-bold text-slate-900">Похожие события</h2>
            <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {related.slice(0, 6).map((session) => (
                <li key={`${session.id}-${session.startsAt}`}>
                  <EventCard session={session} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </SiteLayout>
  );
}
