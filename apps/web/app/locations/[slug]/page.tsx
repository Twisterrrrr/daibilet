import type { Metadata } from 'next';

import { VenueDetailPage, generateVenueDetailMetadata } from '@/components/VenuePages';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return generateVenueDetailMetadata(slug);
}

export const dynamic = 'force-dynamic';

export default async function LocationPage({ params }: PageProps) {
  const { slug } = await params;
  return VenueDetailPage({ slug });
}
