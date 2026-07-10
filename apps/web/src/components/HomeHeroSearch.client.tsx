'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { FormEvent, useState } from 'react';

import { HERO_QUICK_CHIPS } from '@/lib/home-scenarios';

export function HomeHeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    const trimmed = query.trim();
    if (trimmed) params.set('q', trimmed);
    params.set('sort', 'popular');
    router.push(`/events?${params.toString()}`);
  };

  return (
    <div className="mt-8 max-w-2xl">
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-3 rounded-2xl border border-white/20 bg-white/95 p-3 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:p-2"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Экскурсия, музей, мероприятие..."
            className="inline-btn h-12 w-full rounded-xl border-0 bg-transparent pl-10 pr-4 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button type="submit" className="btn-primary inline-btn h-12 shrink-0 px-6">
          Найти
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {HERO_QUICK_CHIPS.map((chip) => (
          <Link
            key={chip.href}
            href={chip.href}
            className="inline-btn rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
          >
            {chip.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
