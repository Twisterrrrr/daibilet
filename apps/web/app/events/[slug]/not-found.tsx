import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteLayout } from '@/components/SiteLayout';
import { EventCard } from '@/components/EventCard';
import { fetchPublicApiJson } from '@/server/public-api-client';
import type { PublicCatalogListItemDto } from '@daibilet/contracts/public';
import { resolveSimilarEvents } from '@/lib/event-not-found-similar';
import { pageTitle } from '@/lib/seo-meta';

/** Not-found page is always dynamic: event slugs are not preknown at build time. */
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: pageTitle('Событие не найдено'),
    robots: { index: false, follow: true },
  };
}

/** Load a few upcoming events from the public catalog to show as alternatives. */
async function loadSimilarEvents(): Promise<PublicCatalogListItemDto[]> {
  try {
    const payload = await fetchPublicApiJson<
      | { items?: PublicCatalogListItemDto[]; sessions?: PublicCatalogListItemDto[] }
      | null
    >(
      '/api/public/events',
      {
        searchParams: { limit: '6' },
        notFoundAsNull: true,
      },
    );
    return resolveSimilarEvents(payload);
  } catch {
    return [];
  }
}

export default async function EventNotFoundPage() {
  const similar = await loadSimilarEvents();

  return (
    <SiteLayout>
      <main className="container-page py-16">
        <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
          К сожалению, событие больше не доступно
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Это событие прошло или было удалено из афиши. Вы можете посмотреть другие события:
        </p>

        <div className="mt-8">
          <Link
            href="/events"
            className="inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            Вся афиша
          </Link>
        </div>

        {similar.length > 0 && (
          <section className="mt-12 border-t border-slate-200/80 pt-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Похожие события</h2>
            <ul className="event-related-grid">
              {similar.map((session) => (
                <li key={session.id}>
                  <EventCard session={session} suppressPurchaseAnchors />
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </SiteLayout>
  );
}
