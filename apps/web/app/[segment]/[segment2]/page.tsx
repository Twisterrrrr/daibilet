import type { Metadata } from 'next';

import { buildLandingMetadata, LandingRoutePage } from '@/server/landing-route-page';
import { listIndexableLandingSegments } from '@/lib/sitemap-data';

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ segment: string; segment2: string }>;
};

export async function generateStaticParams() {
  const segments = await listIndexableLandingSegments();
  return segments
    .filter((seg): seg is { segment: string; segment2: string } => Boolean(seg.segment2))
    .map(({ segment, segment2 }) => ({ segment, segment2 }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { segment, segment2 } = await params;
  return buildLandingMetadata(`/${segment}/${segment2}`);
}

/**
 * Do not await searchParams - genre/tag filters are client-side.
 * Awaiting searchParams forces Cache-Control: private, no-store and kills ISR.
 */
export default async function LandingTwoSegmentPage({ params }: PageProps) {
  const { segment, segment2 } = await params;
  return LandingRoutePage({ pathname: `/${segment}/${segment2}` });
}
