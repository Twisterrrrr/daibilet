import type { Metadata } from 'next';

import { HomePageContent } from '@/components/HomePageContent';
import { SiteLayout } from '@/components/SiteLayout';
import {
  HOME_SEO_DESCRIPTION_FALLBACK,
  HOME_SEO_TITLE,
  buildHomeSeoDescription,
  buildShareMetadata,
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

  return {
    title: {
      absolute: HOME_SEO_TITLE,
    },
    description,
    ...buildShareMetadata({
      title: HOME_SEO_TITLE,
      description,
      path: '/',
      imageWidth: 1200,
      imageHeight: 630,
    }),
  };
}

export default function HomePage() {
  return (
    <SiteLayout>
      <HomePageContent />
    </SiteLayout>
  );
}
