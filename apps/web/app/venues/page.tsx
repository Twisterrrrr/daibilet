import type { Metadata } from 'next';

import { VenueListPage, generateVenueListMetadata } from '@/components/VenuePages';

export async function generateMetadata(): Promise<Metadata> {
  return generateVenueListMetadata(
    'Площадки и музеи | Дайбилет',
    'Музеи, театры, концертные залы и культурные пространства с афишей событий.',
  );
}

export const dynamic = 'force-dynamic';

export default function VenuesIndexPage() {
  return VenueListPage({ family: 'institution', listPath: '/venues' });
}
