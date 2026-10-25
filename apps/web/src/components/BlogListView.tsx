import { BlogListingBody } from '@/components/BlogListingBody.client';
import { SiteLayout } from '@/components/SiteLayout';
import type { BlogSidebarPromoDto } from '@/lib/blog-sidebar-promo';
import type { BlogCardDto } from '@/lib/blog-utils';
import type { BreadcrumbItem } from '@/components/PageBreadcrumbs';

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
  afishaPromos = {},
}: {
  posts: BlogCardDto[];
  filters?: BlogListFilters;
  hotMinPrices?: Record<string, number>;
  afishaPromos?: Record<string, BlogSidebarPromoDto>;
}) {
  const breadcrumbs: BreadcrumbItem[] = [{ label: 'Главная', href: '/' }, { label: 'Блог' }];

  return (
    <SiteLayout>
      <BlogListingBody
        posts={posts}
        breadcrumbs={breadcrumbs}
        initialFilters={filters}
        hotMinPrices={hotMinPrices}
        afishaPromos={afishaPromos}
      />
    </SiteLayout>
  );
}
