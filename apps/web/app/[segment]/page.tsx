import type { Metadata } from 'next';

import { buildLandingMetadata, LandingRoutePage } from '@/server/landing-route-page';
import { listLandingStaticParamsOne } from '@/lib/landing-routes';

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ segment: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateStaticParams() {
  return listLandingStaticParamsOne();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { segment } = await params;
  return buildLandingMetadata(`/${segment}`);
}

export default async function LandingSegmentPage({ params, searchParams }: PageProps) {
  const { segment } = await params;
  const query = await searchParams;
  return LandingRoutePage({ pathname: `/${segment}`, searchParams: query });
}
