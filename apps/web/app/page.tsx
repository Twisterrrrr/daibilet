import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import { buildPublicDestinationsDto } from '@daibilet/backend/public-read';
import { cityHref } from '@/lib/routes';
import { pluralEvents } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Дайбилет — экскурсии, музеи и билеты',
  description: 'Афиша событий, экскурсий и мероприятий в городах России. Билеты онлайн.',
};

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const destinations = await buildPublicDestinationsDto();
  const topCities = destinations.destinations
    .filter((item) => item.type === 'city')
    .sort((a, b) => b.events - a.events)
    .slice(0, 8);

  return (
    <SiteLayout>
      <section className="bg-slate-900 py-16 text-white">
        <div className="container-page">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Экскурсии, музеи и мероприятия в городах России
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/85">
            Афиша событий с ближайшими датами, ценами и билетами онлайн.
          </p>
          <Link
            href="/events"
            className="mt-8 inline-flex rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"
          >
            Открыть каталог
          </Link>
        </div>
      </section>

      {topCities.length ? (
        <section className="container-page py-12">
          <h2 className="text-2xl font-bold text-slate-900">Популярные города</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {topCities.map((city) => (
              <li key={city.slug || city.name}>
                <Link href={cityHref(city)} className="card-link p-4">
                  <h3 className="font-semibold text-slate-900">{city.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{pluralEvents(city.events)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </SiteLayout>
  );
}
