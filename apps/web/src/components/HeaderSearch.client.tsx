'use client';

import { Search, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { buildCatalogHref, isPlacesSectionPath, placesSearchHref } from '@/lib/catalog-url';
import { venueHref, venuePageTemplate } from '@/lib/routes';
import { mapVenueCatalogFeedPage } from '@/lib/venue-catalog-feed';

type SearchItem = {
  type: 'event' | 'city' | 'landing' | 'venue';
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
  placeholder,
  initialQuery = '',
  cityFilter,
  variant = 'inline',
}: HeaderSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const placesSection = isPlacesSectionPath(pathname);
  const resolvedPlaceholder =
    placeholder ||
    (placesSection ? 'Музей, театр, парк, набережная…' : 'Поиск событий, городов, подборок…');
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
        if (placesSection) {
          const params = new URLSearchParams({ q: normalized, limit: '8' });
          if (cityFilter && cityFilter !== 'all') params.set('city', cityFilter);
          const response = await fetch(`/api/public/venues?${params.toString()}`);
          if (!response.ok) return;
          const page = mapVenueCatalogFeedPage(await response.json());
          const mapped: SearchItem[] = page.venues.map((venue) => {
            const family = venuePageTemplate(venue.type) === 'institution' ? 'Площадка' : 'Локация';
            return {
              type: 'venue',
              label: venue.name,
              sublabel: [family, venue.city].filter(Boolean).join(' · '),
              href: venueHref(venue),
              imageUrl: venue.heroImageUrl || null,
            };
          });
          setItems(mapped);
          setResultsOpen(mapped.length > 0);
          setActiveIndex(-1);
          return;
        }
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
  }, [cityFilter, query, placesSection]);

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
    if (placesSection) {
      navigate(
        placesSearchHref({
          q: normalized || undefined,
          city: cityFilter && cityFilter !== 'all' ? cityFilter : undefined,
        }),
      );
      return;
    }
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

  const inputClasses = `w-full bg-white text-base text-graphite outline-none placeholder:text-graphite-muted ${inputClassName}`;

  const resultsList =
    resultsOpen && items.length ? (
      <ul
        className={
          variant === 'overlay'
            ? 'max-h-[min(50vh,24rem)] overflow-y-auto py-1'
            : 'absolute left-0 right-0 top-full z-50 mt-1.5 max-h-80 overflow-y-auto rounded-card bg-white py-1 shadow-card-hover'
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
                index === activeIndex ? 'bg-primary-50' : 'hover:bg-surface-muted'
              }`}
            >
              {item.imageUrl ? (
                <span className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg">
                  <SafeImage
                    src={item.imageUrl}
                    alt=""
                    fill
                    sizes={IMAGE_SIZES.searchThumb}
                    className="object-cover"
                  />
                </span>
              ) : (
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-surface-muted text-xs font-semibold uppercase text-graphite-muted">
                  {item.type === 'city' ? 'Г' : item.type === 'landing' ? 'П' : item.type === 'venue' ? 'М' : 'E'}
                </div>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-graphite">{item.label}</span>
                {item.sublabel ? <span className="block truncate text-xs text-graphite-muted">{item.sublabel}</span> : null}
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
          className={`inline-flex h-10 w-10 items-center justify-center rounded-lg text-graphite-muted transition hover:bg-surface-muted hover:text-graphite ${className}`}
          aria-label="Открыть поиск"
        >
          <Search className="h-5 w-5 shrink-0" strokeWidth={1.75} />
        </button>

        {overlayOpen ? (
          <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[max(1.5rem,env(safe-area-inset-top))] sm:pt-24">
            <button
              type="button"
              aria-label="Закрыть поиск"
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
              onClick={closeOverlay}
            />
            <div
              ref={rootRef}
              className="relative w-full max-w-2xl overflow-hidden rounded-card bg-white shadow-card-hover"
              role="dialog"
              aria-modal="true"
              aria-label="Поиск"
            >
              <div className="flex items-center gap-1 border-b border-slate-100 px-3 py-2 sm:px-4 sm:py-2.5">
                <div className="relative min-w-0 flex-1">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 h-5 w-5 -translate-y-1/2 text-graphite-muted sm:left-3"
                    strokeWidth={1.75}
                  />
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={resolvedPlaceholder}
                    className={`${inputClasses} rounded-lg py-2.5 pl-10 pr-2 text-lg sm:pl-11 sm:pr-3`}
                    aria-label={placesSection ? 'Поиск мест' : 'Поиск событий'}
                    aria-expanded={resultsOpen}
                    aria-autocomplete="list"
                    role="combobox"
                  />
                </div>
                <button
                  type="button"
                  onClick={closeOverlay}
                  aria-label="Закрыть"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-graphite-muted transition hover:bg-surface-muted hover:text-graphite"
                >
                  <X className="h-5 w-5" strokeWidth={1.75} />
                </button>
              </div>
              {resultsList}
              {query.trim().length >= 2 && !items.length ? (
                <p className="px-4 py-5 text-center text-sm text-graphite-muted sm:px-5">
                  Ничего не найдено. Нажмите Enter для поиска в каталоге.
                </p>
              ) : null}
              {query.trim().length < 2 ? (
                <p className="px-4 py-3.5 text-sm text-graphite-muted sm:px-5 sm:py-4">
                  Введите минимум 2 символа или нажмите Enter для каталога.
                </p>
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
        placeholder={resolvedPlaceholder}
        className={`${inputClasses} py-2 pl-10 pr-3 text-sm`}
        aria-label={placesSection ? 'Поиск мест' : 'Поиск событий'}
        aria-expanded={resultsOpen}
        aria-autocomplete="list"
        role="combobox"
      />
      {resultsList}
    </div>
  );
}
