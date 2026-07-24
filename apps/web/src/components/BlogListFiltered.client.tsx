'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LayoutGrid, List } from 'lucide-react';

import { BlogAfishaPromo } from '@/components/BlogAfishaPromo.client';
import { BlogListRows } from '@/components/BlogListRows.client';
import { BlogMagazineGrid } from '@/components/BlogMagazineGrid.client';
import type { BlogListFilters } from '@/components/BlogListView';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import type { BlogSidebarPromoDto } from '@/lib/blog-sidebar-promo';
import type { BlogCardDto } from '@/lib/blog-utils';
import { paginateBlogFeedByCursor } from '@/lib/blog-cursor';
import {
  filterBlogFeedByCity,
  rankBlogFeedByCity,
  resolveBlogRankCitySlug,
} from '@/lib/blog-feed-rank';
import { authorLabel, cityFilterLabel } from '@/lib/blog-meta';
import { parseBlogTopicParam, postMatchesTopic } from '@/lib/blog-topics';
import {
  parseBlogViewMode,
  readStoredBlogViewMode,
  storeBlogViewMode,
  type BlogViewMode,
} from '@/lib/blog-view-mode';

const PAGE_SIZE = 12;
const AFISHA_AFTER_POSTS = 3;

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

function BlogViewModeToggle({
  mode,
  onChange,
}: {
  mode: BlogViewMode;
  onChange: (mode: BlogViewMode) => void;
}) {
  return (
    <div
      className="inline-flex h-10 shrink-0 items-center overflow-hidden rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200/80"
      role="radiogroup"
      aria-label="Вид списка статей"
    >
      <ViewModeButton
        active={mode === 'magazine'}
        label="Сетка"
        onClick={() => onChange('magazine')}
      >
        <LayoutGrid className="h-4 w-4" aria-hidden />
      </ViewModeButton>
      <ViewModeButton active={mode === 'list'} label="Список" onClick={() => onChange('list')}>
        <List className="h-4 w-4" aria-hidden />
      </ViewModeButton>
    </div>
  );
}

function ViewModeButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid h-8 w-8 place-items-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
        active
          ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
          : 'text-slate-500 hover:bg-white/70 hover:text-slate-800'
      }`}
    >
      {children}
    </button>
  );
}

export function BlogListFiltered({
  posts,
  initialFilters,
  afishaPromos = {},
  afishaFallbackCityName,
  afishaFallbackCitySlug,
}: {
  posts: BlogCardDto[];
  initialFilters?: BlogListFilters;
  afishaPromos?: Record<string, BlogSidebarPromoDto>;
  afishaFallbackCityName?: string | null;
  afishaFallbackCitySlug?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedCity = useSelectedCityOptional();
  const [viewMode, setViewModeState] = useState<BlogViewMode>('magazine');
  const [cursor, setCursor] = useState<string | null>(null);
  const [visiblePosts, setVisiblePosts] = useState<BlogCardDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const urlCity = paramValue(searchParams.get('city') ?? initialFilters?.city);
  const author = paramValue(searchParams.get('author') ?? initialFilters?.author);
  const topic = parseBlogTopicParam(searchParams.get('topic') ?? initialFilters?.topic);
  const query = String(searchParams.get('q') ?? initialFilters?.q ?? '').trim();

  const headerRankCity = useMemo(() => {
    if (urlCity !== 'all') return null;
    if (!selectedCity?.cityReady || selectedCity.cityValue === 'all') return null;
    return resolveBlogRankCitySlug(
      selectedCity.cityValue,
      selectedCity.selectedDestination?.slug,
      selectedCity.selectedDestination?.sourceSlug,
      selectedCity.selectedDestination?.name,
    );
  }, [urlCity, selectedCity]);

  const cityOptions = useMemo(
    () =>
      buildOptions(posts, (post) => {
        const value = String(post.citySlug || '').trim();
        if (!value) return null;
        return { value, label: cityFilterLabel(value, post.city) };
      }),
    [posts],
  );

  const authorOptions = useMemo(
    () =>
      buildOptions(posts, (post) => {
        const value = String(post.authorId || 'editorial').trim() || 'editorial';
        return { value, label: post.authorName || authorLabel(value) };
      }),
    [posts],
  );

  const filtered = useMemo(() => {
    let list = posts.filter((post) => {
      const postAuthor = String(post.authorId || 'editorial');
      if (author !== 'all' && postAuthor !== author) return false;
      if (!postMatchesTopic(post.topics, topic)) return false;
      if (!matchesQuery(post, query)) return false;
      return true;
    });
    // Explicit dropdown city = hard filter; header city = rank-then-others.
    if (urlCity !== 'all') {
      list = filterBlogFeedByCity(list, urlCity);
    } else if (headerRankCity) {
      list = rankBlogFeedByCity(list, headerRankCity);
    }
    return list;
  }, [posts, author, topic, query, urlCity, headerRankCity]);

  useEffect(() => {
    const page = paginateBlogFeedByCursor(filtered, { cursor: null, limit: PAGE_SIZE });
    setCursor(null);
    setVisiblePosts(page.items);
    setNextCursor(page.nextCursor);
  }, [filtered, viewMode]);

  useEffect(() => {
    const fromUrl = searchParams.get('view');
    if (fromUrl) {
      setViewModeState(parseBlogViewMode(fromUrl));
      return;
    }
    setViewModeState(readStoredBlogViewMode() || 'magazine');
  }, [searchParams]);

  const setViewMode = useCallback(
    (next: BlogViewMode) => {
      setViewModeState(next);
      storeBlogViewMode(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === 'magazine') params.delete('view');
      else params.set('view', next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

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

  const selectClass =
    'min-w-[10rem] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 sm:max-w-[16rem] sm:flex-none';

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:flex-wrap sm:items-center">
        <select
          className={selectClass}
          value={urlCity}
          onChange={(event) => setFilter('city', event.target.value)}
          aria-label="Фильтр по городу"
        >
          <option value="all">
            {headerRankCity ? `Сначала ${cityFilterLabel(headerRankCity)}` : 'Все города'}
          </option>
          {cityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} ({option.count})
            </option>
          ))}
        </select>

        <select
          className={selectClass}
          value={author}
          onChange={(event) => setFilter('author', event.target.value)}
          aria-label="Фильтр по автору"
        >
          <option value="all">Все авторы</option>
          {authorOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} ({option.count})
            </option>
          ))}
        </select>

        {hasActive ? (
          <button
            type="button"
            onClick={resetFilters}
            className="py-2.5 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Сбросить
          </button>
        ) : null}

        <div className="sm:ml-auto">
          <BlogViewModeToggle mode={viewMode} onChange={setViewMode} />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Найдено: <span className="font-semibold text-slate-800">{filtered.length}</span>
          {posts.length ? <span> из {posts.length}</span> : null}
          {filtered.length > visiblePosts.length ? (
            <span className="text-slate-400">
              {' '}
              (показано {visiblePosts.length})
            </span>
          ) : null}
        </p>
      </div>

      {filtered.length > 0 ? (
        <>
          {viewMode === 'list' ? (
            <BlogListRows
              posts={visiblePosts}
              insertAfter={
                visiblePosts.length >= AFISHA_AFTER_POSTS ? AFISHA_AFTER_POSTS : 0
              }
              insert={
                visiblePosts.length >= AFISHA_AFTER_POSTS ? (
                  <BlogAfishaPromo
                    promos={afishaPromos}
                    fallbackCityName={afishaFallbackCityName}
                    fallbackCitySlug={afishaFallbackCitySlug}
                  />
                ) : undefined
              }
            />
          ) : (
            <BlogMagazineGrid
              posts={visiblePosts}
              afterFirstBlock={
                visiblePosts.length > 0 ? (
                  <BlogAfishaPromo
                    promos={afishaPromos}
                    fallbackCityName={afishaFallbackCityName}
                    fallbackCitySlug={afishaFallbackCitySlug}
                  />
                ) : undefined
              }
            />
          )}
          {hasMore ? (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-primary/40 hover:bg-primary-50/60 hover:text-primary-800"
                data-cursor={cursor || undefined}
              >
                Показать ещё
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 py-16 text-center text-slate-500">
          <p className="text-lg font-semibold text-slate-700">Ничего не нашли</p>
          <p className="mt-1 text-sm">Попробуйте сбросить фильтры или изменить запрос</p>
          {hasActive ? (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 text-sm font-semibold text-primary-600 hover:text-primary-700"
            >
              Сбросить фильтры
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
