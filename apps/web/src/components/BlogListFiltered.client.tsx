'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';

import {
  resolveActiveBlogAfishaPromo,
} from '@/components/BlogAfishaPromo.client';
import { BlogFeedPromo } from '@/components/BlogFeedPromo.client';
import { BlogMagazineGrid } from '@/components/BlogMagazineGrid.client';
import { BlogListingFiltersNav } from '@/components/BlogListingFiltersNav.client';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import type { BlogListFilters } from '@/components/BlogListView';
import type { BlogCardDto } from '@/lib/blog-utils';
import { paginateBlogFeedByCursor } from '@/lib/blog-cursor';
import { planBlogFeedPromos } from '@/lib/blog-feed-promo';
import { canonicalizeBlogCitySlug, filterBlogFeedByCity } from '@/lib/blog-feed-rank';
import { buildBlogCityFilterOptions, cityFilterLabel } from '@/lib/blog-meta';
import type { BlogSidebarPromoDto } from '@/lib/blog-sidebar-promo';
import { parseBlogTopicParam, postMatchesTopic } from '@/lib/blog-topics';

const PAGE_SIZE = 12;

function paramValue(value: string | null | undefined, fallback = 'all'): string {
  const raw = String(value || '').trim();
  return raw || fallback;
}

function matchesQuery(post: BlogCardDto, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const tokens = q.split(/\s+/).filter(Boolean);
  const haystack =
    post.searchText ||
    [post.slug, post.title, post.excerpt, post.tag, post.city].filter(Boolean).join(' ').toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

export function BlogListFiltered({
  posts,
  allPosts,
  initialFilters,
  featuredSlot = null,
  editorialQuote = null,
  sidebarSlot = null,
  afishaPromos = {},
  afishaFallbackCityName = null,
  afishaFallbackCitySlug = null,
}: {
  posts: BlogCardDto[];
  /** Full blog list for city filter dropdown counts (without hero split). */
  allPosts?: BlogCardDto[];
  initialFilters?: BlogListFilters;
  /**
   * «Материал недели» block. When URL materials filters are active, filtered
   * results render above this slot; when idle - featured stays above the feed.
   */
  featuredSlot?: ReactNode;
  /** Short quote for magazine editorial break (from featured excerpt). */
  editorialQuote?: string | null;
  /** Desktop sidebar: popular posts, promos, Telegram. */
  sidebarSlot?: ReactNode;
  afishaPromos?: Record<string, BlogSidebarPromoDto>;
  afishaFallbackCityName?: string | null;
  afishaFallbackCitySlug?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedCity = useSelectedCityOptional();
  const cityOptionsSource = allPosts?.length ? allPosts : posts;
  const [cursor, setCursor] = useState<string | null>(null);
  const [visiblePosts, setVisiblePosts] = useState<BlogCardDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  // Stable seed from SSR order - Math.random in useEffect reshuffled promo slots after paint.
  const promoSeed = useMemo(() => {
    let hash = 0;
    for (const post of posts.slice(0, 8)) {
      const slug = String(post.slug || '');
      for (let i = 0; i < slug.length; i += 1) {
        hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
      }
    }
    return (hash % 10_000) + 1;
  }, [posts]);

  const urlCityRaw = paramValue(searchParams.get('city') ?? initialFilters?.city);
  const urlCity = urlCityRaw === 'multi' ? 'all' : urlCityRaw;
  const topic = parseBlogTopicParam(searchParams.get('topic') ?? initialFilters?.topic);
  const query = String(searchParams.get('q') ?? initialFilters?.q ?? '').trim();

  const cityOptions = useMemo(
    () => buildBlogCityFilterOptions(cityOptionsSource),
    [cityOptionsSource],
  );

  const filtered = useMemo(() => {
    let list = posts.filter((post) => {
      if (!postMatchesTopic(post.topics, topic)) return false;
      if (!matchesQuery(post, query)) return false;
      return true;
    });
    // Only explicit in-page `?city=` hard-filters. Header CityPicker does not.
    if (urlCity !== 'all') {
      list = filterBlogFeedByCity(list, urlCity);
    }
    return list;
  }, [posts, topic, query, urlCity]);

  useEffect(() => {
    const page = paginateBlogFeedByCursor(filtered, { cursor: null, limit: PAGE_SIZE });
    setCursor(null);
    setVisiblePosts(page.items);
    setNextCursor(page.nextCursor);
  }, [filtered]);

  const setFilter = useCallback(
    (key: 'city', value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.delete('type');
      next.delete('view');
      next.delete('author');
      if (!value || value === 'all') next.delete(key);
      else next.set(key, value);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const resetFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const loadMore = useCallback(() => {
    if (!nextCursor) return;
    const page = paginateBlogFeedByCursor(filtered, { cursor: nextCursor, limit: PAGE_SIZE });
    setCursor(nextCursor);
    setVisiblePosts((prev) => {
      const seen = new Set(prev.map((p) => p.slug));
      return [...prev, ...page.items.filter((item) => !seen.has(item.slug))];
    });
    setNextCursor(page.nextCursor);
  }, [filtered, nextCursor]);

  const hasActive = urlCity !== 'all' || topic !== 'all' || Boolean(query);
  const hasMore = Boolean(nextCursor);
  /** SSR / first paint: useEffect ещё не заполнил visiblePosts. */
  const displayPosts =
    visiblePosts.length > 0
      ? visiblePosts
      : paginateBlogFeedByCursor(filtered, { cursor: null, limit: PAGE_SIZE }).items;

  /**
   * Empty-city banner only when explicit dropdown / URL `?city=` has 0 article hits.
   * Header city never drives this banner.
   */
  const emptyCheckSlug = urlCity !== 'all' ? canonicalizeBlogCitySlug(urlCity) : null;
  const emptyCheckCount = emptyCheckSlug
    ? filterBlogFeedByCity(cityOptionsSource, emptyCheckSlug).length
    : -1;
  const bannerLabel = emptyCheckSlug ? cityFilterLabel(urlCity) : null;
  const showEmptyCityBanner = Boolean(emptyCheckSlug && bannerLabel && emptyCheckCount === 0);

  const activePromo = useMemo(
    () =>
      resolveActiveBlogAfishaPromo(
        afishaPromos,
        selectedCity,
        afishaFallbackCityName,
        afishaFallbackCitySlug,
      ),
    [afishaPromos, selectedCity, afishaFallbackCityName, afishaFallbackCitySlug],
  );

  const feedPromoSlots = useMemo(() => {
    const articleCount = displayPosts.filter((post) => Boolean(post?.slug && post?.title)).length;
    const blockCount = Math.floor(articleCount / 3);
    const plans = planBlogFeedPromos({
      blockCount,
      promo: activePromo,
      seed: promoSeed,
      hasSidebar: Boolean(sidebarSlot),
    });
    return plans.map((plan) => ({
      afterBlockIndex: plan.afterBlockIndex,
      node: (
        <BlogFeedPromo
          key={`feed-promo-${plan.afterBlockIndex}-${plan.kind}-${plan.layout}`}
          promo={activePromo!}
          kind={plan.kind}
          layout={plan.layout}
        />
      ),
    }));
  }, [displayPosts, activePromo, promoSeed]);

  const feedBody = (
    <div id="blog-feed" className="scroll-mt-24">
      {showEmptyCityBanner ? (
        <div
          className="mb-6 rounded-2xl border border-amber-200/80 bg-amber-50/70 px-4 py-3 text-sm text-amber-950 sm:px-5 sm:py-4"
          role="status"
        >
          Пока нет статей про {bannerLabel} - смотрите свежее по России.
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <>
          <BlogMagazineGrid
            posts={displayPosts}
            editorialQuote={editorialQuote}
            leadBanner={hasActive || !featuredSlot}
            feedPromoSlots={feedPromoSlots}
          />
          {hasMore ? (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                className="rounded-xl border border-primary/30 bg-primary-50/50 px-5 py-2.5 text-sm font-semibold text-primary-800 transition hover:border-primary/50 hover:bg-primary-50 hover:text-primary-900"
                data-cursor={cursor || undefined}
              >
                Показать ещё
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-sky-50 via-white to-primary-50/60 py-14 text-center sm:py-16">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-primary-100/80 text-primary-600">
            <Search className="h-5 w-5" aria-hidden />
          </div>
          <p className="text-lg font-semibold text-slate-800">Ничего не нашли</p>
          <p className="mt-1 text-sm text-slate-600">Попробуйте сбросить фильтры или изменить запрос</p>
          {hasActive ? (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-5 inline-flex items-center justify-center rounded-xl border border-primary/30 bg-white px-4 py-2 text-sm font-semibold text-primary-700 transition hover:border-primary/50 hover:bg-primary-50"
            >
              Сбросить фильтры
            </button>
          ) : null}
        </div>
      )}
    </div>
  );

  return (
    <div className="blog-layout">
      <BlogListingFiltersNav
        cityOptions={cityOptions}
        cityValue={urlCity}
        onCityChange={(value) => setFilter('city', value)}
        onReset={resetFilters}
        hasActive={hasActive}
      />

      <div className="blog-layout__main min-w-0">
        {hasActive ? (
          <>
            <div className="mb-12 sm:mb-14">{feedBody}</div>
            {featuredSlot}
          </>
        ) : (
          <>
            {featuredSlot}
            <div className={featuredSlot ? 'mt-2 sm:mt-4' : undefined}>{feedBody}</div>
          </>
        )}
      </div>

      {sidebarSlot ? <div className="blog-layout__aside">{sidebarSlot}</div> : null}
    </div>
  );
}
