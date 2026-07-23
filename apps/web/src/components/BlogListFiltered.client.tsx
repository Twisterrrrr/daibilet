'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LayoutGrid, List, Search } from 'lucide-react';

import { BlogListRows } from '@/components/BlogListRows.client';
import { BlogMagazineGrid } from '@/components/BlogMagazineGrid.client';
import type { BlogListFilters } from '@/components/BlogListView';
import type { BlogCardDto } from '@/lib/blog-utils';
import { authorLabel, cityFilterLabel } from '@/lib/blog-meta';
import {
  BLOG_TOPIC_ORDER,
  blogTopicLabel,
  parseBlogTopicParam,
  postMatchesTopic,
  type BlogTopicId,
} from '@/lib/blog-topics';
import {
  parseBlogViewMode,
  readStoredBlogViewMode,
  storeBlogViewMode,
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
}: {
  posts: BlogCardDto[];
  initialFilters?: BlogListFilters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [viewMode, setViewModeState] = useState<BlogViewMode>('magazine');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [searchDraft, setSearchDraft] = useState(() =>
    String(searchParams.get('q') ?? initialFilters?.q ?? ''),
  );

  const city = paramValue(searchParams.get('city') ?? initialFilters?.city);
  const author = paramValue(searchParams.get('author') ?? initialFilters?.author);
  const topic = parseBlogTopicParam(searchParams.get('topic') ?? initialFilters?.topic);
  const query = String(searchParams.get('q') ?? initialFilters?.q ?? '').trim();

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

  const topicCounts = useMemo(() => {
    const counts = new Map<BlogTopicId, number>();
    for (const post of posts) {
      for (const id of post.topics || []) {
        counts.set(id, (counts.get(id) || 0) + 1);
      }
    }
    return BLOG_TOPIC_ORDER.filter((id) => (counts.get(id) || 0) > 0).map((id) => ({
      id,
      label: blogTopicLabel(id),
      count: counts.get(id) || 0,
    }));
  }, [posts]);

  const filtered = useMemo(() => {
    return posts.filter((post) => {
      if (city !== 'all' && String(post.citySlug || '') !== city) return false;
      const postAuthor = String(post.authorId || 'editorial');
      if (author !== 'all' && postAuthor !== author) return false;
      if (!postMatchesTopic(post.topics, topic)) return false;
      if (!matchesQuery(post, query)) return false;
      return true;
    });
  }, [posts, city, author, topic, query]);

  const visiblePosts = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );
  const hasMore = visibleCount < filtered.length;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [city, author, topic, query, viewMode]);

  useEffect(() => {
    setSearchDraft(query);
  }, [query]);

  useEffect(() => {
    const fromUrl = searchParams.get('view');
    if (fromUrl) {
      setViewModeState(parseBlogViewMode(fromUrl));
      return;
    }
    setViewModeState(readStoredBlogViewMode() || 'magazine');
  }, [searchParams]);

  useEffect(() => {
    const trimmed = searchDraft.trim();
    if (trimmed === query) return;
    const handle = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      next.delete('type');
      if (!trimmed) next.delete('q');
      else next.set('q', trimmed);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 280);
    return () => window.clearTimeout(handle);
  }, [searchDraft, query, pathname, router, searchParams]);

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
    (key: 'city' | 'author' | 'topic', value: string) => {
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
    setSearchDraft('');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, viewMode]);

  const hasActive = city !== 'all' || author !== 'all' || topic !== 'all' || Boolean(query);

  const selectClass =
    'min-w-[10rem] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 sm:max-w-[16rem] sm:flex-none';

  return (
    <div>
      <div className="mb-4">
        <label className="relative block">
          <span className="sr-only">Поиск по блогу</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Поиск по статьям: заголовок, тема, текст"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            aria-label="Поиск по блогу"
          />
        </label>
      </div>

      <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:flex-wrap sm:items-center">
        <select
          className={selectClass}
          value={city}
          onChange={(event) => setFilter('city', event.target.value)}
          aria-label="Фильтр по городу"
        >
          <option value="all">Все города</option>
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

      {topicCounts.length ? (
        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Темы">
          <button
            type="button"
            onClick={() => setFilter('topic', 'all')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              topic === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Все темы
          </button>
          {topicCounts.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter('topic', item.id === topic ? 'all' : item.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                topic === item.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {item.label}
              <span className="ml-1 opacity-70">({item.count})</span>
            </button>
          ))}
        </div>
      ) : null}

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
            <BlogListRows posts={visiblePosts} />
          ) : (
            <BlogMagazineGrid posts={visiblePosts} />
          )}
          {hasMore ? (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-primary/40 hover:bg-primary-50/60 hover:text-primary-800"
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
