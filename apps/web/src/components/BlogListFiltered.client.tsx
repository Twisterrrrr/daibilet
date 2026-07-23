'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LayoutGrid, List } from 'lucide-react';

import { BlogListRows } from '@/components/BlogListRows.client';
import { BlogMagazineGrid } from '@/components/BlogMagazineGrid.client';
import type { BlogListFilters } from '@/components/BlogListView';
import type { BlogCardDto } from '@/lib/blog-utils';
import { authorLabel, cityFilterLabel } from '@/lib/blog-meta';
import {
  parseBlogViewMode,
  readStoredBlogViewMode,
  storeBlogViewMode,
  type BlogViewMode,
} from '@/lib/blog-view-mode';

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

  const city = paramValue(searchParams.get('city') ?? initialFilters?.city);
  const author = paramValue(searchParams.get('author') ?? initialFilters?.author);

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
    return posts.filter((post) => {
      if (city !== 'all' && String(post.citySlug || '') !== city) return false;
      const postAuthor = String(post.authorId || 'editorial');
      if (author !== 'all' && postAuthor !== author) return false;
      return true;
    });
  }, [posts, city, author]);

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
      next.delete('type'); // legacy param, больше не используем
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

  const hasActive = city !== 'all' || author !== 'all';

  const selectClass =
    'min-w-[10rem] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 sm:max-w-[16rem] sm:flex-none';

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:flex-wrap sm:items-center">
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

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Найдено: <span className="font-semibold text-slate-800">{filtered.length}</span>
          {posts.length ? <span> из {posts.length}</span> : null}
        </p>
      </div>

      {filtered.length > 0 ? (
        viewMode === 'list' ? (
          <BlogListRows posts={filtered} />
        ) : (
          <BlogMagazineGrid posts={filtered} />
        )
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 py-16 text-center text-slate-500">
          <p className="text-lg font-semibold text-slate-700">Ничего не нашли</p>
          <p className="mt-1 text-sm">Попробуйте сбросить фильтры или выбрать другие значения</p>
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
