import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { EventCard } from '@/components/EventCard';
import { PurchaseWidget } from '@/components/PurchaseWidget.client';
import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import { formatPriceFrom } from '@/lib/format';
import { cityHref, eventHref, venueHref } from '@/lib/routes';
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

  const { event, sessions, related } = payload;

  return (
    <SiteLayout>
      <article className="container-page py-8">
        <nav className="text-sm text-slate-500">
          <Link href="/events" className="hover:text-primary">
            Каталог
          </Link>
          <span className="mx-2">/</span>
          <span>{event.title}</span>
        </nav>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            {event.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.imageUrl} alt="" className="aspect-[16/10] w-full rounded-2xl object-cover" />
            ) : null}
            <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900">
              {event.seoH1 || event.title}
            </h1>
            <p className="mt-3 text-sm text-slate-600">
              {event.city}
              {event.venue ? (
                <>
                  {' · '}
                  <Link href={venueHref({ id: event.venueId || event.venueSlug || event.venue, slug: event.venueSlug, name: event.venue, type: event.venueKind })} className="hover:text-primary">
                    {event.venue}
                  </Link>
                </>
              ) : null}
            </p>
            {event.description ? (
              <div className="prose prose-slate mt-6 max-w-none whitespace-pre-wrap text-base leading-7">
                {event.description}
              </div>
            ) : null}
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-2xl font-bold text-slate-900">{formatPriceFrom(event.priceFrom)}</p>
            <p className="mt-2 text-sm text-slate-600">{event.category}</p>
            <div className="mt-6">
              <PurchaseWidget event={event} sessions={sessions} />
            </div>
            {event.citySlug || event.city ? (
              <Link href={cityHref({ name: event.city, slug: event.citySlug, sourceSlug: event.sourceCitySlug })} className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
                Афиша {event.city}
              </Link>
            ) : null}
            {sessions.length ? (
              <div className="mt-6">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Ближайшие сеансы</h2>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {sessions.slice(0, 8).map((session) => (
                    <li key={session.id}>
                      {(session as { dateLabel?: string; timeLabel?: string; startsAt?: string | null }).dateLabel || session.startsAt || 'Дата уточняется'}
                      {(session as { timeLabel?: string }).timeLabel ? ` · ${(session as { timeLabel?: string }).timeLabel}` : ''}
                      {session.priceFrom ? ` · ${formatPriceFrom(session.priceFrom)}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>

        {related.length ? (
          <section className="mt-12">
            <h2 className="text-2xl font-bold text-slate-900">Похожие события</h2>
            <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {related.slice(0, 6).map((session) => (
                <li key={`${session.id}-${session.startsAt}`}>
                  <EventCard session={session} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </SiteLayout>
  );
}
