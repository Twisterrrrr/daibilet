import * as React from 'react';
import { ArrowDownAZ, ArrowUpAZ, Building2, CalendarDays, MapPin, Search } from 'lucide-react';

import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { API_BASE_URL } from '@/lib/api-base';
import type { PublicVenue } from '@/types';

type SortMode = 'events' | 'asc' | 'desc';

export function VenuesCatalogPage() {
  const [venues, setVenues] = React.useState<PublicVenue[]>([]);
  const [query, setQuery] = React.useState('');
  const [city, setCity] = React.useState('all');
  const [kind, setKind] = React.useState('all');
  const [sortMode, setSortMode] = React.useState<SortMode>('events');
  const [visible, setVisible] = React.useState(48);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    document.title = 'Площадки России: афиша и билеты | Дайбилет';
    upsertMeta('description', 'Театры, музеи, концертные залы, причалы и другие площадки. Афиша, ближайшие события, цены и билеты.');
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    fetch(`${API_BASE_URL}/api/public/venues`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as { venues?: PublicVenue[] };
      })
      .then((payload) => {
        setVenues(Array.isArray(payload.venues) ? payload.venues : []);
        setError(null);
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : String(requestError));
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const cities = React.useMemo(() => uniqueSorted(venues.map((venue) => venue.city).filter((value) => value !== 'Не указан')), [venues]);
  const kinds = React.useMemo(() => uniqueSorted(venues.map((venue) => venue.type)), [venues]);
  const filtered = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const rows = venues.filter((venue) => {
      if (city !== 'all' && venue.city !== city) return false;
      if (kind !== 'all' && venue.type !== kind) return false;
      if (!normalized) return true;
      return [venue.name, venue.city, venue.address, kindLabel(venue.type)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalized);
    });
    return [...rows].sort((left, right) => {
      if (sortMode === 'events') return right.events - left.events || left.name.localeCompare(right.name, 'ru');
      const comparison = left.name.localeCompare(right.name, 'ru');
      return sortMode === 'asc' ? comparison : -comparison;
    });
  }, [city, kind, query, sortMode, venues]);

  React.useEffect(() => setVisible(48), [city, kind, query, sortMode]);

  const goSection = (section: string) => {
    if (section === 'top') window.location.href = '/';
    else if (section === 'events') window.location.href = '/events';
    else if (section === 'destinations' || section === 'cities') window.location.href = '/cities';
    else if (section === 'orders') window.location.href = '/my-orders';
    else window.location.href = `/#${section}`;
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header cityLabel={city === 'all' ? 'Все города' : city} onSection={goSection} searchCity={city === 'all' ? undefined : city} />
      <main>
        <section className="border-b border-slate-200 bg-slate-50">
          <div className="container-page py-10 sm:py-12">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-950">Площадки</h1>
                <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">
                  Театры, музеи, концертные залы, причалы и места встреч с актуальной афишей.
                </p>
              </div>
              <div className="text-sm text-slate-500">{formatVenues(filtered.length)}</div>
            </div>
          </div>
        </section>

        <section className="sticky top-16 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="container-page grid gap-3 py-4 lg:grid-cols-[minmax(260px,1fr)_220px_220px_auto]">
            <label className="flex h-11 min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-primary-400">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none" placeholder="Название, адрес или город" />
            </label>
            <select value={city} onChange={(event) => setCity(event.target.value)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700">
              <option value="all">Все города</option>
              {cities.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <select value={kind} onChange={(event) => setKind(event.target.value)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700">
              <option value="all">Все типы</option>
              {kinds.map((value) => <option key={value} value={value}>{kindLabel(value)}</option>)}
            </select>
            <div className="inline-flex h-11 rounded-lg border border-slate-200 bg-white p-0.5">
              <SortButton active={sortMode === 'events'} label="По событиям" onClick={() => setSortMode('events')} icon={<CalendarDays className="h-4 w-4" />} />
              <SortButton active={sortMode === 'asc'} label="А-Я" onClick={() => setSortMode('asc')} icon={<ArrowDownAZ className="h-4 w-4" />} />
              <SortButton active={sortMode === 'desc'} label="Я-А" onClick={() => setSortMode('desc')} icon={<ArrowUpAZ className="h-4 w-4" />} />
            </div>
          </div>
        </section>

        <section className="container-page py-8">
          {isLoading ? <div className="py-20 text-center text-slate-500">Загружаем площадки...</div> : null}
          {!isLoading && error ? <div className="py-20 text-center text-rose-600">Не удалось загрузить площадки: {error}</div> : null}
          {!isLoading && !error && !filtered.length ? <div className="py-20 text-center text-slate-500">Площадки не найдены</div> : null}

          {filtered.length ? (
            <div className="grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.slice(0, visible).map((venue) => (
                <a key={venue.id} href={`/venues/${venue.slug || venue.id}`} className="group flex min-h-44 flex-col bg-white p-5 transition-colors hover:bg-primary-50/40">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-primary-100 group-hover:text-primary-700">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-semibold text-primary-700">{formatEvents(venue.events)}</span>
                  </div>
                  <h2 className="mt-4 line-clamp-2 text-lg font-semibold text-slate-950">{venue.name}</h2>
                  <div className="mt-auto pt-4 text-sm text-slate-500">
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0" /><span className="truncate">{venue.city}</span></div>
                    <div className="mt-1.5 truncate text-xs text-slate-400">{venue.address || kindLabel(venue.type)}</div>
                  </div>
                </a>
              ))}
            </div>
          ) : null}

          {visible < filtered.length ? (
            <div className="mt-8 text-center">
              <button type="button" className="btn-secondary" onClick={() => setVisible((value) => value + 48)}>Показать ещё</button>
            </div>
          ) : null}
        </section>
      </main>
      <Footer />
    </div>
  );
}

function SortButton({ active, label, icon, onClick }: { active: boolean; label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className={`inline-flex h-10 w-10 items-center justify-center rounded-md transition-colors ${active ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
      {icon}
    </button>
  );
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right, 'ru'));
}

function kindLabel(value: string): string {
  const labels: Record<string, string> = {
    venue: 'Площадка', museum_art_space: 'Музей и арт-пространство', theater: 'Театр', concert_hall: 'Концертный зал',
    club_bar_restaurant: 'Клуб, бар или ресторан', pier: 'Причал', meeting_point: 'Место встречи',
    outdoor_location: 'Открытая локация', sport_activity_space: 'Спортивная площадка', attraction: 'Достопримечательность', online: 'Онлайн', other: 'Другое',
  };
  return labels[value] || 'Площадка';
}

function formatEvents(value: number): string {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${value} событий`;
  if (mod10 === 1) return `${value} событие`;
  if (mod10 >= 2 && mod10 <= 4) return `${value} события`;
  return `${value} событий`;
}

function formatVenues(value: number): string {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${value} площадок`;
  if (mod10 === 1) return `${value} площадка`;
  if (mod10 >= 2 && mod10 <= 4) return `${value} площадки`;
  return `${value} площадок`;
}

function upsertMeta(name: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.name = name;
    document.head.appendChild(element);
  }
  element.content = content;
}
