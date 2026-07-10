import type { Metadata } from 'next';

import { buildLandingMetadata, LandingRoutePage } from '@/server/landing-route-page';

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ segment: string; segment2: string; segment3: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { segment, segment2, segment3 } = await params;
  return buildLandingMetadata(`/${segment}/${segment2}/${segment3}`);
}

export default async function LandingThreeSegmentPage({ params, searchParams }: PageProps) {
  const { segment, segment2, segment3 } = await params;
  const query = await searchParams;
  return LandingRoutePage({
    pathname: `/${segment}/${segment2}/${segment3}`,
    searchParams: query,
  });
}
