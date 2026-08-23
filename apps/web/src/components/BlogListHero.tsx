'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';

import { PageBreadcrumbBar, type BreadcrumbItem } from '@/components/PageBreadcrumbs';
import { cityToPrepositional } from '@/lib/city-declension';

type BlogListHeroProps = {
  breadcrumbs: BreadcrumbItem[];
  /**
   * Optional geo copy. Blog index is cross-city by default - do not pass header CityPicker
   * city here; in-page materials filter owns city scoping.
   */
  cityName?: string | null;
};

/** Compact hero: title + search. Cities/topics live in sticky left nav. */
export function BlogListHero({ breadcrumbs, cityName = null }: BlogListHeroProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = String(searchParams.get('q') || '').trim();
  const [searchDraft, setSearchDraft] = useState(query);

  useEffect(() => {
    setSearchDraft(query);
  }, [query]);

  const scrollToFeed = useCallback(() => {
    requestAnimationFrame(() => {
      document.getElementById('blog-feed')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }, []);

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

  const submitSearch = useCallback(
    (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      const trimmed = searchDraft.trim();
      const next = new URLSearchParams(searchParams.toString());
      next.delete('type');
      if (!trimmed) next.delete('q');
      else next.set('q', trimmed);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      scrollToFeed();
    },
    [pathname, router, searchDraft, searchParams, scrollToFeed],
  );

  const title = cityName
    ? `Статьи, обзоры и советы по событиям в ${cityToPrepositional(cityName)}`
    : 'Блог о событиях';

  return (
    <>
      <PageBreadcrumbBar items={breadcrumbs} />
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="container-page py-5 sm:py-7">
          <div className="flex max-w-3xl flex-col gap-4">
            <h1 className="font-display text-[clamp(1.75rem,3.5vw,3.25rem)] font-extrabold tracking-tight text-slate-900">
              {title}
            </h1>
            <form className="relative w-full max-w-xl" onSubmit={submitSearch} role="search">
              <label className="relative block">
                <span className="sr-only">Поиск по статьям</span>
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <input
                  type="search"
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="Найти статью: стендап, маршрут, концерт…"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-200/60"
                  aria-label="Поиск по статьям блога"
                />
              </label>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
