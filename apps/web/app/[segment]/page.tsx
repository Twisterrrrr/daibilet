import type { Metadata } from 'next';
import { buildLandingMetadata, LandingRoutePage } from '@/server/landing-route-page';
import { listIndexableLandingSegments } from '@/lib/sitemap-data';
import { isCityFirstLegacyRouteSlug } from '@/lib/city-first-route-slugs';
import { cityLookupSlug, isCityFirstUrlMode } from '@/lib/routes';
import CityPage, { generateMetadata as generateCityMetadata } from '../cities/[slug]/page';

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ segment: string }>;
};

export async function generateStaticParams() {
  const segments = await listIndexableLandingSegments();
  return segments
    .filter((seg): seg is { segment: string } => !seg.segment2)
    .map(({ segment }) => ({ segment }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { segment } = await params;
  if (isCityFirstUrlMode() && isCityFirstLegacyRouteSlug(segment)) {
    return generateCityMetadata({ params: Promise.resolve({ slug: cityLookupSlug(segment) }) });
  }
  return buildLandingMetadata(`/${segment}`);
}

/**
 * Do not await searchParams - genre/tag filters are client-side.
 * Awaiting searchParams forces Cache-Control: private, no-store and kills ISR.
 */
export default async function LandingSegmentPage({ params }: PageProps) {
  const { segment } = await params;
  if (isCityFirstUrlMode() && isCityFirstLegacyRouteSlug(segment)) {
    return CityPage({ params: Promise.resolve({ slug: cityLookupSlug(segment) }) });
  }
  return LandingRoutePage({ pathname: `/${segment}` });
}
