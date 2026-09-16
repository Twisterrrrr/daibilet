import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { DayRouteSharePublicView } from '@/components/DayRouteSharePublicView';
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

  return <DayRouteSharePublicView share={share} heading={heading} cityLabel={cityLabel} />;
}
