'use client';

import { Search, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';

import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import type { HeaderSearchItem } from '@/lib/header-search-results';
import { mergeHeaderSearchItems } from '@/lib/header-search-results';
import { buildCatalogHref, type CatalogFilterValues } from '@/lib/catalog-url';
import { venueHref, venuePageTemplate } from '@/lib/routes';
import { mapVenueCatalogFeedPage } from '@/lib/venue-catalog-feed';
import type { PublicVenuesDto } from '@daibilet/contracts/public';

export type SearchAutocompleteContext = 'global' | 'events';

type SearchAutocompleteProps = {
  context: SearchAutocompleteContext;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  initialQuery?: string;
  disabled?: boolean;
  placesOnly?: boolean;
  cityFilter?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  onSubmitQuery?: (value: string) => void;
  catalogFilters?: CatalogFilterValues;
  catalogPath?: string;
  catalogHref?: (filters: CatalogFilterValues) => string;
  variant?: 'inline' | 'overlay';
};

const SEARCH_DEBOUNCE_MS = 250;

function itemTypeLabel(type: HeaderSearchItem['type']): string {
  switch (type) {
    case 'event': return 'Мероприятие';
    case 'city':
    case 'suburb': return 'Город';
    case 'venue': return 'Площадка';
    case 'landing': return 'Подборка';
    case 'article': return 'Статья';
  }
}

export function SearchAutocomplete({
  context,
  className = '',
  inputClassName = '',
  placeholder,
  initialQuery = '',
  disabled = false,
  placesOnly = false,
  cityFilter,
  value,
  onValueChange,
  onSubmitQuery,
  catalogFilters,
  catalogPath,
  catalogHref,
  variant = 'inline',
}: SearchAutocompleteProps) {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const generatedId = useId().replace(/:/g, '');
  const listId = `search-autocomplete-${generatedId}`;
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(initialQuery);
  const query = controlled ? value : internalValue;
  const [items, setItems] = useState<HeaderSearchItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!controlled) setInternalValue(initialQuery);
  }, [controlled, initialQuery]);

  const setQuery = (next: string) => {
    if (!controlled) setInternalValue(next);
    onValueChange?.(next);
  };

  useEffect(() => {
    if (!overlayOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previous;
    };
  }, [overlayOpen]);

  useEffect(() => {
    if (variant === 'overlay' && !overlayOpen) return;
    const closeOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) return;
      setOpen(false);
      setActiveIndex(-1);
    };
    document.addEventListener('mousedown', closeOutside);
    document.addEventListener('touchstart', closeOutside);
    return () => {
      document.removeEventListener('mousedown', closeOutside);
      document.removeEventListener('touchstart', closeOutside);
    };
  }, [overlayOpen, variant]);

  useEffect(() => {
    requestRef.current?.abort();
    const normalized = query.trim();
    if (normalized.length < 2 || (variant === 'overlay' && !overlayOpen)) {
      setItems([]);
      setOpen(false);
      setLoading(false);
      setError(false);
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const params = new URLSearchParams({ q: normalized });
        if (context === 'events') params.set('context', 'events');
        if (cityFilter && cityFilter !== 'all') params.set('city', cityFilter);
        const response = placesOnly
          ? await fetch(`/api/public/venues?${new URLSearchParams({ q: normalized, limit: '8', ...(cityFilter && cityFilter !== 'all' ? { city: cityFilter } : {}) }).toString()}`, { signal: controller.signal })
          : await fetch(`/api/public/search?${params.toString()}`, { signal: controller.signal });
        if (!response.ok) throw new Error('search_unavailable');
        const payload = await response.json() as PublicVenuesDto & { items?: HeaderSearchItem[] };
        if (controller.signal.aborted) return;
        const apiItems = placesOnly
          ? mapVenueCatalogFeedPage(payload).venues.map((venue) => ({
              type: 'venue' as const,
              label: venue.name,
              sublabel: [venuePageTemplate(venue.type) === 'institution' ? 'Площадка' : 'Локация', venue.city].filter(Boolean).join(' · '),
              href: venueHref(venue),
              imageUrl: venue.heroImageUrl || null,
            }))
          : Array.isArray(payload.items) ? payload.items : [];
        const merged = placesOnly ? apiItems : mergeHeaderSearchItems(normalized, apiItems);
        const scoped = context === 'events'
          ? merged.filter((item) => item.type === 'event' || item.type === 'city' || item.type === 'suburb' || item.type === 'venue')
          : merged;
        setItems(scoped);
        setOpen(true);
        setActiveIndex(-1);
      } catch {
        if (controller.signal.aborted) return;
        setItems([]);
        setOpen(true);
        setActiveIndex(-1);
        setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [cityFilter, context, overlayOpen, placesOnly, query, variant]);

  const close = () => {
    setOpen(false);
    setActiveIndex(-1);
    if (variant === 'overlay') setOverlayOpen(false);
  };

  const submit = (raw = query) => {
    const normalized = raw.trim();
    if (onSubmitQuery) {
      onSubmitQuery(normalized);
      close();
      return;
    }
    if (context === 'events') {
      const next = { ...catalogFilters, q: normalized || undefined, page: undefined };
      const href = catalogHref ? catalogHref(next) : buildCatalogHref(next, { pathname: catalogPath || pathname });
      close();
      router.push(href, { scroll: false });
      return;
    }
    const params = new URLSearchParams();
    if (normalized) params.set('q', normalized);
    if (cityFilter && cityFilter !== 'all') params.set('city', cityFilter);
    close();
    router.push(`/search${params.size ? `?${params.toString()}` : ''}`);
  };

  const chooseItem = (item: HeaderSearchItem) => {
    if (context === 'events' && item.type !== 'event') {
      const next: CatalogFilterValues = { ...catalogFilters, q: query.trim() || undefined, page: undefined };
      if ((item.type === 'city' || item.type === 'suburb') && item.href.startsWith('/cities/')) {
        const parsed = new URL(item.href, window.location.origin);
        const city = parsed.searchParams.get('city') || parsed.pathname.split('/').filter(Boolean).at(-1);
        if (city) next.city = city;
      } else if (item.type === 'venue') {
        next.q = item.label;
      }
      const href = catalogHref ? catalogHref(next) : buildCatalogHref(next, { pathname });
      close();
      router.push(href, { scroll: false });
      return;
    }
    close();
    router.push(item.href);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'ArrowDown' && items.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index + 1) % items.length);
    } else if (event.key === 'ArrowUp' && items.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => index <= 0 ? items.length - 1 : index - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (activeIndex >= 0 && items[activeIndex]) chooseItem(items[activeIndex]!);
      else submit();
    }
  };

  const placeholderText = placeholder || (context === 'events' ? 'Событие, артист или площадка' : 'События, места, статьи и города…');
  const input = (
    <input
      ref={inputRef}
      value={query}
      onChange={(event) => setQuery(event.target.value)}
      onFocus={() => { if (items.length || query.trim().length >= 2) setOpen(true); }}
      onKeyDown={onKeyDown}
      placeholder={placeholderText}
      autoComplete="off"
      role="combobox"
      aria-label={context === 'events' ? 'Поиск по афише' : 'Поиск по сайту'}
      aria-autocomplete="list"
      aria-expanded={open}
      aria-controls={open ? listId : undefined}
      aria-activedescendant={activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
      disabled={disabled}
      className={inputClassName || (variant === 'overlay'
        ? 'w-full rounded-lg bg-white py-2.5 pl-10 pr-2 text-lg text-graphite outline-none placeholder:text-graphite-muted sm:pl-11 sm:pr-3'
        : 'w-full rounded-xl bg-white py-2 pl-10 pr-3 text-sm text-graphite outline-none placeholder:text-graphite-muted')}
    />
  );

  const resultPanel = open && (items.length > 0 || loading || error || query.trim().length >= 2) ? (
    <div className={variant === 'overlay' ? 'max-h-[min(55vh,28rem)] overflow-y-auto' : 'absolute left-0 right-0 top-full z-50 mt-1.5 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white py-1 shadow-xl'}>
      {loading ? <p role="status" className="px-4 py-3 text-sm text-graphite-muted">Ищем…</p> : null}
      {!loading && error ? (
        <div className="px-4 py-3">
          <p role="status" className="text-sm text-graphite-muted">Подсказки временно недоступны. Можно выполнить поиск по запросу.</p>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => submit()} className="mt-2 text-sm font-semibold text-primary">Искать «{query.trim()}»</button>
        </div>
      ) : null}
      {!loading && !error && items.length === 0 && query.trim().length >= 2 ? <p className="px-4 py-3 text-sm text-graphite-muted">Ничего не найдено. Нажмите Enter, чтобы искать запрос.</p> : null}
      {!loading && items.length ? (
        <ul id={listId} role="listbox" aria-label="Подсказки поиска" className="py-1">
          {items.map((item, index) => (
            <li key={`${item.type}:${item.href}`}>
              <button type="button" id={`${listId}-option-${index}`} role="option" aria-selected={index === activeIndex} onMouseDown={(event) => event.preventDefault()} onClick={() => chooseItem(item)} className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${index === activeIndex ? 'bg-primary-50' : 'hover:bg-surface-muted'}`}>
                {item.imageUrl ? <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg"><SafeImage src={item.imageUrl} alt="" fill sizes={IMAGE_SIZES.searchThumb} className="object-cover" /></span> : <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-muted text-xs font-semibold text-graphite-muted">{item.type === 'event' ? 'А' : item.type === 'city' || item.type === 'suburb' ? 'Г' : item.type === 'venue' ? 'М' : item.type === 'article' ? 'С' : 'П'}</span>}
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-graphite">{item.label}</span><span className="block truncate text-xs text-graphite-muted">{itemTypeLabel(item.type)}{item.sublabel ? ` · ${item.sublabel}` : ''}</span></span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {context === 'global' && items.length ? <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => submit()} className="w-full border-t border-slate-100 px-4 py-3 text-sm font-medium text-primary hover:bg-surface-muted">Все результаты по запросу «{query.trim()}»</button> : null}
    </div>
  ) : null;

  if (variant === 'overlay') {
    return (
      <>
        <button type="button" onClick={() => setOverlayOpen(true)} className={`inline-flex h-10 w-10 items-center justify-center rounded-lg text-graphite-muted transition hover:bg-surface-muted hover:text-graphite ${className}`} aria-label="Открыть поиск"><Search className="h-5 w-5" strokeWidth={1.75} /></button>
        {overlayOpen ? <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[max(1.5rem,env(safe-area-inset-top))] sm:pt-24"><button type="button" aria-label="Закрыть поиск" className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={close} /><div ref={rootRef} className="relative w-full max-w-2xl overflow-hidden rounded-card bg-white shadow-card-hover" role="dialog" aria-modal="true" aria-label="Поиск"><div className="flex items-center gap-1 border-b border-slate-100 px-3 py-2 sm:px-4 sm:py-2.5"><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-2.5 top-1/2 h-5 w-5 -translate-y-1/2 text-graphite-muted sm:left-3" />{input}</div><button type="button" onClick={close} aria-label="Закрыть" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-graphite-muted hover:bg-surface-muted"><X className="h-5 w-5" /></button></div>{resultPanel}{query.trim().length < 2 ? <p className="px-4 py-3.5 text-sm text-graphite-muted">Введите минимум 2 символа или нажмите Enter для поиска.</p> : null}</div></div> : null}
      </>
    );
  }

  return <div ref={rootRef} className={`relative ${className}`}><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />{input}{resultPanel}</div>;
}
