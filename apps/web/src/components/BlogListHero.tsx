'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';

import { HeroLayout } from '@/components/HeroLayout';
import {
  BLOG_TOPIC_ORDER,
  blogTopicLabel,
  parseBlogTopicParam,
  type BlogTopicId,
} from '@/lib/blog-topics';
import { cityToGenitive, cityToPrepositional } from '@/lib/city-declension';
import type { BreadcrumbItem } from '@/components/PageBreadcrumbs';

/** Короткие ярлыки для hero-чипов (владелец: Детям). */
const HERO_TOPIC_LABELS: Partial<Record<BlogTopicId, string>> = {
  kids: 'Детям',
};

const HERO_TOPIC_IDS: BlogTopicId[] = ['standup', 'routes', 'kids', 'concerts'];

type BlogListHeroProps = {
  breadcrumbs: BreadcrumbItem[];
  /** Geo copy only when the selected city has published posts (see BlogListingBody). */
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

  const description = cityName
    ? `Подборки и статьи для ${cityToGenitive(cityName)}: куда сходить, как выбрать билет и что посмотреть в городе.`
    : 'Как выбирать события, где сидеть, куда идти с детьми и что послушать в этом сезоне.';

  const topicChips = HERO_TOPIC_IDS.filter((id) => BLOG_TOPIC_ORDER.includes(id));

  return (
    <HeroLayout variant="minimal" breadcrumbs={breadcrumbs} title={title} description={description}>
      <form className="relative mt-5 block max-w-xl" onSubmit={submitSearch} role="search">
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
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            aria-label="Поиск по статьям блога"
          />
        </label>
      </form>

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Быстрые темы">
        {topicChips.map((id) => {
          const active = topic === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => setTopic(active ? 'all' : id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                active
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {HERO_TOPIC_LABELS[id] || blogTopicLabel(id)}
            </button>
          );
        })}
      </div>
    </HeroLayout>
  );
}
