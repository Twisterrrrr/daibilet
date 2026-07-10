import type { Metadata } from 'next';

import { LandingsCatalogView } from '@/components/LandingsCatalogView';
import '@/lib/env';
import { buildPublicLandingsCatalogDto } from '@daibilet/backend/public-read';

export const revalidate = 3600;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Подборки — тематические коллекции событий | Дайбилет',
    description:
      'Готовые подборки на вечер, выходные и сезон: речные прогулки, экскурсии, концерты и семейные маршруты.',
    alternates: { canonical: '/podborki' },
  };
}

export default async function PodborkiCatalogPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const city = typeof params.city === 'string' ? params.city : 'all';
  const urlParams = new URLSearchParams();
  if (city && city !== 'all') urlParams.set('city', city);

  const catalog = await buildPublicLandingsCatalogDto(urlParams);
  return <LandingsCatalogView items={catalog.items} city={catalog.city} />;
}
