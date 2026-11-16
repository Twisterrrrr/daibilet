import type { Metadata } from 'next';
import { buildLandingMetadata, LandingRoutePage } from '@/server/landing-route-page';
import { listLandingStaticParamsOne } from '@/lib/landing-routes';
import { isCityFirstLegacyRouteSlug } from '@/lib/city-first-route-slugs';
import { cityLookupSlug, isCityFirstUrlMode } from '@/lib/routes';
import CityPage, { generateMetadata as generateCityMetadata } from '../cities/[slug]/page';

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ segment: string }>;
};

export async function generateStaticParams() {
  return listLandingStaticParamsOne();
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
