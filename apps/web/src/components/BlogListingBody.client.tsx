'use client';

import Link from 'next/link';
import { Suspense, useMemo, type ReactNode } from 'react';

import { BlogFeaturedHero } from '@/components/BlogFeaturedHero';
import { BlogListingSidebar } from '@/components/BlogListingSidebar';
import { BlogListFiltered } from '@/components/BlogListFiltered.client';
import { BlogListHero } from '@/components/BlogListHero';
import { cityFilterLabel } from '@/lib/blog-meta';
import type { BlogSidebarPromoDto } from '@/lib/blog-sidebar-promo';
import {
  splitBlogListingHero,
  truncateAtSentence,
  type BlogCardDto,
} from '@/lib/blog-utils';
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
  return truncateAtSentence(raw, 180, 1);
}

export function BlogListingBody({
  posts,
  breadcrumbs,
  initialFilters,
  hotMinPrices = {},
  afishaPromos = {},
}: BlogListingBodyProps) {
  // Keep SSR/order stable: client reshuffle of the featured hero caused a visible swap.
  const orderedPosts = posts;

  // Cross-city feed by default: header CityPicker must not hard-filter /blog.
  // Featured = first card from SSR order (no visit reshuffle).
  const { featured, feed, hot } = useMemo(
    () => splitBlogListingHero(orderedPosts),
    [orderedPosts],
  );

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
      hideAsideOnDesktop
    />
  ) : null;

  const sidebarSlot: ReactNode = featured ? (
    <BlogListingSidebar
      hotPosts={hot}
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
          <div className="border-b border-slate-100 bg-white">
            <div className="container-page flex flex-col gap-3 py-5 sm:py-6">
              <div className="h-8 w-full max-w-md animate-pulse rounded-lg bg-slate-200/80" />
              <div className="h-4 w-full max-w-lg animate-pulse rounded bg-slate-100" />
              <div className="h-11 w-full max-w-xl animate-pulse rounded-2xl bg-[#F5F5F7]" />
            </div>
          </div>
        }
      >
        <BlogListHero breadcrumbs={breadcrumbs} />
      </Suspense>

      {/* container-page keeps filters/Свежее aligned with header/footer gutters. */}
      <div className="container-page pt-6 pb-10 sm:pt-8 sm:pb-14">
        <Suspense
          fallback={
            <div className="space-y-4">
              <div className="h-10 w-full max-w-xl animate-pulse rounded-xl bg-gradient-to-r from-sky-100 to-primary-100/70" />
              <div className="catalog-card-grid">
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
            sidebarSlot={sidebarSlot}
            afishaPromos={afishaPromos}
            afishaFallbackCityName={afishaFallbackCityName}
            afishaFallbackCitySlug={featured?.citySlug}
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
