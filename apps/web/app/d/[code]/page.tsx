import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { isValidDayRouteShareCode, resolveDayRouteShare } from '@/server/day-route-share';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  return {
    title: 'Мой день - Дайбилет',
    robots: { index: false, follow: false },
    alternates: { canonical: `/d/${encodeURIComponent(code)}` },
  };
}

/**
 * Short viral share: `/d/{code}` → 307 `/my-day?city=&items=…`
 * Long query URL remains the hydrate target for DayRoutePanel.
 */
export default async function DayRouteShortLinkPage({ params }: PageProps) {
  const { code: raw } = await params;
  const code = String(raw || '')
    .trim()
    .toLowerCase();
  if (!isValidDayRouteShareCode(code)) notFound();

  const longPath = await resolveDayRouteShare(code);
  if (!longPath) notFound();

  redirect(longPath);
}
