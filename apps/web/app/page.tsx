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
import { getHomeDestinations } from '@/server/cached-home-data';

/**
 * ISR window for the homepage. This only takes effect while the route stays
 * static: reading a dynamic request API here (cookies/headers/connection) opts
 * the whole route out of static generation, which made Next serve
 * `Cache-Control: private, no-store` and stopped nginx proxy_cache from storing
 * the page. With nothing cached upstream, every Googlebot hit reached the Node
 * process and the deploy restart window surfaced as 502 to crawlers.
 *
 * The selected city is a client concern. `SelectedCityProvider` seeds itself
 * from localStorage/sessionStorage and `navigator.geolocation`; the catalogue
 * routes (/events, /podborki, /places, /venues, /locations) already apply it
 * after hydration via shouldDeferStorageCityForGeo, so home now behaves the
 * same as the rest of the catalogue.
 */
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
  return (
    <SiteLayout>
      <HomePageContent />
    </SiteLayout>
  );
}
