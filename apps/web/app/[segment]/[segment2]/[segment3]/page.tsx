import type { Metadata } from 'next';

import { buildLandingMetadata, LandingRoutePage } from '@/server/landing-route-page';

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ segment: string; segment2: string; segment3: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { segment, segment2, segment3 } = await params;
  return buildLandingMetadata(`/${segment}/${segment2}/${segment3}`);
}

/**
 * Do not await searchParams - genre/tag filters are client-side.
 * Awaiting searchParams forces Cache-Control: private, no-store and kills ISR.
 */
export default async function LandingThreeSegmentPage({ params }: PageProps) {
  const { segment, segment2, segment3 } = await params;
  return LandingRoutePage({
    pathname: `/${segment}/${segment2}/${segment3}`,
  });
}
