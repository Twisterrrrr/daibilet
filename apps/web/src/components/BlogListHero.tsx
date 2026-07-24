'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';

import { HeroLayout } from '@/components/HeroLayout';
import { HeroMedia } from '@/components/HeroMedia.client';
import type { BreadcrumbItem } from '@/components/PageBreadcrumbs';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import {
  BLOG_TOPIC_ORDER,
  blogTopicLabel,
  parseBlogTopicParam,
  type BlogTopicId,
} from '@/lib/blog-topics';
import { cityToGenitive, cityToPrepositional } from '@/lib/city-declension';
import { pluralGuides } from '@/lib/format';

/** Короткие ярлыки для hero-чипов (владелец: Детям). */
const HERO_TOPIC_LABELS: Partial<Record<BlogTopicId, string>> = {
  kids: 'Детям',
};

const HERO_TOPIC_IDS: BlogTopicId[] = ['standup', 'routes', 'kids', 'concerts'];

const BLOG_HERO_FRAMES = [
  { src: '/images/hero/hero-slavic-02.png', alt: 'Пара туристов на набережной' },
  { src: '/images/hero/hero-slavic-06.png', alt: 'Семья на речной прогулке' },
];

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
    ? `Статьи, обзоры и советы по событиям в ${cityToPrepositional(cityName)}`
    : 'Статьи, обзоры и советы по событиям';

  const description = cityName
    ? `Подборки и гиды для ${cityToGenitive(cityName)}: куда сходить, как выбрать билет и что посмотреть в городе.`
    : 'Как выбирать события, где сидеть, куда идти с детьми и что послушать в этом сезоне.';

  const topicChips = HERO_TOPIC_IDS.filter((id) => BLOG_TOPIC_ORDER.includes(id));

  return (
    <HeroLayout
      variant="imageOverlay"
      breadcrumbs={breadcrumbs}
      eyebrow={guidesCount > 0 ? `Блог · ${pluralGuides(guidesCount)}` : 'Блог Дайбилет'}
      title={title}
      description={description}
      tone="dark"
      media={
        <HeroMedia
          frames={BLOG_HERO_FRAMES}
          overlayClassName="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-900/50"
        />
      }
    >
      <div className="mx-auto mt-6 max-w-4xl text-left">
        <label className="relative block rounded-2xl bg-white p-1.5 shadow-lg">
          <span className="sr-only">Поиск по статьям</span>
          <Search
            className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Найти статью: стендап, маршрут, концерт…"
            className="w-full rounded-xl bg-transparent py-3.5 pl-11 pr-4 text-base text-slate-900 outline-none placeholder:text-slate-400"
            aria-label="Поиск по статьям блога"
          />
        </label>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Быстрые темы">
          {topicChips.map((id) => {
            const active = topic === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTopic(active ? 'all' : id)}
                className={`rounded-full px-3.5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                  active
                    ? 'bg-white text-slate-900'
                    : 'border border-white/25 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20'
                }`}
              >
                {HERO_TOPIC_LABELS[id] || blogTopicLabel(id)}
              </button>
            );
          })}
        </div>
      </div>
    </HeroLayout>
  );
}
