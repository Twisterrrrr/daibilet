'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { placesSearchHref } from '@/lib/catalog-url';
import { catalogCityQueryValue } from '@/lib/selected-city';
import { venueHref, venuePageTemplate } from '@/lib/routes';
import { mapVenueCatalogFeedPage } from '@/lib/venue-catalog-feed';
import type { VenueCatalogCard } from '@/lib/venue-map-types';
import { venueTypeLabel } from '@/lib/venue-meta';

type PlacesSearchProps = {
  /** hub: stay on /places?q= ; jump: from /venues|/locations go to /places?q= */
  mode: 'hub' | 'jump';
  initialQuery?: string;
  className?: string;
  tone?: 'muted' | 'outlined';
};

function familyLabel(type: string | null | undefined): 'Площадка' | 'Локация' {
  return venuePageTemplate(type) === 'institution' ? 'Площадка' : 'Локация';
}

function cityParam(selectedCity: ReturnType<typeof useSelectedCityOptional>): string | undefined {
  if (!selectedCity?.cityReady) return undefined;
  const value = selectedCity.cityValue;
  if (!value || value === 'all') return undefined;
  return (
    selectedCity.selectedDestination?.slug ||
    catalogCityQueryValue(selectedCity.destinations || [], value) ||
    value
  );
}

export function PlacesSearch({
  mode,
  initialQuery = '',
  className = '',
  tone = 'muted',
}: PlacesSearchProps) {
  const router = useRouter();
  const selectedCity = useSelectedCityOptional();
  const [query, setQuery] = useState(initialQuery);
  const [items, setItems] = useState<VenueCatalogCard[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const city = cityParam(selectedCity);

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) {
      setItems([]);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    window.clearTimeout(debounceRef.current ?? undefined);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: normalized, limit: '8' });
        if (city) params.set('city', city);
        const response = await fetch(`/api/public/venues?${params.toString()}`);
        if (!response.ok) return;
        const page = mapVenueCatalogFeedPage(await response.json());
        setItems(page.venues);
        setOpen(page.venues.length > 0);
        setActiveIndex(-1);
      } catch {
        setItems([]);
        setOpen(false);
      }
    }, 220);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, city]);

  const goToResults = (value?: string) => {
    const q = (value ?? query).trim();
    setOpen(false);
    setActiveIndex(-1);
    router.push(placesSearchHref({ city: cityParam(selectedCity), q: q || undefined }));
  };

  const goToPlace = (venue: VenueCatalogCard) => {
    setOpen(false);
    setActiveIndex(-1);
    router.push(venueHref(venue));
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (activeIndex >= 0 && items[activeIndex]) goToPlace(items[activeIndex]);
      else goToResults();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!items.length) return;
      setOpen(true);
      setActiveIndex((index) => (index + 1) % items.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!items.length) return;
      setOpen(true);
      setActiveIndex((index) => (index <= 0 ? items.length - 1 : index - 1));
      return;
    }
    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  const wrapClass =
    tone === 'outlined'
      ? 'rounded-xl border border-slate-200 bg-white px-3 shadow-sm'
      : 'rounded-xl bg-[#F5F5F7] px-3';

  return (
    <div ref={rootRef} className={`relative min-w-0 flex-1 ${className}`}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          goToResults();
        }}
        className={`flex min-w-0 items-center gap-2 ${wrapClass}`}
      >
        <Search className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.75} />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            if (items.length) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder="Музей, театр, парк, набережная…"
          aria-label="Поиск мест"
          autoComplete="off"
          className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-400"
        />
        {mode === 'hub' ? (
          <button
            type="submit"
            className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-primary-700 hover:bg-white/70"
          >
            Найти
          </button>
        ) : null}
      </form>

      {open && items.length ? (
        <ul
          className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-80 overflow-y-auto rounded-xl bg-white py-1 shadow-card-hover"
          role="listbox"
        >
          {items.map((item, index) => {
            const family = familyLabel(item.type);
            return (
              <li key={item.id} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => goToPlace(item)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${
                    index === activeIndex ? 'bg-primary-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900">{item.name}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {[item.city, venueTypeLabel(item.type, item.name)].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      family === 'Площадка'
                        ? 'bg-primary-50 text-primary-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {family}
                  </span>
                </button>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => goToResults()}
              className="w-full px-4 py-2.5 text-left text-sm font-medium text-primary-700 hover:bg-slate-50"
            >
              Все результаты
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
