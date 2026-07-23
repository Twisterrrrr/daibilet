import Link from 'next/link';

import { BlogListFiltered } from '@/components/BlogListFiltered.client';
import { BlogListHero } from '@/components/BlogListHero';
import { SiteLayout } from '@/components/SiteLayout';
import type { BlogCardDto } from '@/lib/blog-utils';

export type BlogListFilters = {
  city?: string;
  author?: string;
  topic?: string;
  q?: string;
};

export function BlogListView({
  posts,
  filters,
}: {
  posts: BlogCardDto[];
  filters?: BlogListFilters;
}) {
  return (
    <SiteLayout>
      <BlogListHero breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Блог' }]} />

      {/* div, not nested <main>: SiteLayout already wraps children in <main> */}
      <div className="container-page py-10 sm:py-14">
        <BlogListFiltered posts={posts} initialFilters={filters} />

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
