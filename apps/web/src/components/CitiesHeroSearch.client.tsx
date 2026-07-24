'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { pluralEvents } from '@/lib/format';
import { cityHref } from '@/lib/routes';

export function CitiesHeroSearch({ destinations }: { destinations: PublicDestinationDto[] }) {
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

  return (
    <div className="relative mt-5 max-w-xl">
      <label className="relative block">
        <span className="sr-only">Поиск города</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 150)}
          placeholder="Найти город"
          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
        />
      </label>
      {showSuggestions ? (
        <ul
          className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
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

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Быстрый переход">
        <a
          href="#cities-all"
          className="rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white"
        >
          Популярные
        </a>
        <a
          href="#cities-all"
          className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
        >
          По алфавиту
        </a>
      </div>
    </div>
  );
}
