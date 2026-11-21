import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import CityPage, { generateMetadata as generateCityMetadata } from '../../cities/[slug]/page';
import { isCityFirstUrlMode } from '@/lib/routes';
import { loadCityDto } from '@/server/cached-city-data';

export const revalidate = 300;
export const dynamicParams = true;

type PageProps = { params: Promise<{ slug: string }> };

async function requireRegion(slug: string): Promise<'ok' | 'unavailable'> {
  if (!isCityFirstUrlMode()) notFound();
  const loaded = await loadCityDto(slug);
  if (loaded.kind === 'miss') notFound();
  if (loaded.kind === 'ok' && loaded.payload.city.type !== 'region') notFound();
  return loaded.kind === 'unavailable' ? 'unavailable' : 'ok';
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  await requireRegion(slug);
  return generateCityMetadata({ params: Promise.resolve({ slug }) });
}

export default async function RegionRoutePage({ params }: PageProps) {
  const { slug } = await params;
  await requireRegion(slug);
  return CityPage({ params: Promise.resolve({ slug }) });
}
