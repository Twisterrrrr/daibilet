'use client';

import { ArrowLeft, ArrowRight, LoaderCircle, Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import { SafeImage, IMAGE_SIZES } from '@/components/SafeImage.client';

type SearchType = 'all' | 'events' | 'venues' | 'articles' | 'cities' | 'collections';
type SearchItem = {
  type: 'event' | 'venue' | 'article' | 'city' | 'landing' | 'suburb';
  label: string;
  sublabel?: string | null;
  href: string;
  imageUrl?: string | null;
};
type SearchSection = { items: SearchItem[]; hasMore: boolean };
type SearchPayload = {
  query: string;
  city: string | null;
  type: SearchType;
  page: number;
  pageSize: number;
  sections: Record<string, SearchSection>;
};

const TABS: Array<{ id: SearchType; label: string; section: string }> = [
  { id: 'all', label: 'Все результаты', section: '' },
  { id: 'events', label: 'События', section: 'events' },
  { id: 'venues', label: 'Площадки и места', section: 'venues' },
  { id: 'articles', label: 'Статьи', section: 'articles' },
  { id: 'cities', label: 'Города', section: 'cities' },
  { id: 'collections', label: 'Подборки', section: 'collections' },
];

const SECTION_LABELS: Record<string, string> = {
  cities: 'Города', events: 'События', venues: 'Площадки и места', articles: 'Статьи', collections: 'Подборки',
};

function hrefWith(params: URLSearchParams, patch: Partial<Record<'q' | 'city' | 'type' | 'page', string | null>>) {
  const next = new URLSearchParams(params.toString());
  for (const [key, value] of Object.entries(patch)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  const query = next.toString();
  return query ? `/search?${query}` : '/search';
}

export function GlobalSearchPage() {
  const router = useRouter();
  const params = useSearchParams();
  const q = String(params.get('q') || '').trim();
  const city = String(params.get('city') || '').trim();
  const type = (TABS.some((tab) => tab.id === params.get('type')) ? params.get('type') : 'all') as SearchType;
  const page = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1);
  const [draft, setDraft] = useState(q);
  const [payload, setPayload] = useState<SearchPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setDraft(q), [q]);

  useEffect(() => {
    if (q.length < 2) {
      setPayload(null);
      setLoading(false);
      setError('');
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const search = new URLSearchParams({ q, type, page: String(page) });
    if (city) search.set('city', city);
    fetch(`/api/public/search/results?${search.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Не удалось загрузить результаты поиска.');
        return await response.json() as SearchPayload;
      })
      .then(setPayload)
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : 'Не удалось загрузить результаты поиска.');
        setPayload(null);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [city, page, q, type]);

  const tabCounts = useMemo(() => payload?.sections ?? {}, [payload]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push(hrefWith(params, { q: draft.trim() || null, type: null, page: null }));
  };

  const chooseTab = (nextType: SearchType) => router.push(
    hrefWith(params, { type: nextType === 'all' ? null : nextType, page: null }),
  );

  const changePage = (nextPage: number) => router.push(
    hrefWith(params, { page: nextPage > 1 ? String(nextPage) : null }),
  );

  const renderSection = (key: string, section: SearchSection, compact: boolean) => (
    <section key={key} className="mt-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-graphite">{SECTION_LABELS[key] || key}</h2>
        {compact && section.hasMore ? (
          <button type="button" onClick={() => chooseTab(key as SearchType)} className="text-sm font-medium text-primary hover:underline">
            Все результаты <ArrowRight className="ml-1 inline h-4 w-4" />
          </button>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {section.items.map((item) => (
          <a key={`${item.type}:${item.href}`} href={item.href} className="group flex min-h-[92px] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-slate-300 hover:shadow-sm">
            {item.imageUrl ? (
              <span className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-xl bg-slate-100">
                <SafeImage src={item.imageUrl} alt="" fill sizes={IMAGE_SIZES.searchThumb} className="object-cover transition group-hover:scale-105" />
              </span>
            ) : (
              <span className="grid h-[68px] w-[68px] shrink-0 place-items-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-500">
                {item.type === 'city' || item.type === 'suburb' ? 'Город' : item.type === 'venue' ? 'Место' : item.type === 'article' ? 'Статья' : item.type === 'landing' ? 'Подборка' : 'Событие'}
              </span>
            )}
            <span className="min-w-0">
              <span className="block line-clamp-2 text-sm font-semibold text-graphite group-hover:text-primary">{item.label}</span>
              {item.sublabel ? <span className="mt-1 block line-clamp-2 text-xs text-graphite-muted">{item.sublabel}</span> : null}
            </span>
          </a>
        ))}
      </div>
    </section>
  );

  const activeSection = TABS.find((tab) => tab.id === type)?.section;
  const sections = Object.entries(tabCounts).filter(([key, value]) => value.items.length && (!activeSection || key === activeSection));
  const hasResults = sections.some(([, value]) => value.items.length > 0);
  const hasMore = activeSection ? Boolean(payload?.sections[activeSection]?.hasMore) : false;

  return (
    <div className="min-h-[65vh] bg-slate-50/70">
      <div className="border-b border-slate-200 bg-white">
        <div className="container-page py-7 sm:py-10">
          <p className="text-sm text-graphite-muted">Дайбилет <span className="mx-1">/</span> Поиск</p>
          <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-graphite sm:text-3xl">Поиск по сайту</h1>
          <form role="search" onSubmit={submit} className="mt-5 flex max-w-3xl items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm focus-within:border-slate-400">
            <Search className="ml-2 h-5 w-5 shrink-0 text-slate-400" aria-hidden />
            <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Событие, площадка, статья или город…" className="h-11 min-w-0 flex-1 bg-transparent px-1 text-base text-graphite outline-none placeholder:text-slate-400" aria-label="Поиск по сайту" />
            <button type="submit" className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-700">Найти</button>
          </form>
          {city ? (
            <p className="mt-2 text-xs text-graphite-muted">
              Поиск в городе «{city}».{' '}
              <button type="button" onClick={() => router.push(hrefWith(params, { city: null, page: null }))} className="font-medium text-primary hover:underline">
                Искать по всей России
              </button>
            </p>
          ) : null}
        </div>
      </div>

      <div className="container-page py-5 sm:py-8">
        {q.length >= 2 ? (
          <>
            <div className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-2" role="tablist" aria-label="Тип результатов">
              {TABS.map((tab) => (
                <button key={tab.id} type="button" role="tab" aria-selected={type === tab.id} onClick={() => chooseTab(tab.id)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${type === tab.id ? 'bg-graphite text-white' : 'bg-white text-graphite-muted hover:bg-slate-100'}`}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-5 flex min-h-7 items-center gap-2 text-sm text-graphite-muted" aria-live="polite">
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              <span>{loading ? 'Ищем…' : `Результаты по запросу «${q}»`}</span>
            </div>
            {error ? <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
            {!loading && !error && payload && !hasResults ? (
              <div className="mt-8 rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center">
                <h2 className="font-display text-xl font-semibold text-graphite">Ничего не нашлось</h2>
                <p className="mx-auto mt-2 max-w-lg text-sm text-graphite-muted">Попробуйте другое название, артиста, площадку или город.</p>
              </div>
            ) : null}
            {sections.map(([key, section]) => renderSection(key, section, type === 'all'))}
            {type !== 'all' && hasResults ? (
              <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-4">
                <button type="button" disabled={page <= 1 || loading} onClick={() => changePage(page - 1)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm disabled:opacity-40"><ArrowLeft className="h-4 w-4" />Назад</button>
                <span className="text-sm text-graphite-muted">Страница {page}</span>
                <button type="button" disabled={!hasMore || loading} onClick={() => changePage(page + 1)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm disabled:opacity-40">Дальше<ArrowRight className="h-4 w-4" /></button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="mx-auto max-w-3xl rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
            <Search className="mx-auto h-8 w-8 text-slate-400" />
            <h2 className="mt-4 font-display text-xl font-semibold text-graphite">Найдите нужное на Дайбилете</h2>
            <p className="mt-2 text-sm text-graphite-muted">Ищите события, площадки, места, статьи и города одним запросом.</p>
          </div>
        )}
      </div>
    </div>
  );
}
