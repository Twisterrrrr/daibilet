import type { Metadata } from 'next';

import { buildLandingMetadata, LandingRoutePage } from '@/server/landing-route-page';
import { listLandingStaticParamsTwo } from '@/lib/landing-routes';

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ segment: string; segment2: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateStaticParams() {
  return listLandingStaticParamsTwo();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { segment, segment2 } = await params;
  return buildLandingMetadata(`/${segment}/${segment2}`);
}

export default async function LandingTwoSegmentPage({ params, searchParams }: PageProps) {
  const { segment, segment2 } = await params;
  const query = await searchParams;
  return LandingRoutePage({ pathname: `/${segment}/${segment2}`, searchParams: query });
}
