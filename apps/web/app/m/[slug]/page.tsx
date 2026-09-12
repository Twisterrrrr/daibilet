import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { DayRouteSharePublicActions } from '@/components/DayRouteSharePublicActions.client';
import { SiteLayout } from '@/components/SiteLayout';
import { cityToNominative } from '@/lib/city-declension';
import { buildShareMetadata, pageTitle } from '@/lib/seo-meta';
import {
  getDayRouteSharePublic,
  parseDayRouteReadableSlug,
} from '@/server/day-route-share';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type PageParams = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ go?: string }>;
};

async function loadShare(slug: string, bumpHit = false) {
  const parsed = parseDayRouteReadableSlug(slug);
  if (!parsed) return null;
  return getDayRouteSharePublic(parsed.code, { bumpHit });
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug } = await params;
  const share = await loadShare(slug, false);
  if (!share) {
    return { title: pageTitle('Маршрут не найден'), robots: { index: false, follow: false } };
  }

  const cityLabel = share.citySlug ? cityToNominative(share.citySlug) : '';
  const title =
    share.title ||
    (cityLabel ? `Маршрут на день - ${cityLabel}` : 'Маршрут на день');
  const stopBits = share.stops
    .slice(0, 4)
    .map((s) => s.title)
    .filter(Boolean);
  const description =
    stopBits.length > 0
      ? `${title}: ${stopBits.join(', ')}. Откройте в «Мой день» на Дайбилет.`
      : `${title}. Откройте в «Мой день» на Дайбилет.`;

  const indexable = share.status === 'PUBLISHED';
  return {
    title: pageTitle(title),
    description,
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    alternates: { canonical: share.shortPath },
    ...buildShareMetadata({
      title: `${title} | Дайбилет`,
      description,
      path: share.shortPath,
    }),
  };
}

/**
 * Public readable share page `/m/{city}-{titleSlug}-{code}`.
 * `?go=1` keeps thin redirect into `/my-day?…` for messengers that want instant open.
 */
export default async function DayRouteSharePublicPage({ params, searchParams }: PageParams) {
  const { slug } = await params;
  const query = await searchParams;
  const share = await loadShare(slug, true);
  if (!share) notFound();

  if (String(query.go || '') === '1') {
    redirect(share.longPath);
  }

  const cityLabel = share.citySlug ? cityToNominative(share.citySlug) : null;
  const heading =
    share.title ||
    (cityLabel ? `Маршрут на день - ${cityLabel}` : 'Маршрут на день');

  return (
    <SiteLayout footerVariant="compact">
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-700">Мой день</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          {heading}
        </h1>
        {cityLabel ? (
          <p className="mt-2 text-base text-slate-600">{cityLabel}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
          <span>{share.stops.length} точек</span>
          <span>·</span>
          <span>{share.hitCount} просмотров</span>
          <span>·</span>
          <span>{share.saveCount} сохранений</span>
          {share.averageRating != null ? (
            <>
              <span>·</span>
              <span>★ {share.averageRating.toFixed(1)}</span>
            </>
          ) : null}
        </div>

        {share.authorName ? (
          <p className="mt-3 text-sm text-slate-600">Автор: {share.authorName}</p>
        ) : null}

        <ol className="mt-8 space-y-3">
          {share.stops.map((stop) => (
            <li
              key={`${stop.index}-${stop.title}`}
              className="flex gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                {stop.index}
              </span>
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{stop.title}</p>
                {stop.timeLabel ? (
                  <p className="mt-0.5 text-sm text-slate-500">{stop.timeLabel}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>

        <DayRouteSharePublicActions
          code={share.code}
          citySlug={share.citySlug}
          longPath={share.longPath}
          stops={share.stops}
        />
      </main>
    </SiteLayout>
  );
}
