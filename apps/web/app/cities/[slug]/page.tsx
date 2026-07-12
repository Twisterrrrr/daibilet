import type { Metadata } from 'next';

import { notFound } from 'next/navigation';



import { CityPageView } from '@/components/CityPageView.client';

import { SiteLayout } from '@/components/SiteLayout';

import '@/lib/env';

import { buildPublicCityDto } from '@daibilet/backend/public-read';



export const revalidate = 300;



type PageProps = {

  params: Promise<{ slug: string }>;

};



export async function generateMetadata({ params }: PageProps): Promise<Metadata> {

  const { slug } = await params;

  const payload = await buildPublicCityDto(decodeURIComponent(slug));

  if (!payload?.city) return { title: 'Город не найден | Дайбилет' };

  const city = payload.city;

  return {

    title: city.seoTitle || `${city.name}: афиша и билеты | Дайбилет`,

    description: city.seoDescription || `События и экскурсии в городе ${city.name}`,

    alternates: { canonical: city.canonicalPath || `/cities/${city.slug}` },

  };

}



export default async function CityPage({ params }: PageProps) {

  const { slug } = await params;

  const payload = await buildPublicCityDto(decodeURIComponent(slug));

  if (!payload?.city) notFound();



  return (

    <SiteLayout>

      <CityPageView slug={decodeURIComponent(slug)} initialPayload={payload} />

    </SiteLayout>

  );

}

