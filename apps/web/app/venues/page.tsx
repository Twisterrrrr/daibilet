import type { Metadata } from 'next';

import { VenueListPage, generateVenueListMetadata } from '@/components/VenuePages';

export async function generateMetadata(): Promise<Metadata> {
  return generateVenueListMetadata(
    'Площадки: музеи, галереи и театры - билеты онлайн',
    'Каталог площадок Дайбилет: музеи, галереи, театры и арт-пространства. Актуальная афиша и электронные билеты.',
    '/venues',
  );
}

export const revalidate = 300;

export default function VenuesIndexPage() {
  return VenueListPage({ family: 'institution' });
}
