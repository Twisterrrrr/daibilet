import type { Metadata } from 'next';

import { EventsV2Preview } from '@/components/EventsV2Preview';
import { SiteLayout } from '@/components/SiteLayout';
import { getHomeCatalog } from '@/server/cached-home-data';
import type { PublicCatalogDto } from '@daibilet/contracts/public';
import '@/lib/env';
import '@/styles/v2-events.css';

export const metadata: Metadata = {
  title: 'Афиша - превью нового дизайна',
  robots: { index: false, follow: false },
  alternates: { canonical: '/afisha2' },
};

const EMPTY: PublicCatalogDto = {
  items: [],
  total: 0,
  limit: 40,
  offset: 0,
  hasMore: false,
  facets: { cities: [], categories: [], subcategories: [], landings: [], priceSteps: [] },
};

export default async function Afisha2Page() {
  const catalog = await getHomeCatalog().catch(() => EMPTY);
  return (
    <SiteLayout chromeVariant="v2">
      <EventsV2Preview catalog={catalog} />
    </SiteLayout>
  );
}