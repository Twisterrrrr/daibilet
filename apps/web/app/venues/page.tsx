import type { Metadata } from 'next';

import { VenueListPage, generateVenueListMetadata } from '@/components/VenuePages';
import { PUBLIC_PAGE_REVALIDATE } from '@/server/cache-config';

export async function generateMetadata(): Promise<Metadata> {
  return generateVenueListMetadata(
    'Площадки и музеи | Дайбилет',
    'Музеи, театры, концертные залы и культурные пространства с афишей событий.',
  );
}

export const revalidate = PUBLIC_PAGE_REVALIDATE;

export default function VenuesIndexPage() {
  return VenueListPage({ family: 'institution', listPath: '/venues' });
}
