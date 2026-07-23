import Link from 'next/link';

import { BlogFeaturedHero } from '@/components/BlogFeaturedHero';
import { BlogListFiltered } from '@/components/BlogListFiltered.client';
import { BlogListHero } from '@/components/BlogListHero';
import { SiteLayout } from '@/components/SiteLayout';
import type { BlogCardDto } from '@/lib/blog-utils';
import { splitBlogListingHero } from '@/lib/blog-utils';

export type BlogListFilters = {
  city?: string;
  author?: string;
  topic?: string;
  q?: string;
};

export function BlogListView({
  posts,
  filters,
  hotMinPrices = {},
}: {
  posts: BlogCardDto[];
  filters?: BlogListFilters;
  hotMinPrices?: Record<string, number>;
}) {
  const { featured, feed, hot } = splitBlogListingHero(posts);

  return (
    <SiteLayout>
      <BlogListHero
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Блог' }]}
        guidesCount={posts.length}
      />

      {/* div, not nested <main>: SiteLayout already wraps children in <main> */}
      <div className="container-page py-10 sm:py-14">
        {featured ? (
          <BlogFeaturedHero
            featured={featured}
            hotPosts={hot}
            hotMinPrices={hotMinPrices}
          />
        ) : null}

        <BlogListFiltered posts={feed} initialFilters={filters} />

        <p className="mt-12 text-sm text-slate-500">
          Новые материалы выходят каждую неделю. А готовые списки событий - в{' '}
          <Link href="/podborki" className="font-medium text-primary-600 hover:text-primary-700">
            подборках
          </Link>
          .
        </p>
      </div>
    </SiteLayout>
  );
}
