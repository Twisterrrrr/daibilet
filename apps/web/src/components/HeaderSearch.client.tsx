'use client';

import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { buildCatalogHref } from '@/lib/catalog-url';

type SearchItem = {
  type: 'event' | 'city' | 'landing';
  label: string;
  sublabel?: string | null;
  href: string;
  imageUrl?: string | null;
};

type HeaderSearchProps = {
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  initialQuery?: string;
  cityFilter?: string;
  /** inline — поле в потоке (mobile drawer); overlay — кнопка в шапке + модалка по клику */
  variant?: 'inline' | 'overlay';
};

export function HeaderSearch({
  className = '',
  inputClassName = '',
  placeholder = 'Поиск событий, городов, подборок…',
  initialQuery = '',
  cityFilter,
  variant = 'inline',
}: HeaderSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [items, setItems] = useState<SearchItem[]>([]);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (variant !== 'inline') return;
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setResultsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [variant]);

  useEffect(() => {
    if (!overlayOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [overlayOpen]);

  useEffect(() => {
    if (!overlayOpen) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [overlayOpen]);

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) {
      setItems([]);
      setResultsOpen(false);
      setActiveIndex(-1);
      return;
    }

    window.clearTimeout(debounceRef.current ?? undefined);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: normalized });
        if (cityFilter && cityFilter !== 'all') params.set('city', cityFilter);
        const response = await fetch(`/api/public/search?${params.toString()}`);
        if (!response.ok) return;
        const payload = (await response.json()) as { items?: SearchItem[] };
        setItems(payload.items || []);
        setResultsOpen(Boolean(payload.items?.length));
        setActiveIndex(-1);
      } catch {
        setItems([]);
        setResultsOpen(false);
      }
    }, 220);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [cityFilter, query]);

  const closeOverlay = () => {
    setOverlayOpen(false);
    setResultsOpen(false);
    setActiveIndex(-1);
  };

  const navigate = (href: string) => {
    closeOverlay();
    setResultsOpen(false);
    setActiveIndex(-1);
    router.push(href);
  };

  const submit = (value?: string) => {
    const normalized = (value ?? query).trim();
    navigate(
      buildCatalogHref({
        q: normalized || undefined,
        city: cityFilter && cityFilter !== 'all' ? cityFilter : undefined,
        sort: 'popular',
      }),
    );
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (activeIndex >= 0 && items[activeIndex]) navigate(items[activeIndex].href);
      else submit();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!items.length) return;
      setResultsOpen(true);
      setActiveIndex((index) => (index + 1) % items.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!items.length) return;
      setResultsOpen(true);
      setActiveIndex((index) => (index <= 0 ? items.length - 1 : index - 1));
      return;
    }
    if (event.key === 'Escape') {
      if (variant === 'overlay') closeOverlay();
      else {
        setResultsOpen(false);
        setActiveIndex(-1);
      }
    }
  };

  const inputClasses = `w-full bg-white pl-10 pr-3 text-base text-slate-900 outline-none placeholder:text-slate-400 ${inputClassName}`;

  const resultsList =
    resultsOpen && items.length ? (
      <ul
        className={
          variant === 'overlay'
            ? 'max-h-[min(50vh,24rem)] overflow-y-auto py-1'
            : 'absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg'
        }
        role="listbox"
      >
        {items.map((item, index) => (
          <li key={`${item.type}:${item.href}`} role="option" aria-selected={index === activeIndex}>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => navigate(item.href)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                index === activeIndex ? 'bg-primary-50' : 'hover:bg-slate-50'
              }`}
            >
              {item.imageUrl ? (
                <img src={item.imageUrl} alt="" className="h-10 w-10 flex-shrink-0 rounded-lg object-cover" loading="lazy" />
              ) : (
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold uppercase text-slate-500">
                  {item.type === 'city' ? 'Г' : item.type === 'landing' ? 'П' : 'E'}
                </div>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-900">{item.label}</span>
                {item.sublabel ? <span className="block truncate text-xs text-slate-500">{item.sublabel}</span> : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
    ) : null;

  if (variant === 'overlay') {
    return (
      <>
        <button
          type="button"
          onClick={() => setOverlayOpen(true)}
          className={`inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 transition hover:border-slate-300 hover:bg-white hover:text-slate-700 ${className}`}
          aria-label="Открыть поиск"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="hidden min-[1180px]:inline">Поиск</span>
        </button>

        {overlayOpen ? (
          <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[max(1.5rem,env(safe-area-inset-top))] sm:pt-24">
            <button
              type="button"
              aria-label="Закрыть поиск"
              className="absolute inset-0 bg-slate-900/55 backdrop-blur-[2px]"
              onClick={closeOverlay}
            />
            <div
              ref={rootRef}
              className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="Поиск"
            >
              <div className="relative border-b border-slate-100">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={placeholder}
                  className={`${inputClasses} py-4 pr-12 text-lg`}
                  aria-label="Поиск событий"
                  aria-expanded={resultsOpen}
                  aria-autocomplete="list"
                  role="combobox"
                />
                <button
                  type="button"
                  onClick={closeOverlay}
                  aria-label="Закрыть"
                  className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {resultsList}
              {query.trim().length >= 2 && !items.length ? (
                <p className="px-4 py-6 text-center text-sm text-slate-500">Ничего не найдено. Нажмите Enter для поиска в каталоге.</p>
              ) : null}
              {query.trim().length < 2 ? (
                <p className="px-4 py-4 text-sm text-slate-400">Введите минимум 2 символа или нажмите Enter для каталога.</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        ref={inputRef}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => {
          if (items.length) setResultsOpen(true);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`${inputClasses} py-2 text-sm`}
        aria-label="Поиск событий"
        aria-expanded={resultsOpen}
        aria-autocomplete="list"
        role="combobox"
      />
      {resultsList}
    </div>
  );
}
