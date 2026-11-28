import type { Metadata } from 'next';

import { HomeV2Preview } from '@/components/HomeV2Preview';
import { SiteLayout } from '@/components/SiteLayout';
import { mergeBlogCards, type BlogCardDto } from '@/lib/blog-utils';
import { getHomeArticles, getHomePageData } from '@/server/cached-home-data';
import '@/lib/env';
import '@/styles/v2-main.css';

export const metadata: Metadata = {
  title: 'Главная - превью нового дизайна',
  robots: { index: false, follow: false },
  alternates: { canonical: '/home2' },
};

export default async function Home2Page() {
  const data = await getHomePageData(null);
  const rawArticles = (await getHomeArticles().catch(() => null))?.articles;
  const articles = mergeBlogCards((rawArticles as BlogCardDto[] | null) ?? null);
  return (
    <SiteLayout chromeVariant="v2">
      <HomeV2Preview catalog={data.catalogPayload} landings={data.landingsCatalog.items ?? []} articles={articles} />
    </SiteLayout>
  );
}