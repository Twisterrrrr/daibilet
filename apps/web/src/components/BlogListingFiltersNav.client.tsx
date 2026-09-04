'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';

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
  const [open, setOpen] = useState(false);
  const titleId = useId();

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

  const activeCount =
    (cityValue !== 'all' ? 1 : 0) + (topic !== 'all' ? 1 : 0);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const filtersBody = (
    <div className="blog-sticky-nav space-y-7">
      <div>
        <p className="blog-nav-label">Города</p>
        <ul className="flex flex-wrap gap-2 md:flex-col md:gap-1">
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
        <ul className="flex flex-wrap gap-2 md:flex-col md:gap-1">
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
            onClick={() => {
              onReset();
              close();
            }}
            className="w-full text-center text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Сбросить фильтры
          </button>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        className="blog-mobile-filters-trigger"
        aria-expanded={open}
        aria-controls="blog-filter-sidebar"
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        {activeCount > 0 ? `Фильтры (${activeCount})` : 'Фильтры'}
      </button>

      <div
        className={`blog-filters-overlay${open ? ' is-visible' : ''}`}
        aria-hidden={!open}
        onClick={close}
      />

      <aside
        id="blog-filter-sidebar"
        className={`blog-layout__nav${open ? ' is-open' : ''}`}
        aria-label="Фильтры блога"
        aria-labelledby={titleId}
      >
        <div className="blog-filters-mobile-header md:hidden">
          <h2 id={titleId} className="text-base font-bold text-slate-900">
            Фильтры
          </h2>
          <button
            type="button"
            className="blog-filters-close"
            aria-label="Закрыть фильтры"
            onClick={close}
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
        <div className="blog-filters-scroll md:contents">{filtersBody}</div>
        <div className="blog-filters-mobile-footer md:hidden">
          <button
            type="button"
            onClick={close}
            className="inline-flex w-full items-center justify-center rounded-full bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
          >
            Показать статьи
          </button>
        </div>
      </aside>
    </>
  );
}
