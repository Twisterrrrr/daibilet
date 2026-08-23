'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  BLOG_TOPIC_ORDER,
  blogTopicLabel,
  parseBlogTopicParam,
  type BlogTopicId,
} from '@/lib/blog-topics';

const TOPIC_SHORT: Partial<Record<BlogTopicId, string>> = {
  kids: 'Детям',
  river: 'Речные прогулки',
};

type CityOption = { value: string; label: string; count: number };

type BlogListingFiltersNavProps = {
  cityOptions: CityOption[];
  cityValue: string;
  onCityChange: (value: string) => void;
  onReset?: () => void;
  hasActive?: boolean;
};

export function BlogListingFiltersNav({
  cityOptions,
  cityValue,
  onCityChange,
  onReset,
  hasActive = false,
}: BlogListingFiltersNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const topic = parseBlogTopicParam(searchParams.get('topic'));

  const setTopic = useCallback(
    (value: BlogTopicId | 'all') => {
      const next = new URLSearchParams(searchParams.toString());
      next.delete('type');
      if (!value || value === 'all') next.delete('topic');
      else next.set('topic', value);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      requestAnimationFrame(() => {
        document.getElementById('blog-feed')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    },
    [pathname, router, searchParams],
  );

  return (
    <aside aria-label="Фильтры блога" className="blog-layout__nav">
      <div className="blog-sticky-nav space-y-7">
        <div>
          <p className="blog-nav-label">Города</p>
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            <li>
              <button
                type="button"
                onClick={() => onCityChange('all')}
                className={`blog-nav-chip${cityValue === 'all' ? ' is-active' : ''}`}
              >
                Все города
              </button>
            </li>
            {cityOptions.slice(0, 12).map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  onClick={() => onCityChange(option.value)}
                  className={`blog-nav-chip${cityValue === option.value ? ' is-active' : ''}`}
                >
                  <span className="truncate">{option.label}</span>
                  <span className="blog-nav-chip__count">{option.count}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="blog-nav-label">Темы</p>
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            <li>
              <button
                type="button"
                onClick={() => setTopic('all')}
                className={`blog-nav-chip${topic === 'all' ? ' is-active' : ''}`}
              >
                Все темы
              </button>
            </li>
            {BLOG_TOPIC_ORDER.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setTopic(topic === id ? 'all' : id)}
                  className={`blog-nav-chip${topic === id ? ' is-active' : ''}`}
                >
                  {TOPIC_SHORT[id] || blogTopicLabel(id)}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2 border-t border-slate-200/80 pt-5">
          <Link
            href="/events"
            className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            К афише событий
          </Link>
          <Link
            href="/podborki"
            className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Подборки
          </Link>
          {hasActive && onReset ? (
            <button
              type="button"
              onClick={onReset}
              className="w-full text-center text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              Сбросить фильтры
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
