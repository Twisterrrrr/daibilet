'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import { LuckyCityButton } from '@/components/LuckyCityButton.client';
import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { pluralEvents } from '@/lib/format';
import { cityHref } from '@/lib/routes';

export type CitiesCatalogSort = 'popular' | 'name';

export function parseCitiesCatalogSort(raw: string | null | undefined): CitiesCatalogSort {
  return raw === 'name' ? 'name' : 'popular';
}

export function CitiesHeroSearch({ destinations }: { destinations: PublicDestinationDto[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sort = parseCitiesCatalogSort(searchParams.get('sort'));
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (normalized.length < 1) return [];
    return destinations
      .filter((item) => item.type === 'city')
      .filter((item) => item.name.toLowerCase().includes(normalized))
      .sort((a, b) => b.events - a.events || a.name.localeCompare(b.name, 'ru'))
      .slice(0, 6);
  }, [destinations, query]);

  const showSuggestions = focused && suggestions.length > 0;

  const setSort = (next: CitiesCatalogSort) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'popular') params.delete('sort');
    else params.set('sort', next);
    const qs = params.toString();
    router.replace(qs ? `/cities?${qs}#cities-all` : '/cities#cities-all', { scroll: false });
    window.requestAnimationFrame(() => {
      document.getElementById('cities-all')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div className="relative mt-5 w-full">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">Поиск города</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => window.setTimeout(() => setFocused(false), 150)}
            placeholder="Выберите город - покажем афишу, площадки и подборки..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            aria-autocomplete="list"
            aria-expanded={showSuggestions}
          />
        </label>

        <div
          className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end"
          role="group"
          aria-label="Быстрый переход"
        >
          <LuckyCityButton cities={destinations} variant="hero" className="shrink-0" />
          <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Сортировка списка городов">
            <button
              type="button"
              role="radio"
              aria-checked={sort === 'popular'}
              onClick={() => setSort('popular')}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                sort === 'popular'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              Популярные
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={sort === 'name'}
              onClick={() => setSort('name')}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                sort === 'name'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              По алфавиту
            </button>
          </div>
        </div>
      </div>

      {showSuggestions ? (
        <ul
          className="absolute left-0 right-0 z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg sm:right-auto sm:max-w-xl"
          role="listbox"
        >
          {suggestions.map((city) => (
            <li key={city.slug || city.name} role="option">
              <Link
                href={cityHref(city)}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition hover:bg-slate-50"
              >
                <span className="font-semibold text-slate-900">{city.name}</span>
                <span className="text-xs text-slate-500">{pluralEvents(city.events)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
