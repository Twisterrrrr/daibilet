import Link from 'next/link';
import { BookOpen } from 'lucide-react';

import { BlogListFiltered } from '@/components/BlogListFiltered.client';
import { SectionPageHero } from '@/components/PageBreadcrumbs';
import { SiteLayout } from '@/components/SiteLayout';
import type { BlogCardDto } from '@/lib/blog-utils';

export type BlogListFilters = {
  city?: string;
  author?: string;
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
      <SectionPageHero
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Блог' }]}
        gradientClass="from-amber-500 via-rose-500 to-primary-700"
        eyebrow={
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-white/85">
            <BookOpen className="h-4 w-4" />
            Блог Дайбилет
          </p>
        }
        title="Гайды, обзоры и советы"
        description="Как выбирать события, где сидеть, куда идти с детьми и что послушать в этом сезоне."
      />

      <main className="container-page py-10 sm:py-14">
        <BlogListFiltered posts={posts} initialFilters={filters} />

        <p className="mt-12 text-sm text-slate-500">
          Новые материалы выходят каждую неделю. А готовые списки событий - в{' '}
          <Link href="/podborki" className="font-medium text-primary-600 hover:text-primary-700">
            подборках
          </Link>
          .
        </p>
      </main>
    </SiteLayout>
  );
}
