import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { EventCard } from '@/components/EventCard';
import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import { formatPriceFrom, pluralEvents } from '@/lib/format';
import { buildPublicCityDto } from '@daibilet/backend/public-read';
import { venueHref } from '@/lib/routes';

export const revalidate = 300;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const payload = await buildPublicCityDto(decodeURIComponent(slug));
  if (!payload?.city) return { title: 'Город не найден | Дайбилет' };
  const city = payload.city;
  return {
    title: city.seoTitle || `${city.name}: афиша и билеты | Дайбилет`,
    description: city.seoDescription || `События и экскурсии в городе ${city.name}`,
    alternates: { canonical: city.canonicalPath || `/cities/${city.slug}` },
  };
}

export default async function CityPage({ params }: PageProps) {
  const { slug } = await params;
  const payload = await buildPublicCityDto(decodeURIComponent(slug));
  if (!payload?.city) notFound();

  const { city, sessions, venues, stats } = payload;

  return (
    <SiteLayout>
      <div className="container-page py-8">
        <h1 className="text-3xl font-extrabold text-slate-900">{city.seoH1 || city.name}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {pluralEvents(stats.events)}
          {stats.priceFrom ? ` · ${formatPriceFrom(stats.priceFrom)}` : ''}
        </p>

        {venues.length ? (
          <section className="mt-10">
            <h2 className="text-xl font-bold text-slate-900">Площадки</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {venues.slice(0, 12).map((venue) => (
                <li key={venue.id}>
                  <Link href={venueHref(venue)} className="card-link block p-4">
                    <h3 className="font-semibold text-slate-900">{venue.title || venue.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{pluralEvents(venue.events)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section id="city-schedule" className="mt-10">
          <h2 className="text-xl font-bold text-slate-900">Афиша</h2>
          <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {sessions.slice(0, 100).map((session) => (
              <li key={`${session.id}-${session.startsAt}`}>
                <EventCard session={session} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </SiteLayout>
  );
}
