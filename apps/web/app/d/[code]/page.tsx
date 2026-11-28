import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { DayRouteSharePublicView } from '@/components/DayRouteSharePublicView';
import { cityToNominative, poCityDative } from '@/lib/city-declension';
import { pluralPoints } from '@/lib/format';
import { buildShareMetadata, canonicalHref, pageTitle } from '@/lib/seo-meta';
import { getDayRouteSharePublic, isValidDayRouteShareCode } from '@/server/day-route-share';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type PageParams = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ go?: string }>;
};

async function loadShare(rawCode: string, bumpHit = false) {
  const code = decodeURIComponent(rawCode || '').trim().toLowerCase();
  if (!isValidDayRouteShareCode(code)) return null;
  return getDayRouteSharePublic(code, { bumpHit });
}

function shareCopy(share: NonNullable<Awaited<ReturnType<typeof loadShare>>>) {
  const cityLabel = share.citySlug ? cityToNominative(share.citySlug) : null;
  const title =
    share.title ||
    (cityLabel
      ? `Маршрут ${poCityDative(cityLabel)}: ${pluralPoints(share.stops.length)}`
      : `Маршрут на день: ${pluralPoints(share.stops.length)}`);
  const stopBits = share.stops.slice(0, 4).map((stop) => stop.title).filter(Boolean);
  const description = stopBits.length
    ? `${title}. В маршруте: ${stopBits.join(', ')}.`
    : `${title}. Готовый план дня на Дайбилет.`;
  return { cityLabel, title, description };
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { code } = await params;
  const share = await loadShare(code, false);
  if (!share) {
    return { title: pageTitle('Маршрут не найден'), robots: { index: false, follow: false } };
  }

  const copy = shareCopy(share);
  const path = `/d/${share.code}`;
  return {
    title: pageTitle(copy.title),
    description: copy.description,
    robots: { index: false, follow: false },
    alternates: { canonical: canonicalHref(path) },
    ...buildShareMetadata({
      title: `${copy.title} | Дайбилет`,
      description: copy.description,
      path,
    }),
  };
}

/** Legacy short URL with its own share preview; `?go=1` opens the editor directly. */
export default async function LegacyDayRouteSharePage({ params, searchParams }: PageParams) {
  const { code } = await params;
  const query = await searchParams;
  const share = await loadShare(code, true);
  if (!share) notFound();
  if (String(query.go || '') === '1') redirect(share.longPath);

  const copy = shareCopy(share);
  return (
    <DayRouteSharePublicView
      share={share}
      heading={copy.title}
      cityLabel={copy.cityLabel}
    />
  );
}
