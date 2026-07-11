import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import { pluralEvents } from '@/lib/format';
import { cityHref } from '@/lib/routes';
import { buildPublicDestinationsDto } from '@daibilet/backend/public-read';

export const metadata: Metadata = {
  title: 'Города | Дайбилет',
  description: 'Афиша событий и экскурсий по городам России.',
};

export const revalidate = 300;

export default async function CitiesIndexPage() {
  const destinations = await buildPublicDestinationsDto();
  const cities = destinations.destinations
    .filter((item) => item.type === 'city')
    .sort((a, b) => b.events - a.events || a.name.localeCompare(b.name, 'ru'));

  return (
    <SiteLayout>
      <div className="container-page py-8">
        <h1 className="text-3xl font-extrabold text-slate-900">Города</h1>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map((city) => (
            <li key={city.slug || city.name}>
              <Link href={cityHref(city)} className="card-link block p-4">
                <h2 className="text-lg font-semibold text-slate-900">{city.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{pluralEvents(city.events)}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </SiteLayout>
  );
}
