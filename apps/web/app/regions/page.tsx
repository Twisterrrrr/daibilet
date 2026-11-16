import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SiteLayout } from '@/components/SiteLayout';
import { cityHref, isCityFirstUrlMode } from '@/lib/routes';
import { INDEX_FOLLOW_ROBOTS, canonicalHref } from '@/lib/seo-meta';
import { getCachedDestinations } from '@/server/cached-public-surfaces';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  if (!isCityFirstUrlMode()) notFound();
  return {
    title: 'Регионы России: куда поехать и что посмотреть | Дайбилет',
    description: 'Регионы России: города, достопримечательности, экскурсии и события для поездки.',
    alternates: { canonical: canonicalHref('/regions') },
    robots: INDEX_FOLLOW_ROBOTS,
  };
}

export default async function RegionsIndexPage() {
  if (!isCityFirstUrlMode()) notFound();
  const payload = await getCachedDestinations().catch(() => ({ destinations: [] }));
  const regions = (payload.destinations || [])
    .filter((destination) => destination.type === 'region')
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

  return (
    <SiteLayout>
      <main className="container-page py-8 sm:py-12">
        <nav aria-label="Хлебные крошки" className="mb-5 text-sm text-slate-500">
          <Link href="/">Главная</Link> <span aria-hidden="true">›</span> Регионы
        </nav>
        <h1 className="font-display text-3xl font-bold text-slate-950 sm:text-4xl">Регионы России</h1>
        <p className="mt-3 max-w-2xl text-slate-600">Выберите регион, чтобы увидеть города, места и события для поездки.</p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {regions.map((region) => (
            <li key={region.id || region.slug || region.name}>
              <Link
                href={cityHref(region)}
                className="flex h-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-400"
              >
                <span className="font-semibold text-slate-900">{region.name}</span>
                <span className="shrink-0 text-sm text-slate-500">{region.events} событий</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </SiteLayout>
  );
}
