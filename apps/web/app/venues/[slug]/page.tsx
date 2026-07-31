import type { Metadata } from 'next';

import { VenueDetailPage, generateVenueDetailMetadata } from '@/components/VenuePages';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return generateVenueDetailMetadata(slug);
}

export const revalidate = 300;
/** On-demand ISR via unstable_cache (getCachedPublicVenueDto); no prebuild (MSK memory-safe). */
export const dynamicParams = true;

/** Empty at build (MSK memory-safe). First hit fills ISR Data Cache. */
export function generateStaticParams() {
  return [];
}

export default async function VenuePage({ params }: PageProps) {
  const { slug } = await params;
  return VenueDetailPage({ slug });
}
