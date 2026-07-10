import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

import { CityCard } from '@/components/CityCard';
import { EventCard } from '@/components/EventCard';
import { HomeHeroSearch } from '@/components/HomeHeroSearch.client';
import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import { buildPublicCatalogDto, buildPublicDestinationsDto } from '@daibilet/backend/public-read';
import { formatNumber, pluralEvents } from '@/lib/format';
import { HOME_FORMAT_TILES, HOME_TRUST_ITEMS } from '@/lib/home-scenarios';

export const metadata: Metadata = {
  title: 'Дайбилет — экскурсии, музеи и билеты',
  description: 'Афиша событий, экскурсий и мероприятий в городах России. Билеты онлайн.',
};

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [destinationsPayload, catalog] = await Promise.all([
    buildPublicDestinationsDto(),
    buildPublicCatalogDto({ limit: 8, sort: 'popular' }),
  ]);

  const topCities = destinationsPayload.destinations
    .filter((item) => item.type === 'city')
    .sort((a, b) => b.events - a.events)
    .slice(0, 8);

  const totalEvents = destinationsPayload.destinations.reduce((sum, item) => sum + item.events, 0);

  return (
    <SiteLayout>
      <section className="gradient-salute-hero text-white">
        <div className="container-page py-14 sm:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
            Афиша событий России
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Экскурсии, музеи и мероприятия в городах России
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/85">
            {formatNumber(totalEvents)} событий с ближайшими датами, ценами и билетами онлайн.
          </p>
          <HomeHeroSearch />
        </div>
      </section>

      {catalog.items.length ? (
        <section className="container-page py-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Популярное сейчас</h2>
              <p className="mt-1 text-sm text-slate-500">События, которые выбирают чаще всего</p>
            </div>
            <Link href="/events?sort=popular" className="hidden items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700 sm:inline-flex">
              Весь каталог
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {catalog.items.map((session) => (
              <li key={`${session.id}-${session.startsAt}`}>
                <EventCard session={session} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {topCities.length ? (
        <section className="bg-slate-50 py-12">
          <div className="container-page">
            <h2 className="text-2xl font-bold text-slate-900">Популярные города</h2>
            <p className="mt-1 text-sm text-slate-500">Выберите город и смотрите афишу</p>
            <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {topCities.map((city) => (
                <li key={city.slug || city.name}>
                  <CityCard city={city} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="container-page py-12">
        <h2 className="text-2xl font-bold text-slate-900">Выберите формат отдыха</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HOME_FORMAT_TILES.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${tile.gradient} p-6 text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg`}
            >
              <h3 className="text-lg font-bold">{tile.title}</h3>
              <p className="mt-1 text-sm text-white/80">{tile.subtitle}</p>
              <ArrowRight className="mt-4 h-5 w-5 transition group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white py-10">
        <div className="container-page">
          <ul className="grid gap-4 sm:grid-cols-3">
            {HOME_TRUST_ITEMS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-slate-600">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-slate-500">
            {topCities.length ? `${topCities.length}+ городов · ${pluralEvents(totalEvents)}` : null}
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
