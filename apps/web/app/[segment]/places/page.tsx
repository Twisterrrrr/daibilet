import type { Metadata } from 'next';

import CityPlacesPage, {
  generateMetadata as generateCityPlacesMetadata,
} from '../../places/c/[city]/page';
import { isCityFirstLegacyRouteSlug } from '@/lib/city-first-route-slugs';
import { cityLookupSlug, isCityFirstUrlMode } from '@/lib/routes';
import { notFound } from 'next/navigation';

type PageProps = {
  params: Promise<{ segment: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
};

export const revalidate = 300;

async function cityParams(params: PageProps['params']) {
  const { segment } = await params;
  if (!isCityFirstUrlMode()) notFound();
  if (!isCityFirstLegacyRouteSlug(segment)) notFound();
  return { city: cityLookupSlug(segment) };
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const city = await cityParams(params);
  return generateCityPlacesMetadata({ params: Promise.resolve(city), searchParams });
}

export default async function CityFirstPlacesPage({ params, searchParams }: PageProps) {
  const city = await cityParams(params);
  return CityPlacesPage({ params: Promise.resolve(city), searchParams });
}
