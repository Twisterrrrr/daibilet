import type { Metadata } from 'next';

import { HomePageContent } from '@/components/HomePageContent';
import { SiteLayout } from '@/components/SiteLayout';
import {
  HOME_SEO_DESCRIPTION_FALLBACK,
  HOME_SEO_TITLE,
  INDEX_FOLLOW_ROBOTS,
  buildHomeSeoDescription,
  buildShareMetadata,
  canonicalHref,
  ensureSeoDescription,
} from '@/lib/seo-meta';
import { orderPopularRailCities } from '@/lib/popular-cities-rail';
import { toSlimCityDestination } from '@/lib/ssr-lean-payloads';
import { getHomeDestinations } from '@/server/cached-home-data';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  let description = HOME_SEO_DESCRIPTION_FALLBACK;
  try {
    const destinationsPayload = await getHomeDestinations();
    description = buildHomeSeoDescription(destinationsPayload?.destinations ?? []);
  } catch {
    // keep fallback if destinations cache/DB is unavailable at build time
  }

  description = ensureSeoDescription(description, HOME_SEO_DESCRIPTION_FALLBACK);

  return {
    title: {
      absolute: HOME_SEO_TITLE,
    },
    description,
    alternates: { canonical: canonicalHref('/') },
    robots: INDEX_FOLLOW_ROBOTS,
    ...buildShareMetadata({
      title: HOME_SEO_TITLE,
      description,
      path: '/',
      imageWidth: 1200,
      imageHeight: 630,
    }),
  };
}

export default async function HomePage() {
  let topCities: ReturnType<typeof toSlimCityDestination>[] = [];
  try {
    const destinationsPayload = await getHomeDestinations();
    const cities = (destinationsPayload?.destinations ?? []).filter((item: { type?: string }) => item.type === 'city');
    topCities = orderPopularRailCities(cities as never, 16).map(toSlimCityDestination);
  } catch {
    // keep empty if destinations cache/DB is unavailable
  }
  return (
    <SiteLayout>
      <HomePageContent topCities={topCities} />
    </SiteLayout>
  );
}
