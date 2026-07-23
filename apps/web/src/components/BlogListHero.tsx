'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, Search } from 'lucide-react';

import { PageBreadcrumbBar, type BreadcrumbItem } from '@/components/PageBreadcrumbs';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import {
  BLOG_TOPIC_ORDER,
  blogTopicLabel,
  parseBlogTopicParam,
  type BlogTopicId,
} from '@/lib/blog-topics';
import { cityToGenitive, cityToPrepositional } from '@/lib/city-declension';

/** Короткие ярлыки для hero-чипов (владелец: Детям). */
const HERO_TOPIC_LABELS: Partial<Record<BlogTopicId, string>> = {
  kids: 'Детям',
};

function guidesWord(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'гайдов';
  if (mod10 === 1) return 'гайд';
  if (mod10 >= 2 && mod10 <= 4) return 'гайда';
  return 'гайдов';
}

const HERO_TOPIC_IDS: BlogTopicId[] = ['standup', 'routes', 'kids', 'concerts'];

type BlogListHeroProps = {
  breadcrumbs: BreadcrumbItem[];
  guidesCount?: number;
};

export function BlogListHero({ breadcrumbs, guidesCount = 0 }: BlogListHeroProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedCity = useSelectedCityOptional();

  const cityReady = selectedCity?.cityReady ?? true;
  const cityName =
    cityReady && selectedCity?.cityValue !== 'all'
      ? selectedCity?.selectedDestination?.name ||
        (selectedCity?.cityLabel !== 'Все города' ? selectedCity?.cityLabel : null)
      : null;

  const topic = parseBlogTopicParam(searchParams.get('topic'));
  const query = String(searchParams.get('q') || '').trim();
  const [searchDraft, setSearchDraft] = useState(query);

  useEffect(() => {
    setSearchDraft(query);
  }, [query]);

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
    },
    [pathname, router, searchParams],
  );

  const title = cityName
    ? `Гайды, обзоры и советы по событиям в ${cityToPrepositional(cityName)}`
    : 'Гайды, обзоры и советы по событиям';

  const description = cityName
    ? `Подборки и гиды для ${cityToGenitive(cityName)}: куда сходить, как выбрать билет и что посмотреть в городе.`
    : 'Как выбирать события, где сидеть, куда идти с детьми и что послушать в этом сезоне.';

  const topicChips = HERO_TOPIC_IDS.filter((id) => BLOG_TOPIC_ORDER.includes(id));

  return (
    <>
      <PageBreadcrumbBar items={breadcrumbs} />
      <div className="border-b border-slate-200 bg-white">
        <div className="container-page py-6 sm:py-8">
          <section
            aria-label="Поиск по блогу"
            className="rounded-3xl bg-gradient-to-br from-slate-50 via-primary-50/40 to-slate-50 p-5 ring-1 ring-primary-100/70 sm:p-7 lg:p-8"
          >
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(11rem,0.55fr)] lg:gap-8">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary-700">
                  <BookOpen className="h-3.5 w-3.5" aria-hidden />
                  Блог Дайбилет
                </p>
                <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                  {title}
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
                  {description}
                </p>

                <label className="relative mt-5 block">
                  <span className="sr-only">Поиск по статьям</span>
                  <Search
                    className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                    placeholder="Найти гайд: стендап, маршрут, концерт…"
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                    aria-label="Поиск по статьям блога"
                  />
                </label>

                <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Быстрые темы">
                  {topicChips.map((id) => {
                    const active = topic === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setTopic(active ? 'all' : id)}
                        className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                          active
                            ? 'bg-primary-600 text-white'
                            : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-primary-50 hover:text-primary-800 hover:ring-primary-200'
                        }`}
                      >
                        {HERO_TOPIC_LABELS[id] || blogTopicLabel(id)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {guidesCount > 0 ? (
                <aside className="hidden lg:flex lg:flex-col lg:items-end lg:justify-center lg:self-stretch">
                  <div className="rounded-2xl bg-white/80 px-5 py-4 text-right ring-1 ring-slate-200/80">
                    <p className="font-display text-3xl font-extrabold tabular-nums text-primary-700">
                      {guidesCount}
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-600">
                      {guidesWord(guidesCount)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">в блоге сейчас</p>
                  </div>
                </aside>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
