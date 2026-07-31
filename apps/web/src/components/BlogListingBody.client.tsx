'use client';

import Link from 'next/link';
import { Suspense, useMemo } from 'react';

import { BlogFeaturedHero } from '@/components/BlogFeaturedHero';
import { BlogListFiltered } from '@/components/BlogListFiltered.client';
import { BlogListHero } from '@/components/BlogListHero';
import { useBlogHeaderCity } from '@/components/useBlogHeaderCity';
import { filterBlogFeedByCity } from '@/lib/blog-feed-rank';
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
  const { citySlug, cityName, cityReady } = useBlogHeaderCity();

  const localPosts = useMemo(
    () => (citySlug ? filterBlogFeedByCity(posts, citySlug) : posts),
    [posts, citySlug],
  );
  const hasLocalPosts = !citySlug || localPosts.length > 0;

  const listingPosts = citySlug && hasLocalPosts ? localPosts : posts;
  const { featured, feed, hot } = useMemo(
    () => splitBlogListingHero(listingPosts),
    [listingPosts],
  );

  const fallbackCityLabel = featured ? cityFilterLabel(featured.citySlug, featured.city) : null;
  const afishaFallbackCityName =
    fallbackCityLabel &&
    fallbackCityLabel !== 'Регионы' &&
    fallbackCityLabel !== 'Несколько городов' &&
    fallbackCityLabel !== 'Без города'
      ? fallbackCityLabel
      : featured?.city || null;

  const emptyCityLabel = cityName || (citySlug ? cityFilterLabel(citySlug) : null);

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
        <BlogListHero
          breadcrumbs={breadcrumbs}
          cityName={cityReady && hasLocalPosts ? cityName : null}
        />
      </Suspense>

      <div className="container-page py-10 sm:py-14">
        {featured ? (
          <BlogFeaturedHero
            featured={featured}
            hotPosts={hot}
            hotMinPrices={hotMinPrices}
            afishaPromos={afishaPromos}
            afishaFallbackCityName={afishaFallbackCityName}
            afishaFallbackCitySlug={featured?.citySlug}
          />
        ) : null}

        {citySlug && cityReady && !hasLocalPosts && emptyCityLabel ? (
          <div
            className="mb-6 rounded-2xl border border-amber-200/80 bg-amber-50/70 px-4 py-3 text-sm text-amber-950 sm:px-5 sm:py-4"
            role="status"
          >
            Пока нет статей про {emptyCityLabel} - смотрите свежее по России.
          </div>
        ) : null}

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
            headerCitySlug={citySlug}
            hasLocalPosts={hasLocalPosts}
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
