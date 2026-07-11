import type { Metadata } from 'next';

import { VenueDetailPage, generateVenueDetailMetadata } from '@/components/VenuePages';
import { PUBLIC_PAGE_REVALIDATE } from '@/server/cache-config';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return generateVenueDetailMetadata(slug);
}

export const revalidate = PUBLIC_PAGE_REVALIDATE;

export default async function LocationPage({ params }: PageProps) {
  const { slug } = await params;
  return VenueDetailPage({ slug });
}
