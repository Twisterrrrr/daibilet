'use client';

import Link from 'next/link';
import { Suspense, useMemo, type ReactNode } from 'react';

import { BlogFeaturedHero } from '@/components/BlogFeaturedHero';
import { BlogListFiltered } from '@/components/BlogListFiltered.client';
import { BlogListHero } from '@/components/BlogListHero';
import { cityFilterLabel } from '@/lib/blog-meta';
import type { BlogSidebarPromoDto } from '@/lib/blog-sidebar-promo';
import { splitBlogListingHero, type BlogCardDto } from '@/lib/blog-utils';
import type { BlogListFilters } from '@/components/BlogListView';
import type { BreadcrumbItem } from '@/components/PageBreadcrumbs';

type BlogListingBodyProps = {
  posts: BlogCardDto[];
  breadcrumbs: BreadcrumbItem[];
  initialFilters?: BlogListFilters;
  hotMinPrices?: Record<string, number>;
  afishaPromos?: Record<string, BlogSidebarPromoDto>;
};

export function BlogListingBody({
  posts,
  breadcrumbs,
  initialFilters,
  hotMinPrices = {},
  afishaPromos = {},
}: BlogListingBodyProps) {
  // Cross-city feed by default: header CityPicker must not hard-filter /blog.
  const { featured, feed, hot } = useMemo(() => splitBlogListingHero(posts), [posts]);

  const fallbackCityLabel = featured ? cityFilterLabel(featured.citySlug, featured.city) : null;
  const afishaFallbackCityName =
    fallbackCityLabel &&
    fallbackCityLabel !== 'Регионы' &&
    fallbackCityLabel !== 'Несколько городов' &&
    fallbackCityLabel !== 'Без города'
      ? fallbackCityLabel
      : featured?.city || null;

  const featuredSlot: ReactNode = featured ? (
    <BlogFeaturedHero
      featured={featured}
      hotPosts={hot}
      hotMinPrices={hotMinPrices}
      afishaPromos={afishaPromos}
      afishaFallbackCityName={afishaFallbackCityName}
      afishaFallbackCitySlug={featured?.citySlug}
    />
  ) : null;

  return (
    <>
      <Suspense
        fallback={
          <div className="border-b border-slate-200 bg-slate-50">
            <div className="container-page space-y-4 py-8 sm:py-10">
              <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
              <div className="h-10 w-full max-w-2xl animate-pulse rounded-lg bg-slate-200" />
              <div className="h-5 w-full max-w-xl animate-pulse rounded bg-slate-200" />
              <div className="h-11 w-full max-w-xl animate-pulse rounded-2xl bg-slate-200" />
            </div>
          </div>
        }
      >
        <BlogListHero breadcrumbs={breadcrumbs} />
      </Suspense>

      <div className="container-page py-10 sm:py-14">
        <Suspense
          fallback={
            <div className="space-y-4">
              <div className="h-10 w-full max-w-xl animate-pulse rounded-xl bg-slate-200" />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-64 animate-pulse rounded-2xl bg-slate-200" />
                ))}
              </div>
            </div>
          }
        >
          <BlogListFiltered
            posts={feed}
            allPosts={posts}
            initialFilters={initialFilters}
            featuredSlot={featuredSlot}
          />
        </Suspense>

        <p className="mt-12 text-sm text-slate-500">
          Новые материалы выходят каждую неделю. А готовые списки событий - в{' '}
          <Link href="/podborki" className="font-medium text-primary-600 hover:text-primary-700">
            подборках
          </Link>
          .
        </p>
      </div>
    </>
  );
}
