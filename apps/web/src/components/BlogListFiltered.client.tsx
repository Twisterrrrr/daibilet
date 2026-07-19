'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { BlogPostCard } from '@/components/BlogPostCard.client';
import type { BlogListFilters } from '@/components/BlogListView';
import type { BlogCardDto } from '@/lib/blog-utils';
import { authorLabel, cityFilterLabel } from '@/lib/blog-meta';

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
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

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
      </div>

      <p className="mb-4 text-sm text-slate-500">
        Найдено: <span className="font-semibold text-slate-800">{filtered.length}</span>
        {posts.length ? <span> из {posts.length}</span> : null}
      </p>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((post) => (
            <BlogPostCard key={post.slug} post={post} />
          ))}
        </div>
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
