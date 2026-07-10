import type { Metadata } from 'next';

import { VenueListPage, generateVenueListMetadata } from '@/components/VenuePages';

export async function generateMetadata(): Promise<Metadata> {
  return generateVenueListMetadata(
    'Причалы и локации | Дайбилет',
    'Причалы, теплоходы и локации с афишей речных прогулок и событий.',
  );
}

export const dynamic = 'force-dynamic';

export default function LocationsIndexPage() {
  return VenueListPage({ family: 'location', listPath: '/locations' });
}
