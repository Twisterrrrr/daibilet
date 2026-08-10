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

function resolveEditorialQuote(featured: BlogCardDto | null | undefined): string | null {
  if (!featured) return null;
  const raw = String(featured.excerpt || '').trim().replace(/\s+/g, ' ');
  if (!raw) return null;
  if (raw.length <= 180) return raw;
  const cut = raw.slice(0, 180);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim()}...`;
}

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

  const editorialQuote = resolveEditorialQuote(featured);

  return (
    <>
      <Suspense
        fallback={
          <div className="border-b border-slate-200 bg-slate-50">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
              <div className="h-10 w-full max-w-3xl animate-pulse rounded-lg bg-slate-200/80" />
              <div className="flex w-full flex-col gap-2.5 md:flex-row md:items-center md:gap-3">
                <div className="h-10 w-full animate-pulse rounded-xl bg-slate-200/70 md:w-72 md:max-w-[18rem]" />
                <div className="flex min-w-0 flex-1 gap-1.5 overflow-hidden">
                  <div className="h-7 w-16 shrink-0 animate-pulse rounded-full bg-slate-200/60" />
                  <div className="h-7 w-20 shrink-0 animate-pulse rounded-full bg-slate-200/60" />
                  <div className="h-7 w-14 shrink-0 animate-pulse rounded-full bg-slate-200/60" />
                  <div className="h-7 w-16 shrink-0 animate-pulse rounded-full bg-slate-200/60" />
                </div>
              </div>
            </div>
          </div>
        }
      >
        <BlogListHero breadcrumbs={breadcrumbs} />
      </Suspense>

      {/* Explicit max-w + px gutter (not only .container-page) so filters/Свежее never hug viewport. */}
      <div className="mx-auto w-full max-w-7xl px-4 pt-6 pb-10 sm:px-6 sm:pt-8 sm:pb-14 lg:px-8">
        <Suspense
          fallback={
            <div className="space-y-4">
              <div className="h-10 w-full max-w-xl animate-pulse rounded-xl bg-gradient-to-r from-sky-100 to-primary-100/70" />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-64 animate-pulse rounded-2xl bg-gradient-to-br from-sky-100/90 via-primary-50 to-amber-50/80"
                  />
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
            editorialQuote={editorialQuote}
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
