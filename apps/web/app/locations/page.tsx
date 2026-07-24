import type { Metadata } from 'next';

import { VenueListPage, generateVenueListMetadata } from '@/components/VenuePages';

export async function generateMetadata(): Promise<Metadata> {
  return generateVenueListMetadata(
    'Локации и точки сбора: причалы, парки, места встречи',
    'Каталог локаций: причалы речных прогулок, парки, точки сбора пеших экскурсий, автобусные остановки и встречи в аэропорту.',
    '/locations',
  );
}

export const revalidate = 300;

export default function LocationsIndexPage() {
  return VenueListPage({ family: 'location' });
}
