import type { Metadata } from 'next';

import { VenueListPage, generateVenueListMetadata } from '@/components/VenuePages';

export async function generateMetadata(): Promise<Metadata> {
  return generateVenueListMetadata(
    'Локации: причалы, парки и точки старта экскурсий | Дайбилет',
    'Куда приходить: причалы речных прогулок, парки, точки старта пеших экскурсий, автобусные остановки и встречи в аэропорту.',
  );
}

export const revalidate = 300;

export default function LocationsIndexPage() {
  return VenueListPage({ family: 'location' });
}
