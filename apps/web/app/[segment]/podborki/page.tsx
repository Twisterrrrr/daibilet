import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { generateMetadata as generateCityPodborkiMetadata } from '../../podborki/c/[city]/page';
import { isCityFirstLegacyRouteSlug } from '@/lib/city-first-route-slugs';
import { isCityFirstUrlMode } from '@/lib/routes';
import { resolvePodborkiCityMetaPilot } from '@/lib/podborki-city-seo';
import { PodborkiCatalogSurface, resolvePodborkiCatalogSurfaceSeo } from '@/server/podborki-catalog-surface';

export const revalidate = 600;

type PageProps = { params: Promise<{ segment: string }> };

async function cityParams(params: PageProps['params']) {
  const { segment } = await params;
  if (!isCityFirstUrlMode() || !isCityFirstLegacyRouteSlug(segment)) notFound();
  if (!resolvePodborkiCityMetaPilot(segment)) notFound();
  return { city: segment };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const city = await cityParams(params);
  return generateCityPodborkiMetadata({ params: Promise.resolve(city) });
}

export default async function CityFirstPodborkiHubPage({ params }: PageProps) {
  const city = await cityParams(params);
  const seo = await resolvePodborkiCatalogSurfaceSeo({ rawCity: city.city });
  return <PodborkiCatalogSurface seo={seo} />;
}
