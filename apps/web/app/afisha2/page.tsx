import type { Metadata } from 'next';

import { EventsV2Preview } from '@/components/EventsV2Preview';
import { SiteLayout } from '@/components/SiteLayout';
import { mergeBlogCards, type BlogCardDto } from '@/lib/blog-utils';
import { getHomeArticles, getHomeCatalog, getHomeLandings } from '@/server/cached-home-data';
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
  const landings = (await getHomeLandings().catch(() => null))?.items ?? [];
  const rawArticles = (await getHomeArticles().catch(() => null))?.articles;
  const articles = mergeBlogCards((rawArticles as BlogCardDto[] | null) ?? null);
  return (
    <SiteLayout chromeVariant="v2">
      <EventsV2Preview catalog={catalog} landings={landings} articles={articles} />
    </SiteLayout>
  );
}