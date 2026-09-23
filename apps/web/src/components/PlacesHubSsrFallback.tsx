import Link from 'next/link';

import { VenueCatalogPageSkeleton } from '@/components/VenueCatalogSkeletons';
import type { VenueCatalogFeedPage } from '@/lib/venue-catalog-feed';
import { venueHref } from '@/lib/routes';

/** Search-param controls may client-render; keep the first venue page crawlable. */
export function PlacesHubSsrFallback({ page }: { page: VenueCatalogFeedPage }) {
  if (!page.venues.length) return <VenueCatalogPageSkeleton family="institution" />;

  return (
    <main className="container-page py-8" data-ssr-places-catalog>
      <h1 className="font-display text-3xl font-bold text-slate-950">Места</h1>
      <p className="mt-2 text-sm text-slate-600">Площадки и локации с событиями и маршрутами</p>
      <ul className="catalog-card-grid mt-8">
        {page.venues.map((venue) => (
          <li key={venue.id} className="min-w-0">
            <Link
              href={venueHref(venue)}
              className="block h-full rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300"
            >
              <h2 className="font-semibold text-slate-950">{venue.name}</h2>
              {venue.city ? <p className="mt-2 text-sm text-slate-600">{venue.city}</p> : null}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
