'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, Search } from 'lucide-react';

import { BlogListRows } from '@/components/BlogListRows.client';
import { BlogMagazineGrid } from '@/components/BlogMagazineGrid.client';
import type { BlogListFilters } from '@/components/BlogListView';
import type { BlogCardDto } from '@/lib/blog-utils';
import { paginateBlogFeedByCursor } from '@/lib/blog-cursor';
import { canonicalizeBlogCitySlug, filterBlogFeedByCity } from '@/lib/blog-feed-rank';
import { authorLabel, cityFilterLabel } from '@/lib/blog-meta';
import { parseBlogTopicParam, postMatchesTopic } from '@/lib/blog-topics';
import {
  parseBlogViewMode,
  readStoredBlogViewMode,
  type BlogViewMode,
} from '@/lib/blog-view-mode';

const PAGE_SIZE = 12;

function paramValue(value: string | null | undefined, fallback = 'all'): string {
  const raw = String(value || '').trim();
  return raw || fallback;
}

function buildOptions(
  posts: BlogCardDto[],
  pick: (post: BlogCardDto) => { value: string; label: string } | null,
): Array<{ value: string; label: string; count: number }> {
  const counts = new Map<string, { label: string; count: number }>();
  for (const post of posts) {
    const hit = pick(post);
    if (!hit?.value) continue;
    const prev = counts.get(hit.value);
    if (prev) prev.count += 1;
    else counts.set(hit.value, { label: hit.label, count: 1 });
  }
  return [...counts.entries()]
    .map(([value, meta]) => ({ value, label: meta.label, count: meta.count }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ru'));
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

function SoftSelect({
  value,
  onChange,
  ariaLabel,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  children: ReactNode;
}) {
  return (
    <label className="relative inline-flex min-w-0 items-center">
      <select
        className="h-10 appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm font-medium text-slate-700 outline-none transition hover:border-slate-300 hover:bg-slate-50 focus-visible:border-primary-400 focus-visible:ring-2 focus-visible:ring-primary-100 md:min-w-[11rem]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden
      />
    </label>
  );
}

export function BlogListFiltered({
  posts,
  allPosts,
  initialFilters,
  featuredSlot = null,
  editorialQuote = null,
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
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const cityOptionsSource = allPosts?.length ? allPosts : posts;
  const [viewMode, setViewModeState] = useState<BlogViewMode>('magazine');
  /** Below md always magazine - view toggle is desktop-only; city/author filter stays visible. */
  const [isMdUp, setIsMdUp] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [visiblePosts, setVisiblePosts] = useState<BlogCardDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const urlCity = paramValue(searchParams.get('city') ?? initialFilters?.city);
  const author = paramValue(searchParams.get('author') ?? initialFilters?.author);
  const topic = parseBlogTopicParam(searchParams.get('topic') ?? initialFilters?.topic);
  const query = String(searchParams.get('q') ?? initialFilters?.q ?? '').trim();

  const cityOptions = useMemo(
    () =>
      buildOptions(cityOptionsSource, (post) => {
        const value = String(post.citySlug || '').trim();
        if (!value) return null;
        return { value, label: cityFilterLabel(value, post.city) };
      }),
    [cityOptionsSource],
  );

  const authorOptions = useMemo(
    () =>
      buildOptions(cityOptionsSource, (post) => {
        const value = String(post.authorId || 'editorial').trim() || 'editorial';
        return { value, label: post.authorName || authorLabel(value) };
      }),
    [cityOptionsSource],
  );

  const filtered = useMemo(() => {
    let list = posts.filter((post) => {
      const postAuthor = String(post.authorId || 'editorial');
      if (author !== 'all' && postAuthor !== author) return false;
      if (!postMatchesTopic(post.topics, topic)) return false;
      if (!matchesQuery(post, query)) return false;
      return true;
    });
    // Only explicit in-page `?city=` hard-filters. Header CityPicker does not.
    if (urlCity !== 'all') {
      list = filterBlogFeedByCity(list, urlCity);
    }
    return list;
  }, [posts, author, topic, query, urlCity]);

  useEffect(() => {
    const fromUrl = searchParams.get('view');
    if (fromUrl) {
      setViewModeState(parseBlogViewMode(fromUrl));
      return;
    }
    setViewModeState(readStoredBlogViewMode() || 'magazine');
  }, [searchParams]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const sync = () => setIsMdUp(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const effectiveViewMode: BlogViewMode = isMdUp ? viewMode : 'magazine';

  useEffect(() => {
    const page = paginateBlogFeedByCursor(filtered, { cursor: null, limit: PAGE_SIZE });
    setCursor(null);
    setVisiblePosts(page.items);
    setNextCursor(page.nextCursor);
  }, [filtered, effectiveViewMode]);

  const setFilter = useCallback(
    (key: 'city' | 'author', value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.delete('type');
      if (!value || value === 'all') next.delete(key);
      else next.set(key, value);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const resetFilters = useCallback(() => {
    const next = new URLSearchParams();
    if (viewMode === 'list') next.set('view', 'list');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, viewMode]);

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

  const hasActive = urlCity !== 'all' || author !== 'all' || topic !== 'all' || Boolean(query);
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

  const filtersBar = (
    <div className="mb-6 border-b border-slate-200/70 pb-3 md:mb-8 md:pb-4">
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        <SoftSelect
          value={urlCity}
          onChange={(value) => setFilter('city', value)}
          ariaLabel="Фильтр материалов по городу"
        >
          <option value="all">Все города</option>
          {cityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SoftSelect>

        <SoftSelect
          value={author}
          onChange={(value) => setFilter('author', value)}
          ariaLabel="Фильтр по автору"
        >
          <option value="all">Все авторы</option>
          {authorOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SoftSelect>

        {hasActive ? (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex h-10 items-center rounded-xl px-3 text-sm font-medium text-primary-600 transition hover:bg-primary-50 hover:text-primary-700"
          >
            Сбросить
          </button>
        ) : null}
      </div>
    </div>
  );

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
          {effectiveViewMode === 'list' ? (
            <BlogListRows posts={displayPosts} />
          ) : (
            <BlogMagazineGrid posts={displayPosts} editorialQuote={editorialQuote} />
          )}
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
    <div>
      {/*
        Materials filter MUST sit immediately under BlogListHero, before featured/feed.
        City/author row is visible on mobile and desktop (desktop-parity).
      */}
      {filtersBar}

      {hasActive ? (
        <>
          <div className="mb-8">{feedBody}</div>
          {featuredSlot}
        </>
      ) : (
        <>
          {featuredSlot}
          {feedBody}
        </>
      )}
    </div>
  );
}
