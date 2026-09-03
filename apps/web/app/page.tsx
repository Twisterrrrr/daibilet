import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import { HomePageContent } from '@/components/HomePageContent';
import { SiteLayout } from '@/components/SiteLayout';
import { decodeSelectedCityCookie, SELECTED_CITY_COOKIE } from '@/lib/selected-city';
import {
  HOME_SEO_DESCRIPTION_FALLBACK,
  HOME_SEO_TITLE,
  INDEX_FOLLOW_ROBOTS,
  buildHomeSeoDescription,
  buildShareMetadata,
  canonicalHref,
  ensureSeoDescription,
} from '@/lib/seo-meta';
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
  const cityCookie = decodeSelectedCityCookie((await cookies()).get(SELECTED_CITY_COOKIE)?.value);
  return (
    <SiteLayout initialCity={cityCookie}>
      <HomePageContent />
    </SiteLayout>
  );
}
