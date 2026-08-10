'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';

import { PageBreadcrumbBar, type BreadcrumbItem } from '@/components/PageBreadcrumbs';
import {
  BLOG_TOPIC_ORDER,
  blogTopicLabel,
  parseBlogTopicParam,
  type BlogTopicId,
} from '@/lib/blog-topics';
import { cityToPrepositional } from '@/lib/city-declension';

/** Короткие ярлыки для hero-чипов (владелец: Детям). */
const HERO_TOPIC_LABELS: Partial<Record<BlogTopicId, string>> = {
  kids: 'Детям',
};

const HERO_TOPIC_IDS: BlogTopicId[] = ['standup', 'routes', 'kids', 'concerts', 'river', 'tours'];

type BlogListHeroProps = {
  breadcrumbs: BreadcrumbItem[];
  /**
   * Optional geo copy. Blog index is cross-city by default - do not pass header CityPicker
   * city here; in-page materials filter owns city scoping.
   */
  cityName?: string | null;
};

export function BlogListHero({ breadcrumbs, cityName = null }: BlogListHeroProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const topic = parseBlogTopicParam(searchParams.get('topic'));
  const query = String(searchParams.get('q') || '').trim();
  const [searchDraft, setSearchDraft] = useState(query);

  useEffect(() => {
    setSearchDraft(query);
  }, [query]);

  const scrollToFeed = useCallback(() => {
    // URL меняется с scroll:false - без явного скролла пользователь остаётся в hero
    // и думает, что чипы/поиск не работают.
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

  const setTopic = useCallback(
    (value: BlogTopicId | 'all') => {
      const next = new URLSearchParams(searchParams.toString());
      next.delete('type');
      if (!value || value === 'all') next.delete('topic');
      else next.set('topic', value);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      scrollToFeed();
    },
    [pathname, router, searchParams, scrollToFeed],
  );

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
    : 'Статьи, обзоры и советы по событиям';

  const topicChips = HERO_TOPIC_IDS.filter((id) => BLOG_TOPIC_ORDER.includes(id));

  const topicPills = (
    <div
      className="flex min-w-0 flex-nowrap gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="group"
      aria-label="Быстрые темы"
    >
      {topicChips.map((id) => {
        const active = topic === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            onClick={() => setTopic(active ? 'all' : id)}
            className={`shrink-0 rounded-[18px] px-3 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
              active
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-[#F5F5F7] text-[#6E6E73] hover:bg-[#EBEBED] hover:text-graphite'
            }`}
          >
            {HERO_TOPIC_LABELS[id] || blogTopicLabel(id)}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      <PageBreadcrumbBar items={breadcrumbs} />
      <section className="border-b border-slate-200 bg-slate-50">
        {/* Explicit px (same as .container-page) so gutter never depends only on @apply. */}
        <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          {/* H1 full width on top; search + topic pills below (one row on md+, stacked on narrow). */}
          <div className="flex flex-col gap-4">
            <h1 className="w-full min-w-0 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              {title}
            </h1>

            <div className="flex w-full min-w-0 flex-col gap-2.5 md:flex-row md:items-center md:gap-3">
              <form className="relative w-full shrink-0 md:w-72 md:max-w-[18rem] lg:w-80" onSubmit={submitSearch} role="search">
                <label className="relative block">
                  <span className="sr-only">Поиск по статьям</span>
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                    placeholder="Найти статью: стендап, маршрут, концерт…"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                    aria-label="Поиск по статьям блога"
                  />
                </label>
              </form>

              <div className="min-w-0 flex-1">{topicPills}</div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
